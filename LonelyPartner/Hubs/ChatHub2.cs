using System.Collections.Concurrent;
using System.Reflection;
using System.Security.Claims;
using LonelyPartner.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;


namespace LonelyPartner.Hubs
{
    public class ChatHub2 : Hub
    {
        // Thread-safe dictionaries to manage state
        private static ConcurrentDictionary<string, string?> WaitingUsers = new();
        private static ConcurrentDictionary<string, string?> ActivePairs = new();

        public override Task OnConnectedAsync()
        {
            Console.WriteLine($"[+] Connected: {Context.ConnectionId}");
            return base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"[-] Disconnected: {Context.ConnectionId}");

            // Remove from waiting list
            WaitingUsers.TryRemove(Context.ConnectionId, out _);

            // Remove from active pairs and notify partner
            if (ActivePairs.TryRemove(Context.ConnectionId, out var partnerId))
            {
                if (!string.IsNullOrEmpty(partnerId))
                {
                    ActivePairs.TryRemove(partnerId, out _);
                    await Clients.Client(partnerId).SendAsync("PartnerLeft");
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        // ✅ Unified method with default parameters (no ambiguity)
        public async Task StartSearching(string gender, string continent)
        {
            Console.WriteLine($"[SEARCH] {Context.ConnectionId} searching for match (Gender={gender}, Continent={continent})");

            

            // If already paired, ignore
            if (ActivePairs.ContainsKey(Context.ConnectionId))
            {
                await Clients.Caller.SendAsync("SystemMessage", "You are already in a chat.");
                return;
            }

            // Try to find waiting user
            var available = WaitingUsers.Keys.FirstOrDefault(u => u != Context.ConnectionId);

            if (available == null)
            {
                // No partner available — wait
                WaitingUsers[Context.ConnectionId] = null;
                await Clients.Caller.SendAsync("Waiting");
                Console.WriteLine($"[WAITING] {Context.ConnectionId} waiting for partner...");
            }
            else
            {
                // Found a match
                WaitingUsers.TryRemove(available, out _);

                ActivePairs[Context.ConnectionId] = available;
                ActivePairs[available] = Context.ConnectionId;

                Console.WriteLine($"[MATCHED] {Context.ConnectionId} ↔ {available}");

                await Clients.Client(Context.ConnectionId)
                    .SendAsync("Matched", new { partner = available, isInitiator = true });

                await Clients.Client(available)
                    .SendAsync("Matched", new { partner = Context.ConnectionId, isInitiator = false });
            }
        }

        public async Task SendSignal(string partnerId, string type, object data)
        {
            if (string.IsNullOrEmpty(partnerId)) return;
            Console.WriteLine($"[SIGNAL] {Context.ConnectionId} → {partnerId} : {type}");

            await Clients.Client(partnerId)
                .SendAsync("ReceiveSignal", Context.ConnectionId, type, data);
        }

        public async Task SendChatMessage(string partnerId, string message)
        {
            if (string.IsNullOrWhiteSpace(message)) return;

            Console.WriteLine($"[CHAT] {Context.ConnectionId} → {partnerId}: {message}");
            await Clients.Client(partnerId).SendAsync("ReceiveChatMessage", Context.ConnectionId, message);
        }

        public async Task NextPartner()
        {
            Console.WriteLine($"[NEXT] {Context.ConnectionId} requested new partner");

            if (ActivePairs.TryRemove(Context.ConnectionId, out var partnerId))
            {
                if (!string.IsNullOrEmpty(partnerId))
                {
                    ActivePairs.TryRemove(partnerId, out _);
                    await Clients.Client(partnerId).SendAsync("PartnerLeft");
                }
            }

            // StartSearching(string gender ="", string continent = "");
        }

        public async Task StopChat()
        {
            Console.WriteLine($"[STOP] {Context.ConnectionId} stopped chat");

            if (ActivePairs.TryRemove(Context.ConnectionId, out var partnerId))
            {
                if (!string.IsNullOrEmpty(partnerId))
                {
                    ActivePairs.TryRemove(partnerId, out _);
                    await Clients.Client(partnerId).SendAsync("PartnerLeft");
                }
            }

            WaitingUsers.TryRemove(Context.ConnectionId, out _);
            await Clients.Caller.SendAsync("ChatStopped");
        }
    }
}
