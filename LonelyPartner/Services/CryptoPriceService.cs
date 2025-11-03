using System.Net.Http.Json;

namespace LonelyPartner.Services
{
    public class CryptoPriceService
    {
        private readonly HttpClient _http;

        public CryptoPriceService(HttpClient http)
        {
            _http = http;
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
            catch
            {
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