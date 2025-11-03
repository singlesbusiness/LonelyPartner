using LonelyPartner.Data;
using LonelyPartner.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LonelyPartner.Controllers
{
    [Authorize] // only logged-in users
    public class AdminController : Controller
    {
        private readonly UserDBContext _context;

        public AdminController(UserDBContext context)
        {
            _context = context;
        }

        // GET: /Admin/Dashboard
        public async Task<IActionResult> Dashboard(string? searchEmail)
        {
            // get current user to verify admin
            var email = User?.Claims.FirstOrDefault(c => c.Type.Contains("email"))?.Value;
            var current = await _context.UserEntity.FirstOrDefaultAsync(u => u.CustomerEmail == email);

            if (current == null || current.Role != "Admin")
                return Forbid();

            var query = _context.UserEntity.AsQueryable();

            if (!string.IsNullOrEmpty(searchEmail))
                query = query.Where(u => u.CustomerEmail!.Contains(searchEmail));

            var users = await query.OrderBy(u => u.Id).ToListAsync();

            ViewBag.TotalUsers = await _context.UserEntity.CountAsync();
            ViewBag.ActivePlans = await _context.UserEntity
                .CountAsync(u => u.ProductId != null && u.EndDate > DateTime.UtcNow);

            // ✅ Fetch all paid orders
            var paidOrders = await _context.OrderEntity
                .Where(o => o.Status == "Paid")
                .ToListAsync();

            // ✅ Aggregate totals
            var totalSol = paidOrders.Sum(o => o.AmountSol);
            var totalUsd = paidOrders.Sum(o => o.AmountUSD);

            // ✅ Pass to view
            ViewBag.TotalSol = totalSol.ToString("N9"); // 9 decimal places for SOL precision
            ViewBag.AmountUSD = totalUsd.ToString("N2");    

            return View(users);
        }

        [HttpPost]
        public async Task<IActionResult> Edit(int id, [FromForm] UserEntity updated)
        {
            var user = await _context.UserEntity.FindAsync(id);
            if (user == null) return NotFound();

            // simple fields you want editable:
            user.CustomerEmail = updated.CustomerEmail;
            user.CustomerName = updated?.CustomerName ?? updated.CustomerEmail;
            user.ProductId = updated?.ProductId ?? 0;
            user.ProductName = updated?.ProductName ?? "";
            user.EndDate = updated?.EndDate ?? DateTime.UtcNow;
            user.StartDate = updated?.StartDate ?? DateTime.UtcNow; ;
            user.OrderId = updated?.OrderId ?? "";
            user.TransactionId = updated?.TransactionId ?? "";
            //user all should be "User" only, default to User
            user.Role =  "User";
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Dashboard));
        }
    }
}
