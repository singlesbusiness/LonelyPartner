using System.Net.Http.Json;

namespace LonelyPartner.Services
{
    public class CryptoPriceService
    {
        private readonly HttpClient _http;
        private readonly ILogger<CryptoPriceService> _logger;
        

        public CryptoPriceService(HttpClient http , ILogger<CryptoPriceService> logger)
        {
            _http = http;
            _logger = logger;
        }

        // Fetch SOL → USD rate from CoinGecko
        public async Task<decimal> GetSolToUsdRateAsync()
        {
            try
            {
                var response = await _http.GetFromJsonAsync<CoinGeckoResponse>(
                    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
                return response?.solana?.usd ?? 0;
            }
            catch (HttpRequestException ex)
            {
                // Network errors, API unreachable, DNS issues
                _logger.LogError(ex, "Network error while fetching SOL price from CoinGecko.");
                return 0;
            }
            catch (NotSupportedException ex)
            {
                // Content type not JSON
                _logger.LogError(ex, "Invalid content type returned from CoinGecko API.");
                return 0;
            }
            catch (System.Text.Json.JsonException ex)
            {
                // Invalid JSON response
                _logger.LogError(ex, "JSON parsing error while fetching SOL price.");
                return 0;
            }
            catch (Exception ex)
            {
                // Unexpected errors
                _logger.LogError(ex, "Unexpected error while fetching SOL price.");
                return 0;
            }
        }

        private class CoinGeckoResponse
        {
            public SolanaPrice solana { get; set; }
        }

        private class SolanaPrice
        {
            public decimal usd { get; set; }
        }
    }
}