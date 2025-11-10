using LonelyPartner.Data;
using LonelyPartner.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LonelyPartner.Areas.Admin.Controllers
{
    [Area("Admin")]
    //[Authorize(Roles = "Admin")]
    [Authorize]
    public class DashboardController : Controller
    {
        private readonly UserDBContext _context;

        public DashboardController(UserDBContext context)
        {
            _context = context;
        }

        // GET: /Admin/Dashboard
        public async Task<IActionResult> Index(string? searchEmail, int page = 1, int pageSize = 25)
        {   
            // 🔍 Get current user
            var email = User?.Claims.FirstOrDefault(c => c.Type.Contains("email"))?.Value;
            var current = await _context.UserEntity.FirstOrDefaultAsync(u => u.CustomerEmail == email);

            if (current == null || current.Role != "Admin")
                return Forbid(); // manual admin check ✅
                
            var query = _context.UserEntity.AsQueryable();

            if (!string.IsNullOrEmpty(searchEmail))
                query = query.Where(u => u.CustomerEmail!.Contains(searchEmail));

            var totalUsers = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalUsers / (double)pageSize);

            var users = await query
                .OrderBy(u => u.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            ViewBag.TotalUsers = await _context.UserEntity.CountAsync();
            ViewBag.ActivePlans = await _context.UserEntity
                .CountAsync(u => u.ProductId != null && u.EndDate > DateTime.UtcNow);
            ViewBag.TotalPages = totalPages;
            ViewBag.CurrentPage = page;

            // Orders summary
            var paidOrders = await _context.OrderEntity.Where(o => o.Status == "Paid").ToListAsync();
            ViewBag.TotalSol = paidOrders.Sum(o => o.AmountSol).ToString("N9");
            ViewBag.AmountUSD = paidOrders.Sum(o => o.AmountUSD).ToString("N2");

            return View(users);
        }

        [HttpPost]
        public async Task<IActionResult> Edit(int id, [FromForm] UserEntity updated)
        {
            var user = await _context.UserEntity.FindAsync(id);
            if (user == null) return NotFound();

            user.CustomerEmail = updated.CustomerEmail;
            user.CustomerName = updated.CustomerName ?? updated.CustomerEmail;
            user.ProductId = updated.ProductId;
            user.ProductName = updated.ProductName ?? "";
            user.StartDate = updated.StartDate;
            user.EndDate = updated.EndDate;
            user.OrderId = updated.OrderId ?? "";
            user.TransactionId = updated.TransactionId ?? "";
            user.Role = "User";

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
    }
}
