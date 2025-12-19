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
        private readonly ILogger<ChatHub> _logger;

        
        //FIFO
        private static readonly ConcurrentQueue<string> WaitingQueue = new();
        // 🔹 Users waiting for a partner
        private static readonly ConcurrentDictionary<string, (string Gender, string DesiredGender, string Continent, string Country, string City, bool IsPaidUser, bool IsAdmin)> WaitingUsers = new();

        // 🔹 Active chat pairs (connectionId -> partnerConnectionId)
        public static ConcurrentDictionary<string, string> ActivePairs = new();
        
        //user preference
        public static ConcurrentDictionary<string, (string Gender, string DesiredGender, string Continent, string Country, string City, bool IsPaidUser, bool IsAdmin)> UserPreferences = new();

        // Interests per user
        private static readonly ConcurrentDictionary<string, List<string>> UserInterests = new();
        // 🔒 Only users here are allowed to be matched
        private static readonly ConcurrentDictionary<string, bool> ActivelySearching = new();


        public ChatHub(UserDBContext db , ILogger<ChatHub> logger)
        {
            _db = db;
            _logger = logger;
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
            bool strict
            )
        {
            //commonInterests = new();

            if (!UserPreferences.TryGetValue(currentId, out var currentUser))
                return null;

            //tags
            UserInterests.TryGetValue(currentId, out var myInterests);
            myInterests ??= new();

            var selfGender = currentUser.Gender;
            string selfDesiredGender = currentUser.DesiredGender;
            var selfContinent = currentUser.Continent;
            bool iAmPaid = currentUser.IsPaidUser;
            bool iAmAdmin = currentUser.IsAdmin;


            //iterate users from Queue, to find a match
            foreach (var candidateId in WaitingQueue)
            {   
                
                if (candidateId == currentId) continue;
               
                if (!WaitingUsers.ContainsKey(candidateId)) 
                     continue; // removed by someone else
                
                // 🔒 HARD GUARD , if user click stop button
                if (!ActivelySearching.ContainsKey(candidateId))
                    continue;
                if (!ActivelySearching.ContainsKey(currentId))
                    return null; // caller stopped mid-search

                if (!UserPreferences.TryGetValue(candidateId, out var candidate))
                    continue;
                
                //tags
                UserInterests.TryGetValue(candidateId, out var candidateInterests);
                candidateInterests ??= new();

                var sharedInterests = myInterests
                                         .Intersect(candidateInterests, StringComparer.OrdinalIgnoreCase)
                                         .ToList();

                    // Get candidate details
                    string candidateGender = candidate.Gender;        // candidate’s self gender
                    string otherDesiredGender = candidate.DesiredGender; // candidate’s desired gender, free user will have All
                    string candidateContinent = candidate.Continent;  // candidate’s continent,free user will have All
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

                    //match with gender , continent and tags
                    if (genderMatch && continentMatch  && sharedInterests.Any())
                    {
                        _logger.LogInformation($"✅ Strict match with gender , continent and tags: {currentId} ↔ {candidateId} ({desiredGender}/{desiredContinent})");
                        //commonInterests = sharedInterests;
                        return candidateId;
                    }
                    //match with gender and continent
                    if (genderMatch && continentMatch )
                    {
                        _logger.LogInformation($"✅ Strict match with gender and continent: {currentId} ↔ {candidateId} ({desiredGender}/{desiredContinent})");
                        return candidateId;
                    }

                    // 2️⃣ RELAXED: Match desired gender (any continent) and tags
                    if (genderMatch && sharedInterests.Any())
                    {
                        _logger.LogInformation($"✅ Strict match with gender and tags: {currentId} ↔ {candidateId} ({desiredGender}/All continents)");
                        //commonInterests = sharedInterests;
                        return candidateId;
                    }
                    // 2️⃣ RELAXED: Match desired gender (any continent)
                    if (genderMatch )
                    {
                        _logger.LogInformation($"🌍 Relaxed match with gender only: {currentId} ↔ {candidateId} ({desiredGender}/All continents)");
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
                    
                    // 1️⃣ Prefer interest match
                    if (matchAllowed && sharedInterests.Any())
                    {
                        _logger.LogInformation($"🎲 Free/random match: {currentId} ↔ {candidateId}");
                        //commonInterests = sharedInterests;
                        return candidateId;
                    }

                    // 2️⃣ Fallback random match
                    if (matchAllowed)
                    {
                        _logger.LogInformation($"🎲 Free random match: {currentId} ↔ {candidateId}");
                        return candidateId;
                    }
                }
            }
            // 4️⃣ No compatible partner found
            return null;
        }

        //================================
        //  helper: FIFO stays correct even after removals
        //================================

        private void RebuildQueueWithout(IEnumerable<string> removedIds)
                {   
                    try
                     {
                    var newQ = new ConcurrentQueue<string>();

                    foreach (var id in WaitingQueue)
                        if (!removedIds.Contains(id))
                            newQ.Enqueue(id);

                    WaitingQueue.Clear();
                    foreach (var id in newQ)
                        WaitingQueue.Enqueue(id);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogInformation($"❌ RebuildQueueWithout Error: {ex}");
                    }
                }

        //For Gender icons after users Match
        private static string GetGenderIcon(string gender)
                {
                    if (string.IsNullOrWhiteSpace(gender)) 
                        return ""; // fallback if missing

                    gender = gender.Trim().ToLower();

                    return gender switch
                    {
                        "male"   => "♂️", // blue
                        "female" => "♀️", // pink
                        "couple" => "💑", //couple
                        _        => ""
                    };
                }


        // ===============================
        // 🔹 Core: Start Searching Shared
        // ===============================
        private async Task StartSearchInternal(
            string gender,
            string desiredGender,
            string continent,
            bool strict,
            List<string> interests)
        {
            var connectionId = Context.ConnectionId;
            var currentUser = await GetCurrentUserAsync();
            bool isPaidUser = HasActivePlan(currentUser);
            bool isAdmin = currentUser?.Role == "Admin";

            //user is actively searching
            ActivelySearching[connectionId] = true;

            
            //tag
            // Normalize interests (important!)
            var cleanInterests = interests?
                .Select(i => i.Trim().ToLowerInvariant())
                .Distinct()
                .ToList()
                ?? new List<string>();

            // 🔹 STORE INTERESTS HERE
            UserInterests[connectionId] = cleanInterests;

            // Location detection
            string country = "Unknown", city = "Unknown";
            if (!isAdmin)
            {
                var httpContext = Context.GetHttpContext();
                string ip = null;

                // 1) Cloudflare real IP header
                if (httpContext.Request.Headers.TryGetValue("CF-Connecting-IP", out var cfIp))
                {
                    ip = cfIp.FirstOrDefault();
                }

                // 2) X-Forwarded-For (Nginx)
                if (string.IsNullOrEmpty(ip) &&
                    httpContext.Request.Headers.TryGetValue("X-Forwarded-For", out var xff))
                {
                    ip = xff.FirstOrDefault()?.Split(',')[0].Trim();
                }

                // 3) Fallback to RemoteIpAddress
                if (string.IsNullOrEmpty(ip))
                {
                    ip = httpContext.Connection.RemoteIpAddress?.ToString();
                }

                // Normalize IPv6-mapped IPv4
                if (!string.IsNullOrWhiteSpace(ip) && ip.Contains("::ffff:"))
                {
                    ip = ip.Replace("::ffff:", "");
                }
        
                
                (country, city) = await GetLocationFromIp(ip);
            }

            // Store preferences
            UserPreferences[connectionId] = (gender, desiredGender, continent, country, city, isPaidUser, isAdmin);
            WaitingUsers[connectionId] = (gender, desiredGender, continent, country, city, isPaidUser, isAdmin);
            WaitingQueue.Enqueue(connectionId);
            //await Clients.Caller.SendAsync("StatusUpdate", $"Searching for {desiredGender} in {continent}...", "info");

            // Try to find partner
            var matchId = FindCompatiblePartner(connectionId, desiredGender, continent, strict );
            

            if (matchId != null && WaitingUsers.TryRemove(matchId, out var partnerInfo))
            {
                // Remove self too
                WaitingUsers.TryRemove(connectionId, out _);
                //WaitingUsers.TryRemove(matchId, out _);

                RebuildQueueWithout(new [] { matchId, connectionId });

                ActivePairs[connectionId] = matchId;
                ActivePairs[matchId] = connectionId;

                //tags
                UserInterests.TryGetValue(connectionId, out var myInterests);
                UserInterests.TryGetValue(matchId, out var partnerInterests);

                var commonInterests = myInterests?
                    .Intersect(partnerInterests ?? Enumerable.Empty<string>())
                    .ToList()
                    ?? new List<string>();
                // get icons

                //_logger.LogInformation($"PartnerInfo Gender = {partnerInfo.Gender}");
                //_logger.LogInformation($"My Gender = {gender}");

                var partnerGenderIcon = GetGenderIcon(partnerInfo.Gender);
                var userGenderIcon = GetGenderIcon(gender); // assumes "gender" belongs to connectionId

               // _logger.LogInformation($"PartnerInfo Gender = {partnerGenderIcon}");
                //_logger.LogInformation($"My Gender = {userGenderIcon}");

                // Notify both users
                await Clients.Client(connectionId).SendAsync("Matched", matchId, "Caller", partnerInfo.Country, partnerInfo.City, partnerGenderIcon, partnerInfo.IsPaidUser , commonInterests);
                await Clients.Client(matchId).SendAsync("Matched", connectionId, "Callee", country, city, userGenderIcon, isPaidUser , commonInterests);

                await Clients.Client(connectionId).SendAsync("StatusUpdate", $"🎉 Partner found! ", "success");
                await Clients.Client(matchId).SendAsync("StatusUpdate", $"🎉 Partner found! ", "success");
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
        public async Task StartSearchingStrict(string gender, string desiredGender, string continent, List<string> interests)
        {
            await StartSearchInternal(gender, desiredGender, continent, strict: true, interests);
        }

        // ===============================
        // 🔹 StartSearching for Paid Users (Relaxed)
        // ===============================
        public async Task StartSearchingRelaxed(string gender, string desiredGender, List<string> interests)
        {
            await StartSearchInternal(gender, desiredGender, "All", strict: true , interests);
        }

        // ===============================
        // 🔹 StartSearching for Free Users
        // ===============================
        public async Task StartSearchingFree(string gender, string continent, List<string> interests)
        {
            await StartSearchInternal(gender, "All", continent, strict: false, interests);
        }



        // 🔹 Stop searching / disconnect current match
        public async Task Stop()
        {
            var connectionId = Context.ConnectionId;
            try
            {
                _logger.LogInformation("⛔ Stop() called by {ConnId}", connectionId);

                // Remove from waiting list (if user wasn't matched yet)
                WaitingUsers.TryRemove(connectionId, out _);
                //remove tags
                UserInterests.TryRemove(connectionId, out _);
                // 🔒 HARD STOP — prevents future matches
                ActivelySearching.TryRemove(connectionId, out _);

                // 2️⃣ Remove from FIFO queue
                RemoveFromQueue(connectionId);

                // If the user was in an active pair
                if (ActivePairs.TryRemove(connectionId, out var partnerId))
                {
                    // Also remove the reverse mapping
                    ActivePairs.TryRemove(partnerId, out _);

                    _logger.LogInformation($"🔚 Pair ended between {connectionId} and {partnerId}");

                    // Notify the partner that the user left
                    await Clients.Client(partnerId).SendAsync("PartnerLeft");

                    // Requeue partner (if they’re still online)
                    if (UserPreferences.TryGetValue(partnerId, out var prefs))
                    {
                        WaitingUsers[partnerId] = prefs;
                        WaitingQueue.Enqueue(partnerId);

                        await Clients.Client(partnerId).SendAsync("Waiting", "stop");
                        _logger.LogInformation($"🔄 Requeued partner {partnerId}");
                    }
                }

                // Tell the caller that chat has stopped
                await Clients.Caller.SendAsync("ChatStopped");

                _logger.LogInformation($"✅ {connectionId} cleanly stopped and left chat.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Stop() failed for {ConnectionId}=", connectionId);
                await Clients.Caller.SendAsync("Error", "Stop failed on server.");
            }
        }

    

        // 🔹 Next partner
        public async Task Next()
        {
            var connectionId = Context.ConnectionId;
            
            try
                {
                    _logger.LogInformation($"➡️ myself Next() called by {connectionId}");

                    // 1️⃣ Remove from waiting list
                    WaitingUsers.TryRemove(connectionId, out _);

                    // Remove from FIFO queue
                    RemoveFromQueue(connectionId);

                // 2️⃣ If this user was matched with someone, end that pairing
                if (ActivePairs.TryRemove(connectionId, out var partnerId))
                {
                    ActivePairs.TryRemove(partnerId, out _);

                    _logger.LogInformation($"🔄 myself {connectionId} clicked Next — ending pair with {partnerId}");

                    // Notify partner so partner will start search again from js/partnerleft
                    await Clients.Client(partnerId).SendAsync("PartnerLeft");

                     // requeue partner
                    if (UserPreferences.TryGetValue(partnerId, out var pref))
                    {
                        WaitingUsers[partnerId] = pref;
                        WaitingQueue.Enqueue(partnerId);
                        _logger.LogInformation($"🔁 Partner {partnerId} requeued");
                    }
                }
                        // 3️⃣ Notify caller that chat ended
                    await Clients.Caller.SendAsync("ChatStopped");
                    _logger.LogInformation($"✅ myself {connectionId} ended chat, ready to start searching again.");

                        // Requeue myself if they are still online and valid
                        if (UserPreferences.TryGetValue(connectionId, out var selfprefs))
                        {
                            WaitingUsers[connectionId] = selfprefs;
                            WaitingQueue.Enqueue(connectionId);

                            await Clients.Client(connectionId).SendAsync("Waiting","next");
                            _logger.LogInformation($"🔁 myself {connectionId} re-queued.");
                        }
                    

                    
                }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Next() Error=> {ex.Message}");
                        await Clients.Caller.SendAsync("Error", "Failed to find next partner, please try again.");
                    }
                        
        }

        //Send text message
        public async Task SendChatMessage(string partnerId, string message)
        {
            if (string.IsNullOrWhiteSpace(message)) return;

            _logger.LogInformation($"[CHAT] {Context.ConnectionId} → {partnerId}: {message}");
            await Clients.Client(partnerId).SendAsync("ReceiveChatMessage", Context.ConnectionId, message);
        }

        // 🔹 WebRTC signaling relay
        public async Task SendSignal(string targetId, string type, object data)
        {
            var senderId = Context.ConnectionId;
            
            // ✅ Check if sender and target are in the same active pair
                if (!ActivePairs.TryGetValue(senderId, out var partnerId) || partnerId != targetId)
                {
                    _logger.LogInformation($"🚫 Invalid signal: {senderId} attempted to send to {targetId}, not a valid pair.");
                    return;
                }
            await Clients.Client(targetId).SendAsync("ReceiveSignal", senderId, type, data);
        }


        // 🔹 Handle disconnect
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var connectionId = Context.ConnectionId;

            try
            {   
                _logger.LogInformation($"❌ Disconnected: {connectionId}");

                WaitingUsers.TryRemove(connectionId, out _);
                RemoveFromQueue(connectionId);
                // 🔒 HARD STOP — prevents future matches
                ActivelySearching.TryRemove(connectionId, out _);
                //remove tags
                UserInterests.TryRemove(connectionId, out _);

                if (ActivePairs.TryRemove(connectionId, out var partnerId))
                    {
                        ActivePairs.TryRemove(partnerId, out _);
                        _logger.LogInformation($"💔 Disconnected: notified partner {partnerId}");

                        await Clients.Client(partnerId).SendAsync("PartnerLeft");

                        if (UserPreferences.TryGetValue(partnerId, out var pref))
                            {
                                WaitingUsers[partnerId] = pref;
                                WaitingQueue.Enqueue(partnerId);
                            }
                        
                    }
                
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Disconnect Error for {connectionId}: {ex}");
            }
  
            await base.OnDisconnectedAsync(exception);
        }

        //Helper
        private void RemoveFromQueue(string id)
            {
                try
                {
                    var newQ = new ConcurrentQueue<string>();

                    foreach (var uid in WaitingQueue)
                        if (uid != id)
                            newQ.Enqueue(uid);

                    // Replace queue
                    while (WaitingQueue.TryDequeue(out _)) { }
                    foreach (var uid in newQ)
                        WaitingQueue.Enqueue(uid);
                }
                catch (Exception ex)
                {   
                    _logger.LogInformation($"❌ RemoveFromQueue Error: {ex}"); 
                }
            }


        // 🔹 On connected
        public override Task OnConnectedAsync()
        {
            _logger.LogInformation($"✅ Connected: {Context.ConnectionId}");
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
                //_logger.LogInformation("json=>" , json);
                using var doc = JsonDocument.Parse(json);
                //_logger.LogInformation("doc=>" ,doc);
                var root = doc.RootElement;
                //_logger.LogInformation("root=>" ,root);
                var country = root.TryGetProperty("country", out var c) ? c.GetString() : "Unknown";
                var city = root.TryGetProperty("city", out var ci) ? ci.GetString() : "Unknown";
                //_logger.LogInformation($" country=> {country}, city=>{city}");
                return (country ?? "Unknown", city ?? "Unknown");
            }
            catch
            {
                return ("Unknown", "Unknown");
            }
        }
    }
}