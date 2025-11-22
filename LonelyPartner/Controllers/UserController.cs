using System.Net.Mail;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.VisualBasic;
//using Razorpay.Api;
using LonelyPartner.Data;
using LonelyPartner.Models;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
namespace LonelyPartner.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class UserController : Controller
    {       
        private readonly UserDBContext _context;
       // private readonly RazorpaySettings _razorpaySettings;
       private readonly ILogger<UserController> _logger;

       // public UserController(UserDBContext context, IOptions<RazorpaySettings> razorpaySettings )
        public UserController(UserDBContext context , ILogger<UserController> logger)
        {
            _context = context;
           // _razorpaySettings = razorpaySettings.Value;
           _logger = logger;
           
        }
        

        
        //[BindProperty]
        public UserEntity _UserDetails { get; set; }        
        public IActionResult Index(int id)
        {
            try
            {
                var user = _context.UserEntity.Find(id);
                if (user == null)
                {
                    _UserDetails = user;
                }

                return View();
            }
             catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in UserController.Index");
                // Avoid exposing error details to user
                return RedirectToAction("Error");
            }
        }

        //Get admin User
        [HttpGet("role")]
        public async Task<IActionResult> GetRole()
        {
            try
            {
                var email = User?.Identity?.Name; // from Google login
                if (string.IsNullOrEmpty(email))
                    return Unauthorized();
            
                var user = await _context.UserEntity
                    .AsNoTracking()
                    .Where(u => u.CustomerEmail == email)
                    .Select(u => new { u.CustomerEmail, u.Role })
                    .FirstOrDefaultAsync();

                if (user == null)
                    return NotFound();

                return Ok(new { role = user.Role });
            }
             catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in HomeController.role");
                // Avoid exposing error details to user
                return RedirectToAction("Error");
            }
        }


        //Get User Profile
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile(string email)
        {
            try
            {
                if (string.IsNullOrEmpty(email))
                    return BadRequest("Email missing");
                
                var user = await _context.UserEntity.FirstOrDefaultAsync(u => u.CustomerEmail == email);
                if (user == null)
                    return NotFound("User not found");

                return Ok(new
                {
                    user.CustomerName,
                    user.CustomerEmail,
                    user.ProductName,
                    user.ProductId,
                    user.StartDate,
                    user.EndDate,
                    user.Role
                });
            }
             catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in HomeController.profile");
                // Avoid exposing error details to user
                return RedirectToAction("Error");
            }
        }

    }
}
