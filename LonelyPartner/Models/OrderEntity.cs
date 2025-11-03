using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LonelyPartner.Models
{
    public class OrderEntity
    {
        [Key]
        public int Id { get; set; }
        public string OrderId { get; set; } = string.Empty;    // LP-<guid>
        
        [Required]
        public int UserId { get; set; }

        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        
        [Column(TypeName = "decimal(18,9)")]
        public decimal AmountUSD { get; set; }

        [Column(TypeName = "decimal(18,9)")]
        public decimal AmountSol { get; set; }                // SOL amount (decimal)
        public string Currency { get; set; } = "SOL";
        public string Memo { get; set; } = string.Empty;      // unique memo used in tx
        
        [MaxLength(20)]
        public string Status { get; set; } = "created";       // created, paid, expired
        public string? TxId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PaidAt { get; set; }
    }
}