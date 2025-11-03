using System.Net.Mail;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.VisualBasic;
//using Razorpay.Api;
using LonelyPartner.Data;
using LonelyPartner.Models;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
namespace LonelyPartner.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class UserController : Controller
    {       
        private readonly UserDBContext _context;
       // private readonly RazorpaySettings _razorpaySettings;

       // public UserController(UserDBContext context, IOptions<RazorpaySettings> razorpaySettings )
        public UserController(UserDBContext context)
        {
            _context = context;
           // _razorpaySettings = razorpaySettings.Value;
        }
        

        
        //[BindProperty]
        public UserEntity _UserDetails { get; set; }        
        public IActionResult Index(int id)
        {
            var user = _context.UserEntity.Find(id);
            if (user == null)
            {
                _UserDetails = user;
            }

             return View();
        }

        //Get admin User
        [HttpGet("role")]
        public async Task<IActionResult> GetRole()
        {
            var email = User?.Identity?.Name; // from Google login
            if (string.IsNullOrEmpty(email))
                return Unauthorized();
           
            var user = await _context.UserEntity
                .AsNoTracking()
                .Where(u => u.CustomerEmail == email)
                .Select(u => new { u.CustomerEmail, u.Role })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound();

            return Ok(new { role = user.Role });
        }


        //Get User Profile
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile(string email)
        {
            if (string.IsNullOrEmpty(email))
                return BadRequest("Email missing");
            
            var user = await _context.UserEntity.FirstOrDefaultAsync(u => u.CustomerEmail == email);
            if (user == null)
                return NotFound("User not found");

            return Ok(new
            {
                user.CustomerName,
                user.CustomerEmail,
                user.ProductName,
                user.ProductId,
                user.StartDate,
                user.EndDate,
                user.Role
            });
        }


        /*
                public IActionResult InitiateOrder( OrderEntity model)
                {
                    Random _random = new Random();
                    string TransactionId = _random.Next(0, 10000000).ToString();
                   // string key = "rzp_test_REeSjJyjsv8lss";
                   // string secret = "FrMxIr5BYLdGNAGuoxHjnqna";
                    string key = _razorpaySettings.Key; 
                    ViewBag.rKey = _razorpaySettings.Key;
                    string secret = _razorpaySettings.Secret;

                    RazorpayClient client = new RazorpayClient(key, secret);

                    Dictionary<string, object> input = new Dictionary<string, object>();
                    input.Add("amount", Convert.ToDecimal(model.TotalAmount * 100)); // Amount is in currency subunits.
                    input.Add("currency", "INR");
                    input.Add("receipt", TransactionId);


                    Razorpay.Api.Order order = client.Order.Create(input);
                    ViewBag.orderid = order["id"].ToString();

                    //to update DB adter payment
                    ViewBag.orderEntityId = model.Id;

                    return View("Payment", model);
                }

                public IActionResult Payment(string razorpay_payment_id, string razorpay_order_id,
                    string razorpay_signature, string orderEntityId, string orderEntityAmount,
                    string orderEntityProductId, string orderEntityProductName)
                {
                    Dictionary<string, string> attributes = new Dictionary<string, string>();
                    attributes.Add("razorpay_payment_id", razorpay_payment_id);
                    attributes.Add("razorpay_order_id", razorpay_order_id);
                    attributes.Add("razorpay_signature", razorpay_signature);            

                    Utils.verifyPaymentSignature(attributes);

                    //update DB
                    int localId = Convert.ToInt32(orderEntityId);
                    Double localEntityAmount = Convert.ToDouble(orderEntityAmount);
                    int localEntityProductId = Convert.ToInt32(orderEntityProductId);
                    string localEntityProductName = orderEntityProductName;

                    var user = _context.OrderEntity.Find(localId);
                    //OrderEntity orderdetails = new OrderEntity();
                    //orderdetails.TransactionId = razorpay_payment_id;
                    //orderdetails.OrderId = razorpay_order_id;

                    if (user != null)
                    {
                        user.ProductId = localEntityProductId;
                        user.ProductName = localEntityProductName;
                        user.TotalAmount = localEntityAmount;
                        user.TransactionId = razorpay_payment_id;
                        user.OrderId = razorpay_order_id;
                        user.StartDate = DateTime.Now;
                        if (localEntityProductId == 1005)
                        {
                            DateTime now = DateTime.Now;
                            DateTime oneMonthLater = now.AddYears(1);
                            user.EndDate = oneMonthLater;
                        }
                        else if (localEntityProductId == 1004)
                        {
                            DateTime now = DateTime.Now;
                            DateTime oneMonthLater = now.AddMonths(1);
                            user.EndDate = oneMonthLater;
                        }
                        else if (localEntityProductId == 1003)
                        {
                            DateTime now = DateTime.Now;
                            DateTime oneWeekLater = now.AddDays(7);
                            user.EndDate = oneWeekLater;
                        }
                        else if (localEntityProductId == 1002)
                        {
                            DateTime now = DateTime.Now;
                            DateTime oneDayLater = now.AddDays(1);
                            user.EndDate = oneDayLater;
                        }
                        else if (localEntityProductId == 1001)
                        {
                            DateTime now = DateTime.Now;
                            DateTime oneHourLater = now.AddHours(1);
                            user.EndDate = oneHourLater;
                        }

                        else
                        {
                            user.EndDate = DateTime.Now;
                        }

                        if (ModelState.IsValid)
                        {
                            _context.OrderEntity.Update(user);
                            _context.SaveChanges();  

                            //send invoice email here
                           // return RedirectToAction("SendEmail", new { id = user.Id });
                        }

                        return RedirectToAction("Index", "Home", new { id = user.Id });
                    }


                    return RedirectToAction("Index", "Home");

                    //return View("PaymentSuccess", orderdetails);

                }


                /*
                //Send invoice email
                public IActionResult SendEmail( int id)
                {
                    if (id != 0)
                    {
                        var user = _context.OrderEntity.Find(id);


                        var myEmailConfig = new ConfigurationBuilder().AddJsonFile("appsetting.json").Build();

                        var username = myEmailConfig.GetValue<string>("EmailConfig:Username");
                        var password = myEmailConfig.GetValue<string>("EmailConfig:Password");
                        var host = myEmailConfig.GetValue<string>("EmailConfig:Host");
                        var port = myEmailConfig.GetValue<int>("EmailConfig:Port");
                        var fromEmailAddress = myEmailConfig.GetValue<string>("EmailConfig:FromEmailAddress");

                        var ToEmailAddress = user.CustomerEmail;
                        var Subject = "Singles Invoice";
                        //Email Body
                        var EmailBodyMessage = new StringBuilder ("<table style=\"width:100%;\">");
                        EmailBodyMessage.AppendLine("<tr>");

                        MailMessage message = new MailMessage();
                        message.From = new MailAddress(fromEmailAddress);
                        message.To.Add(ToEmailAddress);
                        // message.To.Add(objEmailParameters.ToEmailAddress.ToString());
                        message.Subject = Subject;
                        message.IsBodyHtml = true;
                        message.Body = EmailBodyMessage.ToString();
                        // message.Attachments.Add(new Attachment(PostedFile.OpenReadStream(), PostedFile.Filename));
                        SmtpClient mailClient = new SmtpClient(host);

                        try
                        {

                            mailClient.UseDefaultCredentials = false;
                            mailClient.Credentials = new System.Net.NetworkCredential(username, password);
                            mailClient.Host = host;
                            mailClient.Port = port;
                            //mailClient.EnableSsl = true;
                            mailClient.Send(message);

                        }
                        catch (Exception e)
                        {
                        }
                        finally
                        {
                            mailClient.Dispose();

                        }
                    }
                    else {
                        return RedirectToAction("Index", "Home");
                    }

                        return RedirectToAction("Index", "Home", new { id = id });
                }

                */

    }
}
