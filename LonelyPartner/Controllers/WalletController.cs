using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LonelyPartner.Services;

namespace LonelyPartner.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] 
    public class WalletController : ControllerBase
    {
        private readonly WalletService _settings;
        private readonly ILogger<WalletController> _logger;

        public WalletController(WalletService settings ,
                                ILogger<WalletController> logger)
        {
            _settings = settings;
            _logger = logger;
            
        }

        [HttpGet("solkey")]
        public async Task<IActionResult> GetSolKey()
        {
            //Console.WriteLine("In get sol address api");
            try
            {
                var key = await _settings.GetSolanaPublicKeyAsync();
                return Ok(new { SolanaPublicKey = key });
            }
            catch (Exception ex)
                {
                    //Console.WriteLine($"❌ GetSolKey() Error: {ex.Message}");
                    _logger.LogError(ex, "Unexpected error in WalletController.solkey");
                    return StatusCode(500, new { message = "Error retrieving Solana key." });
                }
        }

        [HttpPost("solkey/update")]
        public async Task<IActionResult> UpdateSolKey([FromBody] UpdateSolKeyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.NewKey))
                return BadRequest("Invalid key.");

            try
            {
                var updatedBy = User.Identity?.Name ?? "Admin";
                await _settings.UpdateSolanaPublicKeyAsync(request.NewKey, updatedBy);
                //Console.WriteLine("🟢  Updated Solana public key by admin");
                // ✅ show in admin portal at right bottom success message
                _logger.LogInformation("🟢  Updated Solana public key by admin");
                return Ok(new { Message = "Solana key updated successfully." });
            }
            catch (Exception ex)
                {
                    //Console.WriteLine($"❌ GetSolKey() Error: {ex.Message}");
                    _logger.LogError(ex, "Unexpected error in WalletController.solkey/update");
                    return StatusCode(500, new { message = "Error updating Solana key." });
                }
        }

        ///////////For Helius URL
        [HttpGet("heliusurl")]
        public async Task<IActionResult> GetHeliusURL()
        {
            //Console.WriteLine("In get sol address api");
            try
            {
                var key = await _settings.GetHeliusUrlServiceAsync();
                return Ok(new { heliusURL = key });
            }
            catch (Exception ex)
                {
                    //Console.WriteLine($"❌ GetHeliusURL() Error: {ex.Message}");
                    _logger.LogError(ex, "Unexpected error in WalletController.heliusurl");
                    return StatusCode(500, new { message = "Error retrieving Helius URL." });
                }
        }

        [HttpPost("heliusurl/update")]
        public async Task<IActionResult> UpdateHeliusURL([FromBody] UpdateHeliusURLRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.NewKey))
                return BadRequest("Invalid key.");

            try
            {
                var updatedBy = User.Identity?.Name ?? "Admin";
                await _settings.UpdateHeliusUrlServiceAsync(request.NewKey, updatedBy);
                //Console.WriteLine("🟢  Updated Helius URL by admin");
                _logger.LogInformation("🟢  Updated Helius URL by admin");
                // ✅ show in admin portal at right bottom success message
                
                return Ok(new { Message = "Helius URL updated successfully." });
            }
            catch (Exception ex)
                {
                    //Console.WriteLine($"❌ GetHeliusURL() Error: {ex.Message}");
                    _logger.LogError(ex, "Unexpected error in WalletController.heliusurl/update");
                    return StatusCode(500, new { message = "Error updating Heius URL." });
                }
        }

        public class UpdateSolKeyRequest
        {
            public string NewKey { get; set; } = string.Empty;
        }

        //for helius url
        public class UpdateHeliusURLRequest
        {
            public string NewKey { get; set; } = string.Empty;
        }
    }
}
