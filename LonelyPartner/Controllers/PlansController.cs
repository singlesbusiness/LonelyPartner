using System.Collections.Generic;
using System.Threading.Tasks;
using LonelyPartner.Data;
using LonelyPartner.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LonelyPartner.Services;
using Microsoft.Extensions.Configuration;

namespace LonelyPartner.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlansController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly UserDBContext _db;
        private readonly IINRExchangeRateService _exchangeRateService; //INR rate

        public PlansController(IConfiguration config, UserDBContext db, IINRExchangeRateService exchangeRateService)
        {
            _config = config;
            _db = db;
            _exchangeRateService = exchangeRateService;
        }

        

        [HttpGet]
        public IActionResult GetPlans()
        {
            var plans = _config.GetSection("Plans").Get<List<Plan>>() ?? new();
            //Console.WriteLine("plans=>", plans);
            
            //for upgrade modal real time INR value
            
            return Ok(plans);
        }

        //not used anymore as buy button from solModal goes to SolanaPaymentsController
        [HttpPost("purchase")]
        public async Task<IActionResult> Purchase([FromBody] UserEntity purchase)
        {
            if (string.IsNullOrEmpty(purchase.CustomerEmail))
                return BadRequest("User email missing.");

            var user = await _db.UserEntity
                .FirstOrDefaultAsync(u => u.CustomerEmail == purchase.CustomerEmail);

            if (user == null)
                return NotFound("User not found.");

            user.ProductId = purchase.ProductId;
            user.ProductName = purchase.ProductName;
            user.TotalAmount = purchase.TotalAmount;
            user.StartDate = DateTime.UtcNow;
            user.EndDate = DateTime.UtcNow.AddDays(30); // optional logic

            await _db.SaveChangesAsync();
            return Ok(new { message = "Plan updated successfully" });
        }

        /////USD to INR for upgrade modal display////
        [HttpGet("inrofusd")]
        public async Task<IActionResult> GetINRofUSD(decimal usdAmount)
        {   
            var inrRate =  await _exchangeRateService.GetUsdToInrAsync();
            // Calculate the INR equivalent of the provided USD amount
             var inramount = Math.Round(usdAmount * inrRate , 2);
            //Console.WriteLine("inrAmount=>", inramount);
            
            return Ok(inramount);
        }
    }
}
