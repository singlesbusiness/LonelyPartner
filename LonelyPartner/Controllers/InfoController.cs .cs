using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Net.Mail;

namespace LonelyPartner.Controllers
{
    public class InfoController : Controller
    {
         private readonly IConfiguration _config;
         private readonly ILogger<InfoController> _logger;

        public InfoController(IConfiguration config, ILogger<InfoController> logger)
        {
            _config = config;
            _logger = logger;
        }

        [HttpGet]
        public IActionResult Index()
        {
            return View();
        }
        public IActionResult FAQ() => View();
        public IActionResult Terms() => View();
        public IActionResult Privacy() => View();

        [HttpGet]
        public IActionResult ContactUs() => View();

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ContactUs(string fromemail, string reason, string message )
        {
            

            string captchaResponse = Request.Form["g-recaptcha-response"];
            if (string.IsNullOrEmpty(captchaResponse))
            {
                ViewBag.Status = "❌ Please complete the reCAPTCHA verification.";
                return View();
            }

            // Verify with Google
            using var http = new HttpClient();
            var secret = _config["GoogleReCaptcha:SecretKey"];
            var verifyRes = await http.PostAsync(
                $"https://www.google.com/recaptcha/api/siteverify?secret={secret}&response={captchaResponse}",
                null
            );

            var verifyJson = await verifyRes.Content.ReadAsStringAsync();
            var verifyObj = System.Text.Json.JsonDocument.Parse(verifyJson);
            bool success = verifyObj.RootElement.GetProperty("success").GetBoolean();

            if (!success)
            {
                ViewBag.Status = "❌ reCAPTCHA verification failed. Please try again.";
                return View();
            }

            if (string.IsNullOrWhiteSpace(message))
            {
                ViewBag.Status = "⚠️ Message cannot be empty.";
                return View();
            }
            // ✅ Now proceed to send email (same logic as before)
            try
            {   
                var emailSettings = _config.GetSection("EmailConfig");
                string to = emailSettings["ToEmailAddress"];
                string from = emailSettings["FromEmailAddress"];//
                string host = emailSettings["Host"];
                int port = Convert.ToInt32(emailSettings["Port"]);
                string username = emailSettings["Username"];
                string password = emailSettings["Password"];

                using var client = new SmtpClient(host, port)
                {
                    EnableSsl = true,
                    Credentials = new NetworkCredential(username, password)
                };
                
   
                var mail = new MailMessage
                {
                    From = new MailAddress(from, "LonelyPartner Contact"),
                    Subject = $"Contact Form: {reason}",
                    Body = $"From: {fromemail.Trim()} \n\n Reason: {reason}\n\nMessage:\n{message}\n\nSent at: {DateTime.UtcNow}",
                    IsBodyHtml = false
                };

                mail.To.Add(to);

                await client.SendMailAsync(mail);

                ViewBag.Status = "✅ Your message has been sent successfully.";
                //Console.WriteLine("sent contact email.");
                _logger.LogInformation("Sent contact email.");
            }
            catch (Exception ex)
            {   
                _logger.LogError(ex, "Unexpected error in InfoController.ContactUs");
                ViewBag.Status = $"❌ Failed to send email: {ex.Message}";
            }
            return View();
        }
    }
}

