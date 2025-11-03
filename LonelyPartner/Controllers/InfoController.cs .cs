using Microsoft.AspNetCore.Mvc;

namespace LonelyPartner.Controllers
{
    public class InfoController : Controller
    {
        public IActionResult FAQ() => View();
        public IActionResult Terms() => View();
        public IActionResult Privacy() => View();

        [HttpGet]
        public IActionResult ContactUs() => View();

        [HttpPost]
        public IActionResult ContactUs(string reason, string message)
        {
            // Dummy email sending simulation
            ViewBag.Status = $"Email sent to xyz@partner.com <mailto:xyz@partner.com>  with subject: {reason}";

            // In production: use SMTP or external service
            // await _emailService.SendEmailAsync("xyz@partner.com <mailto:xyz@partner.com> ", reason, message);

            return View();
        }
    }
}

