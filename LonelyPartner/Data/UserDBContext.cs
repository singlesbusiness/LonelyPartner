using LonelyPartner.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using LonelyPartner.Models;

namespace LonelyPartner.Data
{
    public class UserDBContext : IdentityDbContext<ApplicationUser>
    {
        public UserDBContext(DbContextOptions<UserDBContext> options) : base(options)
        {
        }

        public DbSet<UserEntity> UserEntity { get; set; }

        public DbSet<OrderEntity> OrderEntity { get; set; }

         // optional
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
        }
    }
}
