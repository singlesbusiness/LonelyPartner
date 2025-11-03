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

 

    // showUpgradeModal should render upgrade cards; when a SOL plan is selected call onBuySol(...)

    async function onBuySol(productId, productName) {

        //console.log("==>", productId, "===>", productName);

        // create order on server

        const res = await fetch("/api/SolanaPayments/create-order", {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ productId, productName })

        });

        if (!res.ok) {

            const txt = await res.text();

            alert("Create order failed: " + txt);

            return;

        }

        const data = await res.json();

        console.log("create-order response==>", data);

        //console.log(data.checkout.success);

        if (data.checkout.success != true) alert( "Failed to create order");

 

        //document.getElementById("solAmount").innerText = `${data.checkout.amountSol} SOL (~$${data.checkout.usd})`;

 

        const checkout = data.checkout;

        // Hide upgrade modal

        const upgradeModalEl = document.getElementById("upgradeModal");

        if (upgradeModalEl) upgradeModalEl.style.display = "none";

 

       

         showSolModal(checkout); // opens the modal and prepares UI

         /*

        // Now call showSolModal() to show payment popup

        if (typeof showSolModal === "function") {

            showSolModal(checkout);

        } else {

            console.error("showSolModal is not defined yet!");

        }

        */

    }

 

    function showSolModal(checkout) {

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

            "Please use Phantom Wallet Only. DO NOT forget to add Memo";

 

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

        const solAmount = parseFloat(checkout.amountSol);

        const receiveAddress = checkout.receiveAddress;

        const memo = checkout.memo;

        const statusEl = document.getElementById("solStatus");

 

        if (!window.solana || !window.solana.isPhantom) {

            alert("Phantom wallet not detected. Install Phantom extension or use a wallet that supports memos.");

            return;

        }

 

        try {

            // connect to user's phantom wallet and asks for approve this website

            await window.solana.connect();

            //get user's public wallete address

            const publicKey = window.solana.publicKey.toString();

            statusEl.innerText = `Connected to Phantom: ${publicKey}. Preparing transaction...`;

 

            // Use @solana/web3.js via CDN. Ensure you included <script src=https://unpkg.com/@solana/web3.js@1.65.1/lib/index.iife.js></script> in your layout

            const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

            //confirmed =>use finalized later

            // Build transaction: SystemProgram.transfer + Memo instruction

            const fromPubkey = window.solana.publicKey; //user's wallet

            const toPubkey = new solanaWeb3.PublicKey(receiveAddress); // my web app wallet

 

            const lamports = Math.round(solAmount * 1_000_000_000); // SOL -> lamports 1sol = 1,000,000,000 lamports

            const transferInstruction = solanaWeb3.SystemProgram.transfer({

                fromPubkey,

                toPubkey,

                lamports

            });

 

            // Memo instruction (program id: MemoSq4gq... ; use base58 of memo bytes)

            const memoProgramId = new solanaWeb3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

            const memoInstruction = new solanaWeb3.TransactionInstruction({

                keys: [],

                programId: memoProgramId,

                data: Buffer.from(memo, "utf8")

            });

 

            const tx = new solanaWeb3.Transaction().add(transferInstruction, memoInstruction);

            tx.feePayer = fromPubkey;

 

            // recent blockhash

            tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

 

            // Request user's Phantom to sign and send

            const signed = await window.solana.signTransaction(tx);

            //serialize and send to Solana

            const rawTx = signed.serialize();

            const sentSig = await connection.sendRawTransaction(rawTx, { skipPreflight: false, preflightCommitment: "confirmed" });

 

            statusEl.innerText = `Transaction submitted: ${sentSig}. Waiting for confirmation...`;

 

            // wait for confirmation

            const confirmation = await connection.confirmTransaction(sentSig, "finalized");

            if (!confirmation.value) {

                statusEl.innerText = "Confirmation failed or timed out.";

                return;

            }

 

            statusEl.innerText = `Transaction confirmed: ${sentSig}. Verifying server-side...`;

 

            // Call server verify endpoint

            const vRes = await fetch("/api/SolanaPayments/verify", {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify({ orderId: checkout.orderId, txSig: sentSig })

            });

 

            const vJson = await vRes.json();

            if (vRes.ok) {

                statusEl.innerText = "Payment verified! Premium activated.";

                // Optionally refresh user profile or update UI directly

                // we expect server to call SignalR PlanActivated

 

                //reloads the page after 1.5 secs

                setTimeout(() => location.reload(), 1500);

                /*

                //hide solModal

                setTimeout(() => {

                    document.getElementById("solModal").style.display = "none";

                }, 1000);

                //hide upgrade button

                if(upgradeBtn) upgradeBtn.style.display = "none";

                //hide GirlsOnly button

                if(girlsBtn) girlsBtn.style.display = "none";

                //show premiumBadge

                

                if (premiumBadge) premiumBadge.style.display = "inline-block";

                */

            } else {

                statusEl.innerText = "Server verification failed: " + JSON.stringify(vJson);

            }

 

        } catch (err) {

            console.error(err);

            alert("Payment failed: " + (err.message || JSON.stringify(err)));

        }

    }

 

 

 


 

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

                /*

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