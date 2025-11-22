
using Microsoft.EntityFrameworkCore;
using LonelyPartner.Data;
using LonelyPartner.Models;

namespace LonelyPartner.Services
{
    public class WalletService
    {
        private readonly UserDBContext _context;
        private readonly ILogger<WalletService> _logger;

        public WalletService(UserDBContext context, ILogger<WalletService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>Get current Solana public key.</summary>
        public async Task<string> GetSolanaPublicKeyAsync()
        {   
            try
            {
                // takes 1st record of my solana pubic key
                var setting = await _context.WalletEntity
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.KeyName == "SolanaPublicKey");

                    //Console.WriteLine("Get sol address done");
                return setting?.ValueText ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve Solana public key from database.");
                return string.Empty;
            }
        }

        /// <summary>Update or create Solana public key (admin only).</summary>
        public async Task<bool> UpdateSolanaPublicKeyAsync(string newKey, string updatedBy)
        {
            try
            {
                    var setting = await _context.WalletEntity
                        .FirstOrDefaultAsync(s => s.KeyName == "SolanaPublicKey");

                    if (setting == null)
                    {
                        setting = new WalletEntity
                        {
                            KeyName = "SolanaPublicKey",
                            ValueText = newKey,
                            UpdatedBy = updatedBy,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.WalletEntity.Add(setting);
                    }
                    else
                    {
                        setting.ValueText = newKey;
                        setting.UpdatedBy = updatedBy;
                        setting.UpdatedAt = DateTime.UtcNow;
                    }

                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Solana public key updated by {User} at {Time}", updatedBy, DateTime.UtcNow);
                return true;
             }
              catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating Solana public key.");
                return false;
            }
        }


        // Get abd update Helius url
         /// <summary>Get current Helius URL.</summary>
        public async Task<string> GetHeliusUrlServiceAsync()
        {   
            try
            {
                // takes 1st record of my solana pubic key
                var setting = await _context.WalletEntity
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.KeyName == "MainnetHeliusRPC");

                    //Console.WriteLine("Get sol address done");
                return setting?.ValueText ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve Helius RPC URL.");
                return string.Empty;
            }
            
        }

        /// <summary>Update or create Solana public key (admin only).</summary>
        public async Task<bool> UpdateHeliusUrlServiceAsync(string newKey, string updatedBy)
        {
            try
            {
                var setting = await _context.WalletEntity
                    .FirstOrDefaultAsync(s => s.KeyName == "MainnetHeliusRPC");

                if (setting == null)
                {
                    setting = new WalletEntity
                    {
                        KeyName = "MainnetHeliusRPC",
                        ValueText = newKey,
                        UpdatedBy = updatedBy,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.WalletEntity.Add(setting);
                }
                else
                {
                    setting.ValueText = newKey;
                    setting.UpdatedBy = updatedBy;
                    setting.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                Console.WriteLine($"Update helius url done by  {updatedBy} at {DateTime.UtcNow}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating Helius RPC URL.");
                return false;
            }
        }
    }
}
