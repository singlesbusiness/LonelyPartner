using System.Net;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using LonelyPartner.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using LonelyPartner.Data;

namespace LonelyPartner.Controllers
{
    [AllowAnonymous]
    public class LoginController1 : Controller
    {
        private readonly SignInManager<IdentityUser> _signInManager;
        private readonly UserManager<IdentityUser> _userManager;
        private readonly UserDBContext _context;

        public LoginController1( SignInManager<IdentityUser> signInManager, 
                                UserManager<IdentityUser> userManager,
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
            if (!signInResult.Succeeded)
            {
                var email = info.Principal.FindFirstValue(ClaimTypes.Email);
                var name = info.Principal.FindFirstValue(ClaimTypes.Name);

                // Create new Identity user if not found
                var user = new IdentityUser { UserName = email, Email = email };
                var result = await _userManager.CreateAsync(user);
                if (result.Succeeded)
                {
                    await _userManager.AddLoginAsync(user, info);
                    await _signInManager.SignInAsync(user, false);

                    // Also sync to your UserEntity table
                    var existing = await _context.UserEntity.FirstOrDefaultAsync(u => u.CustomerEmail == email);
                    
                    //admin user
                    if (existing == null && email=="singlesbusiness@gmail.com")
                    {
                        _context.UserEntity.Add(new UserEntity
                        {
                            
                            CustomerName = name ?? email,
                            CustomerEmail = email,
                            Role = "Admin",
                            ProductId = 1000,
                            ProductName = "LongPlan",
                            TotalAmount = 0.0M,
                            StartDate = DateTime.UtcNow,
                            EndDate = DateTime.UtcNow.AddYears(30)
                            
                        });
                        await _context.SaveChangesAsync();
                    }
                    //normal user
                    if (existing == null)
                    {
                        _context.UserEntity.Add(new UserEntity
                        {
                            
                            CustomerName = name ?? email,
                            CustomerEmail = email,
                            Role = "User",
                            ProductId = 0,
                            ProductName = "",
                            TotalAmount = 0.0M,
                            StartDate = DateTime.UtcNow,
                            EndDate = DateTime.UtcNow
                            
                        });
                        await _context.SaveChangesAsync();
                    }
                }
            }

            return RedirectToAction("Index", "Home");
        }

        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return RedirectToAction("Index", "Home");
        }
    

    
     /// //////////////old//////////////////////
     /*
        public string loggedinusername { get; set; }
        
        public string loggedinuseremail { get; set; }
        
        public string loggedinusergivenname { get; set; }

        public int UserId { get; set; }

        [HttpGet]
        public async Task Login()
        {
            await HttpContext.ChallengeAsync(GoogleDefaults.AuthenticationScheme,
                new AuthenticationProperties
                {
                    RedirectUri = Url.Action("GoogleResponse")
                });
        }

        public async Task<IActionResult> GoogleResponse()
        {
            var result = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);



            var claims = result.Principal.Identities.FirstOrDefault().Claims.Select(claim => new
            {
                claim.Issuer,
                claim.OriginalIssuer,
                claim.Type,
                claim.Value
            });

            
            loggedinusername = result.Principal.Identity.Name;
            loggedinuseremail = claims.ElementAt(3).Value;
            loggedinusergivenname = claims.ElementAt(2).Value;
           
            //return Json(claims);



            UserEntity user = new UserEntity();

            user.CustomerName = loggedinusername;
            user.CustomerEmail = loggedinuseremail;
           
            //user.Role = "User";

            return RedirectToAction("GetUser", user);
           
            //return RedirectToAction("GetProfile", "Profile");

            //return RedirectToAction("Index", "Home", new { area = "" });
        }

        //Get User
        public IActionResult GetUser(UserEntity model)
        {
            var user = _context.UserEntity
                .Where(item => item.CustomerEmail == model.CustomerEmail)
                .FirstOrDefault();

            if (user == null)
            {
                return RedirectToAction("CreateUser", model);
            }

            return RedirectToAction("Index", "Home", new { id = user.Id });
        }

        //CreateUser
        public IActionResult CreateUser(UserEntity model)

         {
            /* //Double checking before creating a user
            var user = _context.OrderEntity
                .Where(item => item.CustomerEmail == model.CustomerEmail)
                .FirstOrDefault();
            
            */
            /*
                if (ModelState.IsValid)
                {
                    _context.UserEntity.Add(model);
                    _context.SaveChanges();
                    return RedirectToAction("Index", "Home", new { id = model.Id });
                }
                return View("Index", "Home");
        }

        public IActionResult UpdateUser(UserEntity model)

        {
             //Double checking before creating a user
            var user = _context.UserEntity
                .Where(item => item.CustomerEmail == model.CustomerEmail)
                .FirstOrDefault();           
            

            if (ModelState.IsValid)
            {
                _context.UserEntity.Update(model);
                _context.SaveChanges();
                return RedirectToAction("Index", "Home", new { id = model.Id });
            }
            return View("Index", "Home");
        }

        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync();
            //return View("Index");
            return RedirectToAction("Index", "Home", new { area = "" });
        }
        */
    }
}
