using System.Security.Claims;
using Serilog;
using Serilog.Events;
using LonelyPartner.Data;
using LonelyPartner.Models;
using LonelyPartner.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MySqlX.XDevAPI;
using Microsoft.Extensions.Hosting;


var builder = WebApplication.CreateBuilder(args);


//vscode
// Load launchSettings.json environment variables automatically
builder.Configuration
    .AddJsonFile("Properties/launchSettings.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

//logging
// Set up Serilog to read from appsettings.json
builder.Host.UseSerilog((context, services, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));
    
//for getting ip
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
    ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});
// Add Razor Pages
builder.Services.AddRazorPages();
builder.Services.AddSignalR();

// Wallet Service
builder.Services.AddScoped<WalletService>();



//✅  MySQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnectionString");

builder.Services.AddDbContext<UserDBContext>(options =>
 options.UseMySQL(connectionString));


// ✅ Add Identity with ApplicationUser
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = false;
})
.AddEntityFrameworkStores<UserDBContext>()   // <-- this is the key line!
.AddDefaultTokenProviders();

// ✅ Add session support (needed for session id tracking)
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(1);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});
/*
builder.Services.AddDefaultIdentity<IdentityUser>(options =>
{
    options.SignIn.RequireConfirmedAccount = false;
})
    //.AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<UserDBContext>()
    .AddDefaultUI();
*/
//✅ Google Login
builder.Services.AddAuthentication()
    .AddGoogle(option =>
    {
        var googleAuth = builder.Configuration.GetSection("Authentication:Google");
        option.ClientId = googleAuth["ClientId"];
        option.ClientSecret = googleAuth["ClientSecret"];
    });

// Add services to the container.
builder.Services.AddControllersWithViews();

//Solona RPC services
builder.Services.AddHttpClient<SolanaRpcService>();
builder.Services.AddScoped<SolanaRpcService>();
builder.Services.AddScoped<LonelyPartner.Services.SolanaRpcService>();

//price of SOL from CoinGecko
builder.Services.AddHttpClient<CryptoPriceService>();

//INR exchange
builder.Services.AddHttpClient<IINRExchangeRateService, INRExchangeRateService>();

//cache INR value
builder.Services.AddMemoryCache();

//Cleanup Orderentity
builder.Services.AddHostedService<OrderCleanupService>();

//Email Service
builder.Services.AddScoped<LonelyPartner.Services.EmailService>();




//for one session of the user
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(1);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

//cookie EU
builder.Services.Configure<CookiePolicyOptions>(options =>
{
    options.CheckConsentNeeded = context => true; // GDPR requirement
    options.MinimumSameSitePolicy = SameSiteMode.Lax;
});


var app = builder.Build();

/*
// Add CSP Header in the HTTP Response
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("Content-Security-Policy", "script-src 'self';");
    await next.Invoke();
});
*/

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
}

app.UseHttpsRedirection();
app.UseStaticFiles(); // This ensures static files are served from wwwroot

//EU Cookie
app.UseCookiePolicy();

//to get ip
app.UseForwardedHeaders();

app.UseRouting();

app.UseSession();

app.UseAuthentication();

// to make user to logout if user login in another browser
app.Use(async (context, next) =>
{
    if (context.User?.Identity?.IsAuthenticated == true)
    {
        var userManager = context.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.GetUserAsync(context.User);
        var currentSessionId = context.Session.GetString("SessionId");
        if (user != null && user.CurrentSessionId != currentSessionId)
        {
            var signInManager = context.RequestServices.GetRequiredService<SignInManager<ApplicationUser>>();
            await signInManager.SignOutAsync();
            context.Session.Clear();
            context.Response.Redirect("/Home/Index?expired=true");
            return;
        }
    }
    await next();
});


app.UseAuthorization();

//app.MapRazorPages();

// Add area route FIRST
app.MapControllerRoute(
    name: "areas",
    pattern: "{area:exists}/{controller=Dashboard}/{action=Index}/{id?}");

// Then your normal site route
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapHub<LonelyPartner.Hubs.ChatHub>("/chathub");

app.Run();
