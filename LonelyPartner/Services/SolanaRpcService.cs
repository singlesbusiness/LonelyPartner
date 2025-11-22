using System.Text.Json;
using System.Text;
using System.Net.Http;
using System.Net.Http.Json;

//////////////////////
/////This service calls Solana JSON-RPC getTransaction to verify a transaction.
/////////////////////
namespace LonelyPartner.Services
{
    public class SolanaRpcService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _cfg;
        private readonly string _rpcUrl;
        private readonly ILogger<SolanaRpcService> _logger;

        public SolanaRpcService(HttpClient http, IConfiguration cfg , ILogger<SolanaRpcService> logger)
        {
            _http = http;
            _cfg = cfg;
            _rpcUrl = _cfg["Solana:RpcUrl"]?.TrimEnd('/') ?? "https://api.mainnet-beta.solana.com";
            _logger = logger;
        }

        // get transaction data by signature (commitment "finalized")
        public async Task<JsonElement?> GetTransactionAsync(string signature)
        {
            try
            {
                var payload = new
                {
                    jsonrpc = "2.0",
                    id = 1,
                    method = "getTransaction",
                    @params = new object[] { 
                        signature,
                        new { encoding = "jsonParsed",
                            commitment = "confirmed"
                            //maxSupportedTransactionVersion = 0  
                        } 
                    }
                };

                var response = await _http.PostAsync(_rpcUrl, 
                                                new StringContent(JsonSerializer.Serialize(payload), 
                                                Encoding.UTF8 , 
                                                "application/json") 
                                            );

                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync();  

            // if (!res.IsSuccessStatusCode) return null;
                //var text = await res.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var result = doc.RootElement.GetProperty("result");

                //Clode the result into a new JsonDocument ( so we can return it)

                var clonejson = JsonDocument.Parse(result.GetRawText());
                return clonejson.RootElement.Clone();

                //if (doc.RootElement.TryGetProperty("result", out var result) && result.ValueKind != JsonValueKind.Null)
                //    return result;
                //return null;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Network or RPC error while calling Solana JSON-RPC.");
                return null;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON parsing error in Solana RPC response.");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error inside SolanaRpcService.GetTransactionAsync.");
                return null;
            }
        }
    }
}