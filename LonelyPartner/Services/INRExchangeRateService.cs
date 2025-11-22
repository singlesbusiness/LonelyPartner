using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;

namespace LonelyPartner.Services
{
    public interface IINRExchangeRateService
    {
        Task<decimal> GetUsdToInrAsync();
    }

    public class INRExchangeRateService : IINRExchangeRateService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<INRExchangeRateService> _logger;
        private readonly IConfiguration _config;
        private readonly IMemoryCache _cache;

        // ✅ FIX: CacheKey must be inside the class, but outside methods
        private const string CacheKey = "USD_INR_RATE";

        public INRExchangeRateService(HttpClient httpClient , 
                                       ILogger<INRExchangeRateService> logger, 
                                       IConfiguration config,
                                       IMemoryCache cache )
        {
            _httpClient = httpClient;
            _logger = logger;
            _config = config;
            _cache = cache;
        }

        public async Task<decimal> GetUsdToInrAsync()
        {   
            // Load from appsetting
                    var UsdToInrUrl = _config.GetSection("UsdToInrUrl");
                    var url = UsdToInrUrl["Url"];
                    decimal defaultRate = Convert.ToDecimal(UsdToInrUrl["DefaultINRtoUSD"]);
                    int CacheRefereshinterval = Convert.ToInt32(UsdToInrUrl["CacheRefereshinterval"]);
            try
            {   
                // 🔥 1. RETURN CACHED VALUE IF EXISTS
                if (_cache.TryGetValue(CacheKey, out decimal cachedRate))
                {
                    _logger.LogInformation($"Using cached INR rate: {cachedRate}");
                    return cachedRate;
                }
                
                // 🔥 2. CALL API (if not cached)
                // ✅ Using exchangerate.host (free, no API key)
                //var response = await _httpClient.GetAsync("https://api.exchangerate.host/latest?base=USD&symbols=INR");
                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);

                //var rate = doc.RootElement.GetProperty("rates").GetProperty("INR").GetDecimal();
                // Reading:  data.mid
                    var rate = doc.RootElement
                                .GetProperty("data")
                                .GetProperty("mid")
                                .GetDecimal();

                _logger.LogInformation($"Fetched INR rate from API: {rate}");

                // 🔥 3. STORE IN CACHE (valid for 12 hour)
                _cache.Set(CacheKey, rate, TimeSpan.FromHours(CacheRefereshinterval));

                return rate;
            }
            catch (Exception ex)
            {   
                _logger.LogError(ex, "Failed to load USD → INR exchange rate, in INRExchangeRateService.GetUsdToInrAsync");
                // Fallback if API fails
                //return 87.00m;
                return defaultRate;
            }
        }
    }
}
