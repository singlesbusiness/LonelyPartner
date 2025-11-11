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

        public WalletController(WalletService settings)
        {
            _settings = settings;
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
                    Console.WriteLine($"❌ GetSolKey() Error: {ex.Message}");
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
                Console.WriteLine("🟢  Updated Solana public key by admin");
                // ✅ show in admin portal at right bottom success message
                
                return Ok(new { Message = "Solana key updated successfully." });
            }
            catch (Exception ex)
                {
                    Console.WriteLine($"❌ GetSolKey() Error: {ex.Message}");
                    return StatusCode(500, new { message = "Error updating Solana key." });
                }
        }

        public class UpdateSolKeyRequest
        {
            public string NewKey { get; set; } = string.Empty;
        }
    }
}
