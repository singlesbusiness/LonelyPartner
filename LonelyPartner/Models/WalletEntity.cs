using System;
using System.ComponentModel.DataAnnotations;

namespace LonelyPartner.Models
{
    public class WalletEntity
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string KeyName { get; set; } = string.Empty;

        [Required]
        public string ValueText { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? UpdatedBy { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
