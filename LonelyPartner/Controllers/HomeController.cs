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
        private readonly SignInManager<ApplicationUser> _signInManager;

        public HomeController(UserDBContext context ,UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }
               
        public async Task<IActionResult> Index(int id)
        {

            ///////////////
            var model = new UserEntity();
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
                        _context.UserEntity.Add(model);
                        await _context.SaveChangesAsync();
                    }
                }
            }
            return View(model);

            /////////////////////////////////////
            /*
            if (id != 0)
            {
                var user = _context.UserEntity.Find(id);
                if (user != null)
                {
                    //For normal user
                    ViewBag.Id = user.Id;
                    //For paid user
                    if (((user.ProductId == 1001) || (user.ProductId == 1002)
                            || (user.ProductId == 1003) || (user.ProductId == 1004) || (user.ProductId == 1005))
                            && (user.EndDate >= DateTime.Now))
                    {
                        ViewBag.paidmember = 1;
                    }

                    //For Admin user
                    if (user.Role == "Admin")
                    {
                        ViewBag.adminId = 99999;
                    }
                    return View(user);
                }
                ViewBag.paidmember = 0;
                ViewBag.adminId = 0;
                return View();

            }
            ViewBag.paidmember = 0;
            ViewBag.adminId = 0;
            return View();

            */
        }


       

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
