//////////////////////////

////verify Payment////////

//////////////////////////

 

document.addEventListener("DOMContentLoaded", () => {

    const verifyBtn = document.getElementById("verifyPaymentBtn");

    const txInput = document.getElementById("txSignatureInput");

    const statusMsg = document.getElementById("verifyStatusMsg");

 

    if (!verifyBtn) return;

 

    verifyBtn.addEventListener("click", async () => {

        const txSig = txInput.value.trim();

        if (!txSig) {

            statusMsg.textContent = "⚠️ Please enter a transaction signature.";

            statusMsg.className = "text-red-500 text-sm";

            return;

        }

 

        statusMsg.textContent = "⏳ Verifying payment on Solana network...";

        statusMsg.className = "text-blue-500 text-sm";

 

        try {

            // Get the last created order ID from backend

            const orderRes = await fetch("/api/solanapayments/get-last-order", {

                method: "GET",

                headers: { "Accept": "application/json" }

            });

           

 

            if (!orderRes.ok) {

                statusMsg.textContent = "❌ Unable to find your order. Try again.";

                statusMsg.className = "text-red-500 text-sm";

                return;

            }

 

            const order = await orderRes.json();

           // console.log("orderRes=>", order);

 

            // Call verify endpoint

            const verifyRes = await fetch("/api/solanapayments/verify", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json",

                    "Accept": "application/json"

                },

                body: JSON.stringify({

                    orderId: order.orderId,

                    txSig: txSig

                })

            });

 

            const result = await verifyRes.json();

            console.log("result=>", result);

            if (verifyRes.ok && result.ok && result.alreadyPaid != true) {

                statusMsg.textContent = "✅ Payment verified successfully! Your plan is now active.";

                statusMsg.className = "text-green-600 text-sm";

                //setTimeout(() => location.reload(), 1500);   //refresh-reload page

            } else if (result.alreadyPaid == true) {

                statusMsg.textContent = "✅ Your last order has already been paid.";

                statusMsg.className = "text-green-600 text-sm";

            } else {

                statusMsg.textContent = `❌ Verification failed: ${result.message || "Invalid signature"}`;

                statusMsg.className = "text-red-500 text-sm";

            }

        } catch (err) {

            console.error(err);

            statusMsg.textContent = "❌ Error verifying transaction. Try again later.";

            statusMsg.className = "text-red-500 text-sm";

        }

    });

});

 