
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using LonelyPartner.Data; // adjust to your namespace
using LonelyPartner.Models; // where OrderEntity lives

public class OrderCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OrderCleanupService> _logger;
    private readonly IConfiguration _config;

    public OrderCleanupService(IServiceScopeFactory scopeFactory, ILogger<OrderCleanupService> logger, IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {   
        //default intervalhours = 24 , retentionDays = 7, if values not coming from appsetting
        var intervalHours = _config.GetValue<int>("OrderCleanupSettings:IntervalHours", 24);
        var retentionDays = _config.GetValue<int>("OrderCleanupSettings:RetentionDays", 1);

        _logger.LogInformation($"🧹 OrderCleanupService started. Runs every {intervalHours} hours, deleting orders older than {retentionDays} days.");

        // Run once immediately at startup
        await CleanupOldOrdersAsync(retentionDays, stoppingToken);

        // Then continue on the schedule
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromHours(intervalHours), stoppingToken);
                await CleanupOldOrdersAsync(retentionDays, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                // Graceful shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in OrderCleanupService loop.");
            }
        }
    }

    private async Task CleanupOldOrdersAsync(int retentionDays, CancellationToken token)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<UserDBContext>();

            var cutoffDate = DateTime.UtcNow.AddDays(-retentionDays);
            var oldOrders = await db.OrderEntity
                .Where(o => o.CreatedAt < cutoffDate && o.Status.ToLower() == "created" )
                .ToListAsync(token);

            if (oldOrders.Any())
            {
                db.OrderEntity.RemoveRange(oldOrders);
                await db.SaveChangesAsync(token);
                _logger.LogInformation($"🗑️ Deleted {oldOrders.Count} old orders, older than {cutoffDate:yyyy-MM-dd}.");
            }
            else
            {
                _logger.LogInformation("✅ No old orders found during cleanup.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while cleaning old orders.");
        }
    }
}
