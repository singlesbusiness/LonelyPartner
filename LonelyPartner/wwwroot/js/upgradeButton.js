// ===============================

// 🔹 Upgrade Button + Modal Logic

// ===============================

 

console.log("🧭 upgradeButton.js loaded.");

function initUpgradeAccessControl() {

 

 

    const upgradeBtn = document.getElementById("upgradeBtn");

    const girlsBtn = document.getElementById("girlsBtn");

    const upgradeModal = document.getElementById("upgradeModal");

    const closeUpgradeModal = document.getElementById("closeUpgradeModal");

    const plansContainer = document.getElementById("plansContainer");

    const premiumBadge = document.getElementById("premiumBadge");

    const statusEl = document.getElementById("solStatus");
 
    function isActivePlan() {
                if (!window.appUser?.isAuthenticated || !window.appUser?.endDate)
                    return false;

                const endDateLocal = new Date(window.appUser.endDate);
                const nowLocal = new Date();
                console.log("upgrade end date=>" , endDateLocal);
                console.log("upgrade nowLocal=>" , nowLocal);
                return (window.appUser.productId != 0) && (endDateLocal > nowLocal);
            }
    /*
    function isActivePlan() {

        const now = new Date();

        const endDate = new Date(window.appUser.endDate);

        if (window.appUser.isAuthenticated === true

            && ( (window.appUser.productId != 0) && (endDate > now) ) ) {

            return true;

        }
        

        else if (window.appUser.isAuthenticated === false

            || !window.appUser.productId || window.appUser.productId === 0 || (endDate < now)) {

            return false;

        }

        else {

            return false;

        }       

    }
    */
 

    //load upgrade modal in backgroud

    loadPlans();

    function showLoginModal() {

        loginModal.style.display = "flex";

    }

 

    function showUpgradeModal() {

        const upgradeModal = document.getElementById("upgradeModal");

        upgradeModal.style.display = "flex";

        if (typeof loadPlans === "function") loadPlans();

    }

 

    const isLoggedIn = window.appUser?.isAuthenticated === true;

    const hasActivePlan = isActivePlan();

    //const hasActivePlan = window.appUser?.hasPlan === false;

    console.log("Upgrade button===> isLoggedIn=>", isLoggedIn, "==hasActivePlan=>", hasActivePlan);

 

 

 

 

    // 🔸 Condition 2: Logged in but no active plan

    if (isLoggedIn && !hasActivePlan) {

 

        if (upgradeBtn) upgradeBtn.style.display = "inline-block";

        [upgradeBtn].forEach(el => {

            if (!el) return;

            el.addEventListener("click", showUpgradeModal);

        });

        return;

    }

 

    // 🔸 Condition 1: User not logged in

    else if (!isLoggedIn) {

        [upgradeBtn].forEach(el => {

            if (!el) return;

            el.addEventListener("click", showLoginModal);

        });

 

        return;

    }

 

    // 🔸 Condition 3: Logged in and active plan

    else if (isLoggedIn && hasActivePlan) {

 

        // Hide upgrade button

        if (upgradeBtn) upgradeBtn.style.display = "none";

    }

    else {

        // Hide upgrade button

        if (upgradeBtn) upgradeBtn.style.display = "inline-block";

    }

 

    //// --- SOL PAYMENT UI & PHANTOM integration ---

 

    // showUpgradeModal should render upgrade cards; when a  plan is selected call onBuySol(...)

    async function onBuySol(productId, productName) {

        //console.log("==>", productId, "===>", productName);

        // create order on server

        const res = await fetch("/api/solanapayments/create-order", {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ productId, productName })

        });

        if (!res.ok) {

            const txt = await res.text();
            console.log("Create order failed: " + txt);
            alert("Create order failed: Please try again");

            return;

        }

        const data = await res.json();
        //console.log("create-order response==>", data);

        //console.log(data.checkout.success);
        if (data.checkout.success != true) {
            console.log("Create order failed: " ,data.checkout.success );
            alert("Create order failed: Please try again");
        }

        //document.getElementById("solAmount").innerText = `${data.checkout.amountSol} SOL (~$${data.checkout.usd})`;

        const checkout = data.checkout;

        // Hide upgrade modal

        const upgradeModalEl = document.getElementById("upgradeModal");

        if (upgradeModalEl) upgradeModalEl.style.display = "none";

      showSolModal(checkout); // opens the modal and prepares UI
  }

 

    function showSolModal(checkout) {
        //orderId
        const orderId = checkout.orderId;
        const modal = document.getElementById("solModal");

        if (!modal) {

            console.error("❌ solModal not found in DOM. Ensure it's added to index.cshtml.");

            return;

        }

        // Fill data safely

        document.getElementById("solAmountDisplay").innerText = checkout.amountSol ?? "0";

        document.getElementById("solUsdHint").innerText = checkout.message;

        document.getElementById("payAmt").innerText = checkout.amountSol ?? "0";

        document.getElementById("receiveAddress").innerText = checkout.receiveAddress ?? "";

        document.getElementById("orderMemo").innerText = checkout.memo ?? "";

        document.getElementById("solStatus").innerText =

            "Please use Phantom Wallet Only.";

 

        const uri = `solana:${checkout.receiveAddress}?amount=${checkout.amountSol}&memo=${checkout.memo}`;

        if (window.QRCode && document.getElementById("solQrCanvas")) {

            QRCode.toCanvas(document.getElementById("solQrCanvas"), uri, err => {

                if (err) console.error("QR Error:", err);

            });

        }

 

        document.getElementById("phantomPayBtn").onclick = async () => {

            await doPhantomPay(checkout);

        };

        document.getElementById("solModalClose").onclick = () => {

            modal.style.display = "none";

        };

        modal.style.display = "flex";

    }

 

    /*

    function showSolModal(checkout) {

 

        // Hide upgrade button

        //document.getElementById("upgradeBtn").style.display = "none";

 

        // build modal HTML (append to body or reuse existing modal)

 

        let modal = document.getElementById("solModal");

        if (!modal) {

            modal = document.createElement("div");

            modal.id = "solModal";

            modal.className = "sol-modal";

            modal.innerHTML = `

            <div class="sol-modal-inner">

                <button id="solModalClose" class="close-x">✕</button>

                <h2>Premium Access - 1 Month</h2>

                <div class="sol-amount"><span id="solAmountDisplay"></span> <small>SOL</small></div>

                <div class="sol-usd" id="solUsdHint"></div>

 

                <h3>What you get:</h3>

                <ul class="features">

                  <li>Access to Girls Only filter</li>

                  <li>Priority matching</li>

                  <li>Ad-free experience</li>

                  <li>30 days unlimited access</li>

                </ul>

 

                <label>Your Solana Wallet Address (optional, for convenience)</label>

                <input id="buyerWallet" placeholder="Enter your SOL wallet address (optional)">

 

                <div class="send-to">

                  <div>Send to:</div>

                  <div id="receiveAddress" class="receive-address"></div>

                </div>

                <div class="memo">Memo: <code id="orderMemo"></code></div>

 

                <div>

                  <button id="phantomPayBtn" class="pay-btn">Pay <span id="payAmt"></span> SOL</button>

                </div>

 

                <div id="solStatus" class="sol-status"></div>

                <canvas id="solQrCanvas"></canvas>

            </div>

        `;

            document.body.appendChild(modal);

            //modal.appendChild(div);

 

            modal.querySelector("#solModalClose").onclick = () => modal.style.display = "none";

        }

 

        modal.style.display = "flex";

        //scoped selectors avoid null

        modal.querySelector("#solAmountDisplay").innerText = checkout.amountSol;

        modal.querySelector("#payAmt").innerText = checkout.amountSol;

        modal.querySelector("#receiveAddress").innerText = checkout.receiveAddress;

        modal.querySelector("#orderMemo").innerText = checkout.memo;

        modal.querySelector("#solStatus").innerText = "Waiting for you to send the transaction (use Phantom or another wallet).";

 

        // QR code (solana:<addr>?amount=...)

        const uri = `solana:${checkout.receiveAddress}?amount=${checkout.amountSol}&memo=${checkout.memo}`;

        if (window.QRCode) {

            QRCode.toCanvas(document.getElementById("solQrCanvas"), uri, err => { if (err) console.error(err); });

        }

 

        // Phantom pay button

        modal.querySelector("#phantomPayBtn").onclick = async () => {

            await doPhantomPay(checkout);

        };

    }

    */

    // Build and send transaction via Phantom, then call server verify endpoint with tx signature

    async function doPhantomPay(checkout) {

        try {

            const solAmount = parseFloat(checkout.amountSol);

            const receiveAddress = checkout.receiveAddress;

            const memo = checkout.memo;

            const orderId = checkout.orderId;

            const statusEl = document.getElementById("solStatus");

            console.log("orderid=>", orderId);

            //check if phantom wallet is installed
            const provider = window.solana;
            if (!provider?.isPhantom) {
                alert("Phantom wallet not detected. Install Phantom Wallet on mobile or browser extension or use a wallet that supports memos.");
                throw new Error("Phantom wallet not found.");
            }


             // connect to user's phantom wallet and asks for approve this website
            await provider.connect();

            //get user's public wallete address
            const publicKey = window.solana.publicKey.toString();

            statusEl.innerText = `Connected to Phantom: ${publicKey}. Preparing transaction...`;
            
            //free public RPC from Helius 1,000,000 free credits     
            const connection = new solanaWeb3.Connection("https://mainnet.helius-rpc.com/?api-key=89838007-1176-4814-bdff-a6daa27649da", "confirmed");
            
            // ✅ New API: getLatestBlockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

            const fromPubkey =new solanaWeb3.PublicKey(window.solana.publicKey.toString());// window.solana.publicKey; //user's wallet

            const toPubkey = new solanaWeb3.PublicKey(receiveAddress); // my sol wallet

            
            //const lamports = Math.round(Number(solAmount) * solanaWeb3.LAMPORTS_PER_SOL);
            const lamports = BigInt(Math.round(solAmount * solanaWeb3.LAMPORTS_PER_SOL));
            //solanaWeb3.LAMPORTS_PER_SOL === 1000000000
            /*
            console.log("solAmount =", solAmount, "typeof", typeof solAmount);
            console.log("lamports =", lamports, "typeof", typeof lamports);
            console.log("fromPubkey base 58=", fromPubkey.toBase58());
            console.log("toPubkey  base 58=", toPubkey.toBase58());
            */
            
           // Create transaction
            const transaction = new solanaWeb3.Transaction({
                recentBlockhash: blockhash,
                feePayer: fromPubkey
            });
            // Add transfer instruction
            transaction.add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey,
                    toPubkey,
                    lamports
                })
            );

            //add memo
            if (memo) {
            const memoProgramId = new solanaWeb3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
            transaction.add(
                        new solanaWeb3.TransactionInstruction({
                            keys: [],
                            programId: memoProgramId,
                            data: Buffer.from(memo, "utf8")
                        })
                    );
            }

            // ✅ Sign and send via Phantom
            const signedTx = await provider.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTx.serialize());

             console.log("Signature:", signature);

             // ✅ Modern confirmation style
            const confirmation = await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            });

           if (confirmation.value.err) 
            {
                throw new Error("Transaction failed");
            }
            
            //alert(`✅ Payment successful!! , Please save this Signature: ${signature}`);
            console.log("🎉 web3 api Transaction confirmed!");

            statusEl.innerText = `✅ Transaction confirmed: ${signature}. Verifying server-side...`;
            statusEl.className = "text-green-600 text-sm";

            // Call server verify endpoint

            const verifyRes = await fetch("/api/solanapayments/verify", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json",

                    "Accept": "application/json"

                },
                
                body: JSON.stringify({

                    orderId: orderId,

                    txSig: signature

                })

            });

            const result = await verifyRes.json();

            console.log("result=>", result);

            if (verifyRes.ok && result.ok ) {

                statusEl.innerText = "✅ Payment verified successfully! Your plan is now active.";

                statusEl.className = "text-green-600 text-sm";

                //setTimeout(() => location.reload(), 1500);   //refresh-reload page

                //statusEl.innerText = "✅ Payment verified successfully! Your plan is now active.";

                // Optionally refresh user profile or update UI directly

                // we expect server to call SignalR PlanActivated

                //reloads the page after 1.5 secs

                setTimeout(() => location.reload(), 1500);

                //hide solModal

                setTimeout(() => {

                    document.getElementById("solModal").style.display = "none";

                }, 1000);
                /*
                //hide upgrade button

                if(upgradeBtn) upgradeBtn.style.display = "none";

                //hide GirlsOnly button

                if(girlsBtn) girlsBtn.style.display = "none";

                //show premiumBadge

               if (premiumBadge) premiumBadge.style.display = "inline-block";

                */

            } else {
                statusEl.innerText = `❌ Server verification failed. Please verify from profile tab, with signature ${signature}`;
                statusEl.className = "text-red-500 text-sm";
            }

        } catch (err) {

            console.error("Payment failed:", err);
            statusEl.innerText = `❌ Payment failed. Please try again.`;
            statusEl.className = "text-red-500 text-sm";
            //alert("Payment failed: " + (err.message || JSON.stringify(err)));

        }

    }

 //////////////Load plans modal//////////////

async function loadPlans() {

    try {

      
        //Upgrade Modal

        plansContainer.innerHTML = `<div class="loading">Loading plans...</div>`;

        const response = await fetch("/api/plans");

        const plans = await response.json();

        console.log("plans===>", plans);

        plansContainer.innerHTML = ""; // clear previous

        plans.forEach(plan => {

            const div = document.createElement("div");

            div.className = "plan-card";

            div.dataset.productid = plan.id;

            div.dataset.name = plan.name;

            div.dataset.amount = plan.price;

 

            div.innerHTML = `

                  <h3>${plan.name.replace("Plan", " Plan")}</h3>

                  <div class="features">${plan.features}</div>

                  <p style="text-align:center;">Save ${plan.savePercent}%</p>

                  <p class="price">$${plan.price.toFixed(2)}/~₹${plan.priceINR}</p>

                  <button class="buyBtn">Buy</button>

                `;

 

            plansContainer.appendChild(div);

        });

 

        // Attach buy event

        document.querySelectorAll(".buyBtn").forEach(btn => {

            btn.addEventListener("click", async (e) => {

                const card = e.target.closest(".plan-card");

                const productId = card.dataset.productid;

                const productName = card.dataset.name;

                const amount = card.dataset.amount;

 
                // Send to backend for purchase update

                await onBuySol(productId, productName);

                /* not using this anymore

                const res = await fetch("/api/plans/purchase", {

                    method: "POST",

                    headers: { "Content-Type": "application/json" },

                    body: JSON.stringify({

                        productId,

                        productName: planName,

                        totalAmount: amount

                    })

                });

 

                if (res.ok) {

                    alert("✅ Purchase successful!");

                    upgradeModal.style.display = "none";

                    location.reload();

                } else {

                    alert("❌ Purchase failed. Please try again.");

                }

 

                */

            });

        });

    } catch (err) {

        console.error("Error loading plans:", err);

        plansContainer.innerHTML = `<p style="color:red;">Error loading plans.</p>`;

    }

}

 

 

 

// Show modal

document.getElementById("upgradeBtn")?.addEventListener("click", () => {

    upgradeModal.style.display = "flex";

    loadPlans();

});

 

 

// Close modal

closeUpgradeModal.addEventListener("click", () => {

    upgradeModal.style.display = "none";

});

 

}

 

// Run when DOM is ready

document.addEventListener("DOMContentLoaded", initUpgradeAccessControl);