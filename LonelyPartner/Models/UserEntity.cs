using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.VisualBasic;

namespace LonelyPartner.Models
{
    public class UserEntity
    {
        [Key]
        public int Id { get; set; }
        public string CustomerName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string CustomerEmail { get; set; } = string.Empty;
        public int ProductId { get; set; } = 0;
        public string ProductName { get; set; } = string.Empty;

        [MaxLength(5)]
        public string Role { get; set; } = "User";
        public bool IsActivePlan { get; set; } = false;

        [Column(TypeName = "decimal(18,9)")]
        public decimal TotalAmount { get; set; } 

        public string TransactionId { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }    
        public DateTime EndDate { get; set; }
        

        
        
    }
}
