using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text.Json;
using LonelyPartner.Data;
using LonelyPartner.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LonelyPartner.Hubs
{
    public class ChatHub : Hub
    {
        private readonly UserDBContext _db;

        // Store waiting users: ConnectionId → user details
        //private static readonly ConcurrentDictionary<string, (string Gender, string Continent)> WaitingUsers = new();
        
        // 🔹 Users waiting for a partner
        private static readonly ConcurrentDictionary<string, (string Gender, string Continent, string Country, string City)> WaitingUsers = new();

        // 🔹 Active chat pairs (connectionId -> partnerConnectionId)
        public static ConcurrentDictionary<string, string> ActivePairs = new();
        
        //user preference
        public static ConcurrentDictionary<string, (string Gender, string Continent, string Country, string City)> UserPreferences = new();
        public ChatHub(UserDBContext db)
        {
            _db = db;
        }

        // 🔹 Get current user (from DB if logged in)
        private async Task<UserEntity?> GetCurrentUserAsync()
        {
            var email = Context.User?.FindFirst(ClaimTypes.Email)?.Value;
            if (string.IsNullOrEmpty(email))
                return null;

            return await _db.UserEntity.FirstOrDefaultAsync(u => u.CustomerEmail == email);
        }

        // 🔹 Check for active plan
        private static bool HasActivePlan(UserEntity? user)
        {
            return user != null && user.ProductId > 0 && user.EndDate > DateTime.UtcNow;
        }

        // 🔹 Start searching for a random match
        // ======================================
        // 🔹 Start Searching
        // ======================================
        public async Task StartSearching(string gender, string continent)
        {   
            
            //get location
            var httpContext = Context.GetHttpContext();
            var ip = httpContext?.Connection?.RemoteIpAddress?.ToString();
            //var ip = "77.175.186.52";
            //Console.WriteLine($"ip-1===> {ip}");
            //Handle reverse proxy /IPv6 / localhost cases
            if (string.IsNullOrEmpty(ip) || ip == "::1" || ip == "127.0.0.1")
            {
                //Console.WriteLine($"ip-2===> {ip}");
                ip = httpContext?.Request.Headers["X-Forwarded-For"].FirstOrDefault();
                //Console.WriteLine($"ip-3===> {ip}");
            }
            var (country, city) = await GetLocationFromIp(ip);
            //Console.WriteLine($"🌍 {Context.ConnectionId} from=> {city}, {country}");

            //get admin user, and set Unknown
            var currentUser = await GetCurrentUserAsync();
            if (currentUser != null && currentUser.Role == "Admin")
                {
                    country = "Unknown";
                    city = "Unknown";
                }

            //set default value or user selected values
            gender = string.IsNullOrWhiteSpace(gender) ? "All" : gender;
            continent = string.IsNullOrWhiteSpace(continent) ? "All" : continent;

            Console.WriteLine($"🔍 {Context.ConnectionId} searching → Gender:{gender}, Continent:{continent}");

            //store user preference
            UserPreferences[Context.ConnectionId] = (gender, continent, country, city);
            WaitingUsers[Context.ConnectionId] = (gender, continent, country, city);

            // If already waiting, remove old entry
            //WaitingUsers.TryRemove(Context.ConnectionId, out _);

            // Try find partner for paid users
            var matchId = FindCompatiblePartner(Context.ConnectionId, gender, continent);

            //fallback ( ignore continent and gender) for non paid and non activeplan user
            if (matchId == null && continent != "All")
            {
                matchId = FindCompatiblePartner(Context.ConnectionId, gender, "All");
                if(matchId != null)
                {
                    Console.WriteLine($"🕒 Fallback Match: {Context.ConnectionId}");
                }
                
                //return;
            }

            // no Partner -> wait
            if (matchId == null)
            {
                WaitingUsers[Context.ConnectionId] = (gender, continent, country, city);
                await Clients.Caller.SendAsync("Waiting");
                Console.WriteLine($"🕒 Waiting: {Context.ConnectionId}");
            }

            // ✅ Match found, remove both from waiting list
            if (matchId != null)
            {
                if (WaitingUsers.TryRemove(matchId, out var partnerInfo))
                {
                    //Remove Self if present
                    WaitingUsers.TryRemove(Context.ConnectionId, out _);

                    // Tell the current user: you initiate the offer
                    // await Clients.Client(Context.ConnectionId).SendAsync("Matched", matchId, "Caller");
                    await Clients.Client(Context.ConnectionId).SendAsync("Matched", matchId, "Caller", partnerInfo.Country, partnerInfo.City);

                    //Tell the partner: you wait for the offer
                    //await Clients.Client(matchId).SendAsync("Matched", Context.ConnectionId, "Callee");
                    await Clients.Client(matchId).SendAsync("Matched", Context.ConnectionId, "Callee", country, city);
                    
                    // ✅ NEW: Register active pair
                    ActivePairs[Context.ConnectionId] = matchId;
                    ActivePairs[matchId] = Context.ConnectionId;
                        
                    Console.WriteLine($"💞 MATCHED: {Context.ConnectionId}(Caller) ↔ {matchId}(Callee)");

                }
            }
        }

        // ======================================
        // 🔹 Improved Matching Logic (Mutual Check)
        // ======================================
        private string? FindCompatiblePartner(string currentId, string desiredGender, string desiredContinent)
        {
            foreach (var kvp in WaitingUsers)
            {

                string candidateId = kvp.Key;
                if (candidateId == currentId) continue;

                var candidate = kvp.Value;
                /*
                Console.WriteLine($"candidate====> {candidate}");
                Console.WriteLine($"candidate.Gender====> {candidate.Gender}");
                Console.WriteLine($"candidate.Continent====>{candidate.Continent}");
                Console.WriteLine($"desiredGender.Gender====>{desiredGender}");
                Console.WriteLine($"desiredContinent.Continent====>{ desiredContinent}");
                */
                bool genderMatch =
                    desiredGender == "All" || candidate.Gender == "All" || candidate.Gender == desiredGender;

                bool continentMatch =
                    desiredContinent == "All" || candidate.Continent == "All" || candidate.Continent == desiredContinent;

                //Console.WriteLine($"genderMatch====>{genderMatch}");
                //Console.WriteLine($"continentMatch====>{continentMatch}");
                /*
                // mutual compatibility — both ways
                bool mutualGenderOK =
                    genderOK ||
                    (candidate.Gender == "All" && desiredGender != "All") ||
                    (desiredGender == "All" && candidate.Gender != "All");

                bool mutualContinentOK =
                    continentOK ||
                    (candidate.Continent == "All" && desiredContinent != "All") ||
                    (desiredContinent == "All" && candidate.Continent != "All");
                */
                if (genderMatch && continentMatch)
                {
                    Console.WriteLine($"✅ Compatible: {currentId} ↔ {candidateId}  " +
                                      $"({desiredGender}/{desiredContinent} ↔ {candidate.Gender}/{candidate.Continent})");
                    return candidateId;
                }
            }

            return null;
        }


        // 🔹 Stop searching / disconnect current match
        public async Task Stop()
        {
            var connectionId = Context.ConnectionId;
            try
            {
                Console.WriteLine($"⛔ Stop() called by {connectionId}");

                // Remove from waiting list (if user wasn't matched yet)
                WaitingUsers.TryRemove(connectionId, out _);

                // If the user was in an active pair
                if (ActivePairs.TryRemove(connectionId, out var partnerId))
                {
                    // Also remove the reverse mapping
                    ActivePairs.TryRemove(partnerId, out _);

                    Console.WriteLine($"🔚 Pair ended between {connectionId} and {partnerId}");

                    // Notify the partner that the user left
                    await Clients.Client(partnerId).SendAsync("PartnerLeft");

                    // Requeue partner (if they’re still online)
                    if (UserPreferences.TryGetValue(partnerId, out var prefs))
                    {
                        WaitingUsers[partnerId] = prefs;
                        await Clients.Client(partnerId).SendAsync("Waiting");
                        Console.WriteLine($"🔄 Requeued partner {partnerId}");
                    }
                }

                // Tell the caller that chat has stopped
                await Clients.Caller.SendAsync("ChatStopped");

                Console.WriteLine($"✅ {connectionId} cleanly stopped and left chat.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Stop() Error: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "Stop failed on server.");
            }
        }

    


         

        // 🔹 Next partner
        public async Task Next(string gender, string continent)
        {
            var connectionId = Context.ConnectionId;

            if (!WaitingUsers.TryRemove(connectionId, out _))
                Console.WriteLine($"Next(): {connectionId} not found in waiting list.");
            //notify current partner, if any
            await Clients.Others.SendAsync("PartnerLeft", connectionId);

            await Clients.Caller.SendAsync("ChatStopped");

            Console.WriteLine($"{connectionId} clicked Next-notify partner.");
            try
            {
                //await Stop();
                await Task.Delay(300); //short pause to allow cleanup
                await StartSearching(gender, continent);
            }
            catch (Exception ex)
            {   
                Console.WriteLine($"Next() Error=> {ex.Message}");
                await Clients.Caller.SendAsync("Error", "Failed to find next partner, please try again.");
            }
                        
        }

        //Send text message
        public async Task SendChatMessage(string partnerId, string message)
        {
            if (string.IsNullOrWhiteSpace(message)) return;

            Console.WriteLine($"[CHAT] {Context.ConnectionId} → {partnerId}: {message}");
            await Clients.Client(partnerId).SendAsync("ReceiveChatMessage", Context.ConnectionId, message);
        }

        // 🔹 WebRTC signaling relay
        public async Task SendSignal(string targetId, string type, object data)
        {
            await Clients.Client(targetId).SendAsync("ReceiveSignal", Context.ConnectionId, type, data);
        }

        // 🔹 Handle disconnect
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var connectionId = Context.ConnectionId;
            
            WaitingUsers.TryRemove(connectionId, out _);
            await Clients.All.SendAsync("PartnerLeft", connectionId);
            Console.WriteLine($"❌ Disconnected: {connectionId}");

            await base.OnDisconnectedAsync(exception);
        }

        // 🔹 On connected
        public override Task OnConnectedAsync()
        {
            Console.WriteLine($"✅ Connected: {Context.ConnectionId}");
            return base.OnConnectedAsync();
        }


        //Get user location
        private async Task<(string Country, string City)> GetLocationFromIp(string ip)
        {
            //Console.WriteLine($"ip location=>{ip}");
           /*
            if (string.IsNullOrEmpty(ip))
            {
                return ("Unknown", "Unknown");
            }
           */
            try
            {
                using var http = new HttpClient();
                http.Timeout = TimeSpan.FromSeconds(3);
                //a16664ac16ea19 is the token from ininfo.io
                var json = await http.GetStringAsync($"https://ipinfo.io/{ip}/json?token=a16664ac16ea19");
                //Console.WriteLine(json);
                using var doc = JsonDocument.Parse(json);
                //Console.WriteLine(doc);
                var root = doc.RootElement;
                //Console.WriteLine(root);
                var country = root.TryGetProperty("country", out var c) ? c.GetString() : "Unknown";
                var city = root.TryGetProperty("city", out var ci) ? ci.GetString() : "Unknown";
                //Console.WriteLine($" country=> {country}, city=>{city}");
                return (country ?? "Unknown", city ?? "Unknown");
            }
            catch
            {
                return ("Unknown", "Unknown");
            }
        }
    }
}
