using System.Net;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LonelyPartner.Models;
using LonelyPartner.Data;

namespace LonelyPartner.Controllers
{
    [AllowAnonymous]
    public class LoginController : Controller
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly UserDBContext _context;

        public LoginController(SignInManager<ApplicationUser> signInManager,
                               UserManager<ApplicationUser> userManager,
                               UserDBContext context)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _context = context;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public IActionResult GoogleLogin()
        {
            var redirectUrl = Url.Action(nameof(GoogleResponse));
            var properties = _signInManager.ConfigureExternalAuthenticationProperties("Google", redirectUrl);
            return Challenge(properties, "Google");
        }

        [HttpGet]
public async Task<IActionResult> GoogleResponse()
{
    var info = await _signInManager.GetExternalLoginInfoAsync();
    if (info == null)
        return RedirectToAction("Index", "Home");

    var signInResult = await _signInManager.ExternalLoginSignInAsync(info.LoginProvider, info.ProviderKey, false);
    ApplicationUser user;

    if (!signInResult.Succeeded)
    {
        var email = info.Principal.FindFirstValue(ClaimTypes.Email);
        var name = info.Principal.FindFirstValue(ClaimTypes.Name);

        // Check if user exists
        user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new ApplicationUser { UserName = email, Email = email };
            var result = await _userManager.CreateAsync(user);
            if (result.Succeeded)
            {
                await _userManager.AddLoginAsync(user, info);

                // Also sync to your UserEntity table
                var existing = await _context.UserEntity.FirstOrDefaultAsync(u => u.CustomerEmail == email);
                if (existing == null)
                {
                    _context.UserEntity.Add(new UserEntity
                    {
                        CustomerName = name ?? email,
                        CustomerEmail = email,
                        Role = email == "singlesbusiness@gmail.com" ? "Admin" : "User",
                        ProductId = email == "singlesbusiness@gmail.com" ? 1000 : 0,
                        ProductName = email == "singlesbusiness@gmail.com" ? "LongPlan" : "",
                        TotalAmount = 0.0M,
                        StartDate = DateTime.UtcNow,
                        EndDate = email == "singlesbusiness@gmail.com" ? DateTime.UtcNow.AddYears(50) : DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                }
            }
        }
    }
    else
    {
        user = await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
    }

    // ✅ Generate a new unique session ID for this login
    var newSessionId = Guid.NewGuid().ToString("N");
    HttpContext.Session.SetString("SessionId", newSessionId);

            // ✅ Check if the user was already logged in elsewhere
            if (!string.IsNullOrEmpty(user.CurrentSessionId) && user.CurrentSessionId != newSessionId)
            {
                // Invalidate old session
                TempData["ExpiredAlert"] = "You’ve been signed out because your account was used in another browser.";
            }
            
    // ✅ Update it in database
    user.CurrentSessionId = newSessionId;
    await _userManager.UpdateAsync(user);

    // ✅ Sign in again to refresh claims
    await _signInManager.SignInAsync(user, isPersistent: false);

    return RedirectToAction("Index", "Home");
}


        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            HttpContext.Session.Remove("SessionId");
            return RedirectToAction("Index", "Home");
        }
    }
}
