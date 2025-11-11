using LonelyPartner.Data;
using LonelyPartner.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LonelyPartner.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize]
    public class DashboardController : Controller
    {
        private readonly UserDBContext _context;
        private const int PageSize = 20;

        public DashboardController(UserDBContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> Index(string tab = "users", string? search = null, int page = 1)
        {
            ViewBag.Tab = tab;
            ViewBag.Search = search;
            ViewBag.CurrentPage = page;
            ViewBag.PageSize = PageSize;

            // ✅ USERS TAB
            if (tab == "users")
            {
                var query = _context.UserEntity.AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                    query = query.Where(u => u.CustomerEmail.ToLower().Contains(search.ToLower()));

                var totalUsers = await query.CountAsync();
                var users = await query.OrderBy(u => u.Id)
                                       .Skip((page - 1) * PageSize)
                                       .Take(PageSize)
                                       .ToListAsync();

                ViewBag.TotalPages = (int)Math.Ceiling(totalUsers / (double)PageSize);

                // Summary metrics
                ViewBag.TotalUsers = await _context.UserEntity.CountAsync();
                ViewBag.ActivePlans = await _context.UserEntity
                    .CountAsync(u => u.ProductId > 0 && u.EndDate > DateTime.UtcNow);

                var paidOrders = await _context.OrderEntity.Where(o => o.Status.ToLower() == "paid").ToListAsync();
                ViewBag.TotalSol = paidOrders.Sum(o => o.AmountSol).ToString("N9");
                ViewBag.TotalUsd = paidOrders.Sum(o => o.AmountUSD).ToString("N2");

                return View(users);
            }

            // ✅ ORDERS TAB — show only PAID orders
            if (tab == "orders")
            {
                var query = _context.OrderEntity
                    .Where(o => o.Status.ToLower() == "paid")
                    .AsQueryable();

                if (int.TryParse(search, out int orderId))
                    query = query.Where(o => o.UserId == orderId && o.Status != null && o.Status.ToLower() == "paid");

                var totalOrders = await query.CountAsync();
                var orders = await query.OrderByDescending(o => o.Id)
                                        .Skip((page - 1) * PageSize)
                                        .Take(PageSize)
                                        .ToListAsync();

                ViewBag.TotalPages = (int)Math.Ceiling(totalOrders / (double)PageSize);
                return View(orders);
            }

            // fallback
            return RedirectToAction(nameof(Index), new { tab = "users" });
        }

        [HttpPost]
        public async Task<IActionResult> EditUser(int id, [FromForm] UserEntity updated)
        {
            var user = await _context.UserEntity.FindAsync(id);
            if (user == null) 
            {
                TempData["SaveMessage"] = "❌ User not found!";
                return RedirectToAction(nameof(Index), new { tab = "users" });
            }
            //Console.WriteLine("🟢 Update user by admin started");
            //Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(updated));
            user.CustomerEmail = updated.CustomerEmail;
            user.CustomerName = updated.CustomerName;
            user.ProductId = updated.ProductId;
            user.ProductName = updated.ProductName;
            user.StartDate = updated.StartDate;
            user.EndDate = updated.EndDate;
            user.OrderId = updated.OrderId;
            user.TransactionId = updated.TransactionId;
            user.Role = "User";

            await _context.SaveChangesAsync();

            Console.WriteLine($"🟢 update userid={id}, by admin done");
            // ✅ show in admin portal at right bottom success message
            TempData["SaveMessage"] = "✅ User details saved successfully!";

            return RedirectToAction(nameof(Index), new { tab = "users" });
        }
    }
}
