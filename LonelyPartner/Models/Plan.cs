
namespace LonelyPartner.Models
{
    public class Plan
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal PriceINR { get; set; }
        public int DurationDays { get; set; } = 0;
        public int DurationHours { get; set; } = 0;
        public string Features { get; set; } = string.Empty;
        public int SavePercent { get; set; } = 0;
    }
}
