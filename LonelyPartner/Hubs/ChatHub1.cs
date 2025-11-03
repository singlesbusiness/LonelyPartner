using Microsoft.AspNetCore.SignalR;
using MySqlX.XDevAPI;
using System.Collections.Concurrent;

namespace LonelyPartner.Hubs
{
    public class ChatHub1 : Hub
    {
        private static readonly Dictionary<string, string> WaitingUsers1 = new();

        public async Task StartSearching(string gender, string continent)
        {
            Console.WriteLine($"🔍 User {Context.ConnectionId} searching for any: {gender}, {continent}");

            var available = WaitingUsers1.Keys.FirstOrDefault(u => WaitingUsers1[u] == null);
            if (available == null)
            {
                WaitingUsers1[Context.ConnectionId] = null;
                await Clients.Caller.SendAsync("Waiting");
                return;
            }
           // else
            //{
              //  Console.WriteLine("🕒 No partner yet, waiting...");
            //}

            // Match found
            WaitingUsers1[available] = Context.ConnectionId;
            await Clients.Client(Context.ConnectionId).SendAsync("Matched", available);
            await Clients.Client(available).SendAsync("Matched", Context.ConnectionId);

            
        }

        public async Task Stop()
        {
            try
            {
                var connectionId = Context.ConnectionId;
                //cleanly remove from waiting
                WaitingUsers1.Remove(connectionId, out _);
                //Tell everyone that this user left
                await Clients.All.SendAsync("PartnerLeft", connectionId);

                await Clients.Caller.SendAsync("Stopped");
                Console.WriteLine($"{connectionId} stopped searching");
            }
            catch (Exception ex)
            {   
                Console.WriteLine($"Stop() Error: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "Stop failed on serve.");
            }
        }

        public async Task Next()
        {
            var connectionId = Context.ConnectionId;
            await Stop();
            await StartSearching("", "");
        }

        public async Task SendSignal(string targetId, string type, object data)
        {
            Console.WriteLine($"Relaying {type} from {Context.ConnectionId} to {targetId}");
            await Clients.Client(targetId).SendAsync("ReceiveSignal", Context.ConnectionId, type, data);
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            WaitingUsers1.Remove(Context.ConnectionId);
            return base.OnDisconnectedAsync(exception);
        }

        public override Task OnConnectedAsync()
        {
            Console.WriteLine($"User connected: {Context.ConnectionId}");
            return base.OnConnectedAsync();
        }
    }

}

