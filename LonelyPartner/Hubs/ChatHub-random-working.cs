using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text.Json;
using LonelyPartner.Data;
using LonelyPartner.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LonelyPartner.Hubs
{
    public class ChatHub1 : Hub
    {
        private readonly UserDBContext _db;

        
        // 🔹 Users waiting for a partner
        private static readonly ConcurrentDictionary<string, (string Gender, string DesiredGender, string Continent, string Country, string City, bool IsPaidUser, bool IsAdmin)> WaitingUsers = new();

        // 🔹 Active chat pairs (connectionId -> partnerConnectionId)
        public static ConcurrentDictionary<string, string> ActivePairs = new();
        
        //user preference
        public static ConcurrentDictionary<string, (string Gender, string DesiredGender, string Continent, string Country, string City, bool IsPaidUser, bool IsAdmin)> UserPreferences = new();
        public ChatHub1(UserDBContext db)
        {
            _db = db;
        }

        // 🔹 Get current user (from DB if logged in)
        private async Task<UserEntity?> GetCurrentUserAsync()
        {
            var email = Context.User?.FindFirst(ClaimTypes.Email)?.Value;
            if (string.IsNullOrEmpty(email))
            {
                return null;
            }
                return await _db.UserEntity.FirstOrDefaultAsync(u => u.CustomerEmail == email);
        }

        // 🔹 Check for active plan
        private static bool HasActivePlan(UserEntity? user)
        {
            return user != null && ( user.ProductId > 0 ||  user.Role == "Admin" )&& user.EndDate > DateTime.UtcNow;
        }

        // ===============================
        // 🔹 Shared Match Helper
        // ===============================
        private string? FindCompatiblePartner(
            string currentId,
            string desiredGender,
            string desiredContinent,
            bool strict)
        {
            if (!UserPreferences.TryGetValue(currentId, out var currentUser))
                return null;

            var selfGender = currentUser.Gender;
            var selfContinent = currentUser.Continent;

            foreach (var kvp in WaitingUsers)
            {   
                
                var candidateId = kvp.Key;
                if (candidateId == currentId) continue;

                if (!UserPreferences.TryGetValue(candidateId, out var candidate))
                    continue;

                    // Get candidate details
                    string candidateGender = candidate.Gender;        // candidate’s self gender
                    string candidateContinent = candidate.Continent;  // candidate’s continent
                    bool candidateIsPaid = candidate.IsPaidUser;          // assuming stored in prefs
                    bool candidateIsAdmin = candidate.IsAdmin;        // same
                    // strict = true meaning paid candidate
                //var candidate = kvp.Value;

                



                // =============== PAID USER MATCHING strict=true====================
                if (strict)
                {
                    // 1️⃣ STRICT: Match desired gender + desired continent
                    bool genderMatch = candidateGender.Equals(desiredGender, StringComparison.OrdinalIgnoreCase);
                    bool continentMatch = candidateContinent.Equals(desiredContinent, StringComparison.OrdinalIgnoreCase);

                    if (genderMatch && continentMatch)
                    {
                        Console.WriteLine($"✅ Strict match: {currentId} ↔ {candidateId} ({desiredGender}/{desiredContinent})");
                        return candidateId;
                    }

                    // 2️⃣ RELAXED: Match desired gender (any continent)
                    if (genderMatch)
                    {
                        Console.WriteLine($"🌍 Relaxed match: {currentId} ↔ {candidateId} ({desiredGender}/All continents)");
                        return candidateId;
                    }

                    // 3️⃣ Otherwise skip — paid users won’t match non-desired gender
                    continue;
                }
                // =============== FREE USER MATCHING ====================
                else
                {
                    // ========== FREE USER LOGIC ==========
                    // Free users can match *any* gender / continent.
                    // But they *cannot* override a paid user's preferences.
                    // So we only allow match if the other person’s desiredGender is "All" OR includes the free user's gender.

                    bool candidateWantsAll = candidate.DesiredGender.Equals("All", StringComparison.OrdinalIgnoreCase);
                    bool candidateWantsThisGender = candidate.DesiredGender.Equals(selfGender, StringComparison.OrdinalIgnoreCase);

                    bool matchAllowed =
                        candidateWantsAll ||
                        candidateWantsThisGender ||
                        (candidateIsPaid && desiredGender.Equals(candidate.DesiredGender, StringComparison.OrdinalIgnoreCase));

                    if (matchAllowed)
                    {
                        Console.WriteLine($"🎲 Free/random match: {currentId} ↔ {candidateId}");
                        return candidateId;
                    }
                }
            }
            // 4️⃣ No compatible partner found
            return null;
        }

        // ===============================
        // 🔹 Core: Start Searching Shared
        // ===============================
        private async Task StartSearchInternal(
            string gender,
            string desiredGender,
            string continent,
            bool strict)
        {
            var connectionId = Context.ConnectionId;
            var currentUser = await GetCurrentUserAsync();
            bool isPaidUser = HasActivePlan(currentUser);
            bool isAdmin = currentUser?.Role == "Admin";

            // Location detection
            string country = "Unknown", city = "Unknown";
            if (!isAdmin)
            {
                var httpContext = Context.GetHttpContext();
                string ip = httpContext?.Connection?.RemoteIpAddress?.ToString();
                //Console.WriteLine($"ip=> {ip}");
                if (string.IsNullOrEmpty(ip) || ip == "::1" || ip == "127.0.0.1" || ip.StartsWith("127.")|| ip.StartsWith("::ffff:127."))
                {   //Console.WriteLine(" in 1st if");
                    ip = httpContext?.Request.Headers["X-Forwarded-For"].FirstOrDefault();
                } 

                // Normalize IPv6-mapped IPv4 (e.g., ::ffff:192.168.1.5 → 192.168.1.5)
                if (!string.IsNullOrWhiteSpace(ip) && ip.Contains("::ffff:"))
                {       //Console.WriteLine(" in 2nd if");
                    ip = ip.Replace("::ffff:", "");
                }

                
                (country, city) = await GetLocationFromIp(ip);
            }

            // Store preferences
            UserPreferences[connectionId] = (gender, desiredGender, continent, country, city, isPaidUser, isAdmin);
            WaitingUsers[connectionId] = (gender, desiredGender, continent, country, city, isPaidUser, isAdmin);

            //await Clients.Caller.SendAsync("StatusUpdate", $"Searching for {desiredGender} in {continent}...", "info");

            // Try to find partner
            var matchId = FindCompatiblePartner(connectionId, desiredGender, continent, strict);

            if (matchId != null && WaitingUsers.TryRemove(matchId, out var partnerInfo))
            {
                // Remove self too
                WaitingUsers.TryRemove(connectionId, out _);

                ActivePairs[connectionId] = matchId;
                ActivePairs[matchId] = connectionId;

                // Notify both users
                await Clients.Client(connectionId).SendAsync("Matched", matchId, "Caller", partnerInfo.Country, partnerInfo.City);
                await Clients.Client(matchId).SendAsync("Matched", connectionId, "Callee", country, city);

                await Clients.Client(connectionId).SendAsync("StatusUpdate", "🎉 Partner found!", "success");
                await Clients.Client(matchId).SendAsync("StatusUpdate", "🎉 Partner found!", "success");
            }
            else
            {
                await Clients.Caller.SendAsync("Waiting","start");
                //await Clients.Caller.SendAsync("StatusUpdate", "Waiting for a partner...", "warning");
            }
        }

        // ===============================
        // 🔹 StartSearching for Paid Users (Strict)
        // ===============================
        public async Task StartSearchingStrict(string gender, string desiredGender, string continent)
        {
            await StartSearchInternal(gender, desiredGender, continent, strict: true);
        }

        // ===============================
        // 🔹 StartSearching for Paid Users (Relaxed)
        // ===============================
        public async Task StartSearchingRelaxed(string gender, string desiredGender)
        {
            await StartSearchInternal(gender, desiredGender, "All", strict: true);
        }

        // ===============================
        // 🔹 StartSearching for Free Users
        // ===============================
        public async Task StartSearchingFree(string gender, string continent)
        {
            await StartSearchInternal(gender, "All", continent, strict: false);
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
                        await Clients.Client(partnerId).SendAsync("Waiting", "stop");
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
        public async Task Next()
        {
            var connectionId = Context.ConnectionId;
            
            try
                {
                    Console.WriteLine($"➡️ myself Next() called by {connectionId}");

                    // 1️⃣ Remove from waiting list
                    WaitingUsers.TryRemove(connectionId, out _);

                // 2️⃣ If this user was matched with someone, end that pairing
                if (ActivePairs.TryRemove(connectionId, out var partnerId))
                {
                    ActivePairs.TryRemove(partnerId, out _);

                    Console.WriteLine($"🔄 myself {connectionId} clicked Next — ending pair with {partnerId}");

                    // Notify partner so partner will start search again from js/partnerleft
                    await Clients.Client(partnerId).SendAsync("PartnerLeft");
                }
                        // 3️⃣ Notify caller that chat ended
                    await Clients.Caller.SendAsync("ChatStopped");
                    Console.WriteLine($"✅ myself {connectionId} ended chat, ready to start searching again.");

                        // Requeue myself if they are still online and valid
                        if (UserPreferences.TryGetValue(connectionId, out var prefs))
                        {
                            WaitingUsers[connectionId] = prefs;
                            await Clients.Client(connectionId).SendAsync("Waiting","next");
                            Console.WriteLine($"🔁 myself {connectionId} re-queued.");
                        }
                    

                    
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
            var senderId = Context.ConnectionId;
            
            // ✅ Check if sender and target are in the same active pair
                if (!ActivePairs.TryGetValue(senderId, out var partnerId) || partnerId != targetId)
                {
                    Console.WriteLine($"🚫 Invalid signal: {senderId} attempted to send to {targetId}, not a valid pair.");
                    return;
                }
            await Clients.Client(targetId).SendAsync("ReceiveSignal", senderId, type, data);
        }


        // 🔹 Handle disconnect
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var connectionId = Context.ConnectionId;

            WaitingUsers.TryRemove(connectionId, out _);
            if (ActivePairs.TryRemove(connectionId, out var partnerId))
                {
                    ActivePairs.TryRemove(partnerId, out _);
                    await Clients.Client(partnerId).SendAsync("PartnerLeft");
                    Console.WriteLine($"💔 Disconnected: notified partner {partnerId}");
                }
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
            
            try
            {
                using var http = new HttpClient();
                http.Timeout = TimeSpan.FromSeconds(3);
                //a16664ac16ea19 is the token from ininfo.io
                var json = await http.GetStringAsync($"https://ipinfo.io/{ip}/json?token=a16664ac16ea19");
                //Console.WriteLine("json=>" , json);
                using var doc = JsonDocument.Parse(json);
                //Console.WriteLine("doc=>" ,doc);
                var root = doc.RootElement;
                //Console.WriteLine("root=>" ,root);
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