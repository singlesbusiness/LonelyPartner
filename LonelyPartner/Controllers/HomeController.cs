using System.Diagnostics;
using LonelyPartner.Models;
using LonelyPartner.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Metadata.Ecma335;

namespace LonelyPartner.Controllers
{
    public class HomeController : Controller
    {
        

        private readonly UserDBContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager = null!;
        private readonly ILogger<HomeController> _logger;

        public HomeController(UserDBContext context ,
                              UserManager<ApplicationUser> userManager,
                              ILogger<HomeController> logger)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
        }
               
        public async Task<IActionResult> Index(int id)
        {
            
            var model = new UserEntity();

            try
            {

                if(User.Identity?.IsAuthenticated ?? false)
                {
                    var email = User.Identity.Name;

                    //try to get existing record from UserEntity
                    var existingUser = await _context.UserEntity.FirstOrDefaultAsync( u => u.CustomerEmail == email);
                    if (existingUser != null)
                    {
                        model = existingUser;
                    }
                    else
                    {
                        //If not found. map from ASP.NET Identity user
                        var identityUser = await _userManager.GetUserAsync(User);
                        if (identityUser != null)
                        {
                            model = new UserEntity
                            {
                                CustomerName = identityUser.UserName ?? "",
                                CustomerEmail = identityUser.Email ?? "",
                                Role = "user",
                                ProductId = 0,
                                ProductName = "",
                                TotalAmount = 0.0M,
                                StartDate = DateTime.UtcNow,
                                EndDate = DateTime.UtcNow,
                            };
                            try
                                {
                                _context.UserEntity.Add(model);
                                await _context.SaveChangesAsync();
                                }
                                catch (DbUpdateException dbEx)
                                {
                                    _logger.LogError(dbEx, "Failed to create UserEntity record for {Email}", email);
                                }
                        }
                        else
                            {
                                _logger.LogWarning("Identity user could not be loaded for email: {Email}", email);
                            }
                    }
                }
            }
             catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in HomeController.Index");
                // Avoid exposing error details to user
                return RedirectToAction("Error");
            }
            return View(model);

            
        }


       

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { 
                RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier 
                });
        }
    }
}
