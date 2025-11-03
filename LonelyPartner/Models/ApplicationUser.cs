using Microsoft.AspNetCore.Identity;

namespace LonelyPartner.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? CurrentSessionId { get; set; }
    }
}