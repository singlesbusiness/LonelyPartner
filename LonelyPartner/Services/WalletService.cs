
using Microsoft.EntityFrameworkCore;
using LonelyPartner.Data;
using LonelyPartner.Models;

namespace LonelyPartner.Services
{
    public class WalletService
    {
        private readonly UserDBContext _context;

        public WalletService(UserDBContext context)
        {
            _context = context;
        }

        /// <summary>Get current Solana public key.</summary>
        public async Task<string> GetSolanaPublicKeyAsync()
        {   
            // takes 1st record of my solana pubic key
            var setting = await _context.WalletEntity
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.KeyName == "SolanaPublicKey");

                //Console.WriteLine("Get sol address done");
            return setting?.ValueText ?? string.Empty;
            
        }

        /// <summary>Update or create Solana public key (admin only).</summary>
        public async Task<bool> UpdateSolanaPublicKeyAsync(string newKey, string updatedBy)
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

            Console.WriteLine($"Update solana address done by  {updatedBy} at {DateTime.UtcNow}");
            return true;
        }


        // Get abd update Helius url
         /// <summary>Get current Helius URL.</summary>
        public async Task<string> GetHeliusUrlServiceAsync()
        {   
            // takes 1st record of my solana pubic key
            var setting = await _context.WalletEntity
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.KeyName == "MainnetHeliusRPC");

                //Console.WriteLine("Get sol address done");
            return setting?.ValueText ?? string.Empty;
            
        }

        /// <summary>Update or create Solana public key (admin only).</summary>
        public async Task<bool> UpdateHeliusUrlServiceAsync(string newKey, string updatedBy)
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
    }
}
