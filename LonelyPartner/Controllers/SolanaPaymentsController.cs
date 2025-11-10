using System.Text.Json;
using LonelyPartner.Data;
using LonelyPartner.Hubs;
using LonelyPartner.Models;
using LonelyPartner.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using LonelyPartner.Services;

[ApiController]
[Route("api/[controller]")]
public class SolanaPaymentsController : ControllerBase
{
    private readonly UserDBContext _db;
    private readonly IConfiguration _cfg;
    private readonly ILogger<SolanaPaymentsController> _logger;
    private readonly SolanaRpcService _rpc;
    private readonly CryptoPriceService _crypto;
    private readonly IHubContext<ChatHub> _hub; // your signalr hub
    private readonly IINRExchangeRateService _exchangeRateService; //INR rate
    private readonly EmailService _emailService;//Email

    public SolanaPaymentsController(UserDBContext db,
                                    IConfiguration cfg,
                                    ILogger<SolanaPaymentsController> logger,
                                    SolanaRpcService rpc,
                                    IHubContext<ChatHub> hub,
                                    CryptoPriceService crypto,
                                    IINRExchangeRateService exchangeRateService,
                                    EmailService emailService)
    {
        _db = db;
        _cfg = cfg;
        _logger = logger;
        _rpc = rpc;
        _hub = hub;
        _crypto = crypto;
        _exchangeRateService = exchangeRateService;
        _emailService = emailService;
    }

    [HttpPost("create-order")]
    [Authorize] // require logged in user
    public async Task<IActionResult> CreateOrder([FromBody] CreateSolOrderDto dto)
    {
        // user id from logged in user or from dto
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        var user = await _db.UserEntity.FirstOrDefaultAsync(u => u.CustomerEmail == email);
        if (user == null) return Unauthorized();

        // Load Plans
        var plans = _cfg.GetSection("Plans").Get<List<Plan>>();
        var selectPlan = plans.FirstOrDefault(p => p.Id == dto.ProductId);


        if (selectPlan == null)
            return BadRequest("Unknown plan selected.");

        // ✅ Fetch current SOL/USD rate
        var solUsdRate = await _crypto.GetSolToUsdRateAsync();
        if (solUsdRate <= 0)
            return BadRequest("Failed to get SOL price.");

        // ✅ Calculate SOL equivalent
        //1 SOL = 1,000,000,000 lamports
        var solAmount = (decimal)selectPlan.Price / solUsdRate;
        //amount in USD
        var amount = selectPlan.Price; 
        
        // create order
        var orderId = Guid.NewGuid().ToString("N");
        var memo = $"LP-{orderId}";
        var order = new OrderEntity
        {
            OrderId = orderId,
            UserId = user.Id,
            ProductId = dto.ProductId,
            ProductName = dto.ProductName,
            AmountUSD = amount,//amount in USD
            AmountSol = solAmount,
            Memo = memo,
            Status = "created",
            CreatedAt = DateTime.UtcNow
        };

        _db.OrderEntity.Add(order);
        await _db.SaveChangesAsync();

        
        // ✅ Fetch Solana public key dynamically from DB, takes 1st record
        var wallet = await _db.WalletEntity
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.KeyName == "SolanaPublicKey"); 

                if (wallet == null || string.IsNullOrWhiteSpace(wallet.ValueText))
                {
                    _logger.LogError("No Solana wallet key found in database.");
                    return BadRequest(new { error = "❌ No Solana wallet key found. Please contact support ." });
                }

        var receiveAddress = wallet.ValueText.Trim();
                //get address from appsetting
                //var receiveAddress = _cfg["Solana:ReceiveAddress"];

        //var inrAmount = (selectPlan.Price * 87 );
        //INR value to i USD
        var inrRate = await _exchangeRateService.GetUsdToInrAsync();
        var inrAmount = Math.Round(selectPlan.Price * inrRate , 2);

        return Ok(new
        {
            checkout = new
            {   
                success = true,
                orderId = order.OrderId,
                receiveAddress,
                memo = order.Memo,
                amountSol = Math.Round(solAmount, 6),
                usd = selectPlan.Price,
                message = $"{Math.Round(solAmount, 6)} SOL = (~${selectPlan.Price}) / (~₹{inrAmount})"
            }
        });
    }

    // Client sends txSignature after sending from Phantom; server verifies on-chain
    [HttpPost("verify")]
    [Authorize]
    public async Task<IActionResult> VerifyTransaction([FromBody] VerifySolDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.OrderId) || string.IsNullOrWhiteSpace(dto.TxSig))
        {
            return BadRequest("Missing orderId or txSig");
        }
        Console.WriteLine($"dto.OrderId = {dto.OrderId}<--->dto.TxSig = {dto.TxSig}");
        //check if orderId created in Orderentity exists
        var order = await _db.OrderEntity.FirstOrDefaultAsync(o => o.OrderId == dto.OrderId);
        if (order == null) return NotFound("Order not found");

        //if user already paid
        if (order.Status == "paid")
        {
            return Ok(new { ok = true, alreadyPaid = true });
        }

        // fetch on-chain tx
        JsonElement txValue = default;

        for (int i = 0; i < 5; i++) // try up to 5 times, 1s apart
        {
            var tx = await _rpc.GetTransactionAsync(dto.TxSig);

            if (tx != null && tx.Value.ValueKind != JsonValueKind.Null)
            {
                txValue = tx.Value;
                break;
            }
            Console.WriteLine($"⏳ Waiting for transaction confirmation... attempt {i + 1}");
            await Task.Delay(1000);

        }       
            
                // ✅ Defensive checks — tx.Value can be null or missing "meta"
                if (txValue.ValueKind == JsonValueKind.Null)
                    {
                        Console.WriteLine("⚠️ tx.Value is null, transaction not yet confirmed");
                        return BadRequest("Transaction not confirmed or still pending.");
                    }
        // Only proceed if meta exists and is not null
        if (!txValue.TryGetProperty("meta", out var metaElem) || metaElem.ValueKind == JsonValueKind.Null)
            {
                Console.WriteLine("⚠️ meta missing or null for tx");
                return BadRequest("Transaction metadata not available yet.");
            }
        // parse transaction object for memo and amount
        // The RPC result has a 'transaction.message.instructions' array that can include memo and transfer.
        try
        {   
            var meta = metaElem;
            //var meta = tx.Value.GetProperty("meta");
            //Check if transaction succeeded
            if(meta.TryGetProperty("err" , out var errProp) &&
                        errProp.ValueKind != JsonValueKind.Null)
            {
                return BadRequest("Transaction failed on-chain ( not successful).");
            }

            var txMessage = txValue.GetProperty("transaction").GetProperty("message");
            string foundMemo = null;
            decimal totalSolReceived = 0m;
            var instructions = txMessage.GetProperty("instructions");
           // Console.WriteLine("instructions=>", instructions);
            /*
            foreach (var instr in instructions.EnumerateArray())
            {
                // memo program check: program == "spl-memo" or programId == "MemoSq4gq..."; sometimes parsed contains 'parsed' object
                if (instr.TryGetProperty("program", out var program) && program.GetString() == "spl-memo")
                {
                    if (instr.TryGetProperty("parsed", out var parsed) && parsed.TryGetProperty("memo", out var memoEl))
                    {
                        foundMemo = memoEl.GetString();
                    }
                    else if (instr.TryGetProperty("data", out var dataEl))
                    {
                        foundMemo = dataEl.GetString();
                    }
                }

                // For transfers, check 'parsed' or 'program' == 'system' and parsed.type == 'transfer'
                if (instr.TryGetProperty("parsed", out var p) && p.ValueKind == JsonValueKind.Object)
                {
                    if (p.TryGetProperty("type", out var typeEl) && typeEl.GetString() == "transfer")
                    {
                        if (p.TryGetProperty("info", out var info) && info.TryGetProperty("lamports", out var lamEl))
                        {
                            var lam = lamEl.GetInt64();
                            totalSolReceived += lam / 1_000_000_000m;
                        }
                    }
                }
            }

            */

            foreach (var instr in instructions.EnumerateArray())
            {
                // --- Check Memo Program ---
                if (instr.TryGetProperty("program", out var program) && program.GetString() == "spl-memo")
                {
                    // ✅ Handle both cases: parsed is string or object
                    if (instr.TryGetProperty("parsed", out var parsed))
                    {
                        if (parsed.ValueKind == JsonValueKind.String)
                        {
                            foundMemo = parsed.GetString();
                        }
                        else if (parsed.ValueKind == JsonValueKind.Object &&
                                 parsed.TryGetProperty("memo", out var memoEl))
                        {
                            foundMemo = memoEl.GetString();
                        }
                    }
                    else if (instr.TryGetProperty("data", out var dataEl))
                    {
                        // Sometimes "data" contains memo text directly
                        foundMemo = dataEl.GetString();
                    }

                    //if we already found the memo, we can skip
                    continue;
                }

                // --- Check Transfers ---
                if (instr.TryGetProperty("parsed", out var p) )
                    if (p.ValueKind == JsonValueKind.Object)
                {
                        //Normal parsed transfer case
                    if (p.TryGetProperty("type", out var typeEl) && typeEl.GetString() == "transfer")
                    {
                        if (p.TryGetProperty("info", out var info) && info.TryGetProperty("lamports", out var lamEl))
                        {
                            var lam = lamEl.GetInt64();
                            totalSolReceived += lam / 1_000_000_000m;
                                //1 SOL = 1,000,000,000 lamports
                            }
                        }
                }
                else if (p.ValueKind == JsonValueKind.String)
                    {
                        var maybeMemo = p.GetString();
                        if (!string.IsNullOrEmpty(maybeMemo) && maybeMemo.StartsWith("LP-"))
                        {
                            foundMemo = maybeMemo;
                        }
                    }
            }


            // fallback: parse meta.postBalances difference for receiving address
            if (totalSolReceived == 0m && 
                         txValue.TryGetProperty("meta", out var meta2) && 
                         meta2.TryGetProperty("postBalances", out var pb) &&
                         meta2.TryGetProperty("preBalances", out var preB))
            {
                // try find index of account that matches your receive address
                var accounts = txValue.GetProperty("transaction").GetProperty("message").GetProperty("accountKeys");
                string receive = _cfg["Solana:ReceiveAddress"];
                int idx = -1;
                for (int i = 0; i < accounts.GetArrayLength(); i++)
                {
                    if (accounts[i].GetString() == receive) { idx = i; break; }
                }
                if (idx >= 0)
                {
                    long post = pb[idx].GetInt64();
                    long pre = preB[idx].GetInt64();
                    if (post > pre)
                    {
                        totalSolReceived = (post - pre) / 1_000_000_000m;
                    }
                }
            }

            // Now compare memo and amount
            if (string.IsNullOrEmpty(foundMemo) || foundMemo != order.Memo)
            {
                return BadRequest("Memo not found or not matching order memo.");
            }

            // allow small tolerance
            if (totalSolReceived + 0.0000001m < order.AmountSol * 0.995m)
            {
                return BadRequest($"Transferred amount {totalSolReceived} SOL does not match expected {order.AmountSol} SOL.");
            }

            // Mark order paid and activate user
            order.Status = "paid";
            order.TxId = dto.TxSig;
            order.PaidAt = DateTime.UtcNow;

            var user = await _db.UserEntity.FindAsync(order.UserId);
            if (user != null)
            {
                user.ProductId = order.ProductId;
                user.ProductName = order.ProductName;
                user.TotalAmount = order.AmountUSD;
                user.IsActivePlan = true;
                user.OrderId = order.OrderId;
                user.TransactionId = order.TxId;
                user.StartDate = DateTime.UtcNow;
                user.EndDate = order.ProductId switch
                {
                    1001 => DateTime.UtcNow.AddHours(1),
                    1002 => DateTime.UtcNow.AddDays(1),
                    1003 => DateTime.UtcNow.AddDays(7),
                    1004 => DateTime.UtcNow.AddMonths(1),
                    1005 => DateTime.UtcNow.AddYears(1),
                    _ => DateTime.UtcNow.AddHours(0)
                };
            }

            await _db.SaveChangesAsync();

            Console.WriteLine("payment successful, user saved as paid user.");

            // Send invoice email=====================
            //Using _ = Task.Run(...) makes the email send asynchronously in the background, 
            // so your API response is fast and the user doesn’t wait for email transmission
            // Load user info BEFORE background task
                var paidUser = await _db.UserEntity
                    .Where(u => u.Id == order.UserId)
                    .Select(u => new { u.CustomerEmail, u.CustomerName })
                    .FirstOrDefaultAsync();

                if (!string.IsNullOrEmpty(paidUser.CustomerEmail))
                {
                    var simpleOrderInfo = new
                    {
                        Email = paidUser.CustomerEmail,
                        Name = paidUser.CustomerName,
                        ProductName = order.ProductName,
                        AmountUSD = order.AmountUSD,
                        AmountSol = order.AmountSol,
                        TxId = order.TxId,
                        OrderId = order.OrderId,
                        PaidAt = order.PaidAt
                    };
                    // Background fire-and-forget email
                    _ = Task.Run(async () =>
                        await _emailService.SendInvoiceEmailAsync(simpleOrderInfo)
                    );
                }
                Console.WriteLine("✅ Payment successful — email queued for sending.");


            /*
            // Notify user via SignalR (User identifier must be configured — we send to user's email)
            if (!string.IsNullOrEmpty(user?.CustomerEmail))
            {
                await _hub.Clients.User(user.CustomerEmail)
                    .SendAsync("PlanActivated", new
                    {
                        productId = order.ProductId,
                        productName = order.ProductName,
                        endDate = user.EndDate,
                        txId = order.TxId
                    });
            }

            Console.WriteLine("Going to PlanActivated in main js.");
            */
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying tx");
            return StatusCode(500, "Error parsing transaction");
        }
    }


    //Get last Order from logged in user
    [HttpGet("get-last-order")]
    [Authorize]
    public async Task<IActionResult> GetLastOrder()
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (email == null)
            return Unauthorized();

        var user = await _db.UserEntity.FirstOrDefaultAsync(u => u.CustomerEmail == email);
        if (user == null)
            return Unauthorized();

        var lastOrder = await _db.OrderEntity
            .Where(o => o.UserId == user.Id)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastOrder == null)
            return NotFound();

        return Ok(new { orderId = lastOrder.OrderId });
    }

}

public class CreateSolOrderDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
}

public class VerifySolDto
{
    public string OrderId { get; set; } = string.Empty;
    public string TxSig { get; set; } = string.Empty;
}