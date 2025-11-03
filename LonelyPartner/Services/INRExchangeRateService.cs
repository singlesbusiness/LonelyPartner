using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace YourAppNamespace.Services
{
    public interface IINRExchangeRateService
    {
        Task<decimal> GetUsdToInrAsync();
    }

    public class INRExchangeRateService : IINRExchangeRateService
    {
        private readonly HttpClient _httpClient;

        public INRExchangeRateService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<decimal> GetUsdToInrAsync()
        {
            try
            {
                // ✅ Using exchangerate.host (free, no API key)
                var response = await _httpClient.GetAsync("https://api.exchangerate.host/latest?base=USD&symbols=INR");
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var rate = doc.RootElement.GetProperty("rates").GetProperty("INR").GetDecimal();

                return rate;
            }
            catch
            {
                // Fallback if API fails
                return 87.00m;
            }
        }
    }
}
