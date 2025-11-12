using System;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using LonelyPartner.Data;
using LonelyPartner.Models;
using Microsoft.EntityFrameworkCore; // adjust if your OrderEntity is elsewhere

namespace LonelyPartner.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;

        public EmailService( IConfiguration config)
        {   
            _config = config;
        }

        public async Task<bool> SendInvoiceEmailAsync(dynamic orderInfo)
        {
            if (orderInfo == null || string.IsNullOrWhiteSpace(orderInfo.Email))
            {
                return false;
            }

            try
            {
                    // Load from config
                    var emailCfg = _config.GetSection("EmailConfig");
                    var host = emailCfg["Host"];
                    var port = Convert.ToInt32(emailCfg["Port"]);
                    var username = emailCfg["Username"];
                    var password = emailCfg["Password"];
                    //var from = emailCfg["FromEmailAddress"];
                    var from = string.Concat(emailCfg["FromEmailAddress"] , "LonelyPartner" ) ;

                    // Build email body
                    var subject = $"LonelyPartner Invoice for {orderInfo.ProductName}";
                    var body = $@"
                <html>
                    <body style='font-family: ""Segoe UI"", Arial, sans-serif; background-color: #1a0826; margin: 0; padding: 0; color: #eee;'>
                        <div style='max-width: 600px; margin: 40px auto; background-color: #2c0e3f; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.4); overflow: hidden;'>
                        
                        <!-- Header -->
                        <div style='background-color: #6a1b9a; color: white; text-align: center; padding: 20px 10px;'>
                            <h2 style='margin: 0; font-size: 24px;'>💜 Payment Successful</h2>
                        </div>

                        <!-- Body -->
                        <div style='padding: 30px;'>
                            <p style='font-size: 16px; color: #eee;'>Dear {orderInfo.Name ?? "Customer"},</p>
                            <p style='font-size: 16px; color: #eee;'>Thank you for your payment! Here are your payment details:</p>

                        <table style='border-collapse: collapse; width: 100%; margin-top: 15px; border-radius: 8px; overflow: hidden;'>
                        <tr style='background-color: #3b1557;'>
                            <td style='padding: 10px 15px; border-bottom: 1px solid #4b1e70; font-weight: bold; color: #d1aaff;'>Product:</td>
                            <td style='padding: 10px 15px; border-bottom: 1px solid #4b1e70; color: #f1e6ff;'>{orderInfo.ProductName}</td>
                        </tr>
                        <tr>
                            <td style='padding: 10px 15px; border-bottom: 1px solid #4b1e70; font-weight: bold; color: #d1aaff;'>Amount (USD):</td>
                            <td style='padding: 10px 15px; border-bottom: 1px solid #4b1e70; color: #f1e6ff;'>${orderInfo.AmountUSD:F2}</td>
                        </tr>
                        <tr style='background-color: #3b1557;'>
                            <td style='padding: 10px 15px; border-bottom: 1px solid #4b1e70; font-weight: bold; color: #d1aaff;'>Amount (SOL):</td>
                            <td style='padding: 10px 15px; border-bottom: 1px solid #4b1e70; color: #f1e6ff;'>{orderInfo.AmountSol}</td>
                        </tr>
                        <tr>
                            <td style='padding: 10px 15px; border-bottom: 1px solid #4b1e70; font-weight: bold; color: #d1aaff;'>Transaction ID:</td>
                            <td style='padding: 10px 15px; border-bottom: 1px solid #4b1e70; color: #f1e6ff;'>{orderInfo.TxId}</td>
                        </tr>
                        <tr>
                            <td style='padding: 10px 15px; border-bottom: 1px solid #4b1e70; font-weight: bold; color: #d1aaff;'>Order ID:</td>
                            <td style='padding: 10px 15px; border-bottom: 1px solid #4b1e70; color: #f1e6ff;'>{orderInfo.OrderId}</td>
                        </tr>
                        <tr style='background-color: #3b1557;'>
                            <td style='padding: 10px 15px; font-weight: bold; color: #d1aaff;'>Paid At (UTC):</td>
                            <td style='padding: 10px 15px; color: #f1e6ff;'>{orderInfo.PaidAt:yyyy-MM-dd HH:mm:ss}</td>
                        </tr>
                        </table>

                        <p style='margin-top: 25px; font-size: 16px; color: #eee;'>
                        Your plan is now active. Enjoy your premium access!
                        </p>

                        <p style='margin-top: 20px; font-size: 14px; color: #aaa;'>
                        This is an automated email, please do not reply.
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style='background-color: #4a136b; text-align: center; padding: 15px; font-size: 14px; color: #d1aaff;'>
                        <p style='margin: 0;'>Thanks, <b>LonelyPartner</b></p>
                    </div>
                    </div>
                </body>
                </html>";

                    using var client = new SmtpClient(host, port)
                    {
                        EnableSsl = true,
                        Credentials = new NetworkCredential(username, password)
                    };

                    using var message = new MailMessage(from, orderInfo.Email, subject, body)
                    {
                        IsBodyHtml = true
                    };

                    await client.SendMailAsync(message);
                    Console.WriteLine($"✅ Invoice email sent to {orderInfo.Email}");
                    return true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Failed to send email: {ex.Message}");
                    return false;
                }
            }
    }
}
