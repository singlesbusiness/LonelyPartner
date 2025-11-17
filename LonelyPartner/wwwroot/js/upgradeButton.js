// ===============================

// 🔹 Upgrade Button / GrielyOnly Button + Modal Logic + Payment

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

 
        if (girlsBtn) girlsBtn.style.display = "inline-block";
        if (upgradeBtn) upgradeBtn.style.display = "inline-block";

        [upgradeBtn, girlsBtn].forEach(el => {

            if (!el) return;

            el.addEventListener("click", showUpgradeModal);

        });

        return;

    }

    // 🔸 Condition 1: User not logged in

    else if (!isLoggedIn) {

        [upgradeBtn, girlsBtn].forEach(el => {

            if (!el) return;

            el.addEventListener("click", showLoginModal);

        });

 
        return;

    }

 

    // 🔸 Condition 3: Logged in and active plan

    else if (isLoggedIn && hasActivePlan) {

 

        // Hide upgrade  and girls only buttons
        if (girlsBtn) girlsBtn.style.display = "none";
        if (upgradeBtn) upgradeBtn.style.display = "none";

    }

    else {

        // Hide upgrade and girls only buttons
        if (girlsBtn) girlsBtn.style.display = "inline-block";
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
            //alert("Create order failed: Please try again.");
            showTabAlert();
                ////////////////////////////////
                // Display alert modal
                function showTabAlert() {
                        let modal = document.getElementById("tabAlertModal");
                        if (!modal) {
                            modal = document.createElement("div");
                            modal.id = "tabAlertModal";
                            modal.style.position = "fixed";
                            modal.style.top = 0;
                            modal.style.left = 0;
                            modal.style.width = "100%";
                            modal.style.height = "100%";
                            modal.style.background = "rgba(0, 0, 0, 0.6)";
                            modal.style.display = "flex";
                            modal.style.justifyContent = "center";
                            modal.style.alignItems = "center";
                            modal.style.zIndex = "9999";
                            modal.style.backdropFilter = "blur(3px)";

                            modal.innerHTML = `
                                <div style="
                                    background:#2e1065;
                                    color:#fff;
                                    padding:30px 35px;
                                    border-radius:14px;
                                    text-align:center;
                                    max-width:400px;
                                    width:90%;
                                    box-shadow:0 0 20px rgba(0,0,0,0.5);
                                    animation: fadeIn 0.3s ease;
                                    font-family: 'Segoe UI', Arial, sans-serif;
                                ">
                                    <h3 style="color:#ffcc00; margin-bottom:12px;">⚠️ Create Order</h3>
                                    <p style="line-height:1.6;">
                                        Create Order failed: Please try again.
                                    </p>
                                    <button id="createOrderfailBtn" style="
                                        margin-top:18px;
                                        background-color:#ffcc00;
                                        color:#2e1065;
                                        border:none;
                                        border-radius:6px;
                                        padding:10px 24px;
                                        font-weight:bold;
                                        cursor:pointer;
                                        transition: background-color 0.2s ease, transform 0.1s ease;
                                    ">
                                        Ok
                                    </button>
                                </div>
                            `;

                            document.body.appendChild(modal);

                            // Add fade-in animation dynamically
                            const style = document.createElement("style");
                            style.textContent = `
                            @keyframes fadeIn {
                                from { opacity: 0; transform: scale(0.95); }
                                to { opacity: 1; transform: scale(1); }
                            }
                            #createOrderfailBtn:hover {
                                background-color: #ffd633 !important;
                                transform: scale(1.05);
                            }
                        `;
                        document.head.appendChild(style);
                        } else {
                        modal.style.display = "flex";
                        }

                    document.getElementById("createOrderfailBtn")?.addEventListener("click", () => {
                        modal.style.display = "none";
                        //reloads the page after 1.5 secs
                        //setTimeout(() => location.reload(), 200);
                    });

            }

            return;

        }

        const data = await res.json();
        console.log("create-order response==>", data);

        //console.log(data.checkout.success);
        if (data.checkout.success != true) {
            console.log("Create order failed: " ,data.checkout.success );
            //alert("Create order failed: Please try again");
            showTabAlert();
                ////////////////////////////////
                // Display alert modal
                function showTabAlert() {
                        let modal = document.getElementById("tabAlertModal");
                        if (!modal) {
                            modal = document.createElement("div");
                            modal.id = "tabAlertModal";
                            modal.style.position = "fixed";
                            modal.style.top = 0;
                            modal.style.left = 0;
                            modal.style.width = "100%";
                            modal.style.height = "100%";
                            modal.style.background = "rgba(0, 0, 0, 0.6)";
                            modal.style.display = "flex";
                            modal.style.justifyContent = "center";
                            modal.style.alignItems = "center";
                            modal.style.zIndex = "9999";
                            modal.style.backdropFilter = "blur(3px)";

                            modal.innerHTML = `
                                <div style="
                                    background:#2e1065;
                                    color:#fff;
                                    padding:30px 35px;
                                    border-radius:14px;
                                    text-align:center;
                                    max-width:400px;
                                    width:90%;
                                    box-shadow:0 0 20px rgba(0,0,0,0.5);
                                    animation: fadeIn 0.3s ease;
                                    font-family: 'Segoe UI', Arial, sans-serif;
                                ">
                                    <h3 style="color:#ffcc00; margin-bottom:12px;">⚠️ Create Order</h3>
                                    <p style="line-height:1.6;">
                                        Create Order failed: Please try again.
                                    </p>
                                    <button id="createOrderfailBtn1" style="
                                        margin-top:18px;
                                        background-color:#ffcc00;
                                        color:#2e1065;
                                        border:none;
                                        border-radius:6px;
                                        padding:10px 24px;
                                        font-weight:bold;
                                        cursor:pointer;
                                        transition: background-color 0.2s ease, transform 0.1s ease;
                                    ">
                                        Ok
                                    </button>
                                </div>
                            `;

                            document.body.appendChild(modal);

                            // Add fade-in animation dynamically
                            const style = document.createElement("style");
                            style.textContent = `
                            @keyframes fadeIn {
                                from { opacity: 0; transform: scale(0.95); }
                                to { opacity: 1; transform: scale(1); }
                            }
                            #createOrderfailBtn1:hover {
                                background-color: #ffd633 !important;
                                transform: scale(1.05);
                            }
                        `;
                        document.head.appendChild(style);
                        } else {
                        modal.style.display = "flex";
                        }

                    document.getElementById("createOrderfailBtn1")?.addEventListener("click", () => {
                        modal.style.display = "none";
                        //reloads the page after 1.5 secs
                        //setTimeout(() => location.reload(), 200);
                    });

            }
        }

        //document.getElementById("solAmount").innerText = `${data.checkout.amountSol} SOL (~$${data.checkout.usd})`;

        const checkout = data.checkout;
        //console.log("before solModal data=>" , checkout);
        // Hide upgrade modal

        const upgradeModalEl = document.getElementById("upgradeModal");

        if (upgradeModalEl) upgradeModalEl.style.display = "none";

      showSolModal(checkout); // opens the modal and prepares UI
  }

 

    function showSolModal(checkout) {
        //console.log("solModal data=>" , checkout);
        //orderId
        const orderId = checkout.orderId;
        //MainnetHeliusRPC
        const mainnetHeliusRPC = checkout.mainnetHeliusRPC;
        //console.log("mainnetHeliusRPC in solmodal=>", mainnetHeliusRPC);

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

            "Install Phantom Wallet browser extension or Phantom Wallet app on mobile.";

 

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

 

    // Build and send transaction via Phantom, then call server verify endpoint with tx signature

    async function doPhantomPay(checkout) {

        const statusEl = document.getElementById("solStatus");

        try {

            const solAmount = parseFloat(checkout.amountSol);

            const receiveAddress = checkout.receiveAddress;

            const heliusurlwithkey = checkout.mainnetHeliusRPC;

            const memo = checkout.memo;

            const orderId = checkout.orderId;

            //console.log("orderid=>", orderId);
            //console.log("receiveAddress=>", receiveAddress);
            //console.log("heliusurlwithkey=>", heliusurlwithkey);

                // -----------------------------
                // 🧩 Detect Phantom Wallet
                // -----------------------------
                const provider = window?.phantom?.solana || window?.solana;
                if (!provider) {
                    // 📱 On mobile, try deep linking to Phantom app
                    if (/Mobi|Android/i.test(navigator.userAgent)) {
                        const dappUrl = encodeURIComponent(window.location.href);
                        const deepLink = `https://phantom.app/ul/browse/${dappUrl}`;
                        //alert("Redirecting to Phantom app...");

                        showTabAlert();
                    ////////////////////////////////
                        // Display alert modal
                    function showTabAlert() {
                        let modal = document.getElementById("tabAlertModal");
                        if (!modal) {
                            modal = document.createElement("div");
                            modal.id = "tabAlertModal";
                            modal.style.position = "fixed";
                            modal.style.top = 0;
                            modal.style.left = 0;
                            modal.style.width = "100%";
                            modal.style.height = "100%";
                            modal.style.background = "rgba(0, 0, 0, 0.6)";
                            modal.style.display = "flex";
                            modal.style.justifyContent = "center";
                            modal.style.alignItems = "center";
                            modal.style.zIndex = "9999";
                            modal.style.backdropFilter = "blur(3px)";

                            modal.innerHTML = `
                                <div style="
                                    background:#2e1065;
                                    color:#fff;
                                    padding:30px 35px;
                                    border-radius:14px;
                                    text-align:center;
                                    max-width:400px;
                                    width:90%;
                                    box-shadow:0 0 20px rgba(0,0,0,0.5);
                                    animation: fadeIn 0.3s ease;
                                    font-family: 'Segoe UI', Arial, sans-serif;
                                ">
                                    <h3 style="color:#ffcc00; margin-bottom:12px;">⚠️ Phantom Wallet</h3>
                                    <p style="line-height:1.6;">
                                        Redirecting to Phantom Wallet.
                                    </p>
                                    <button id="redirectToWalletBtn" style="
                                        margin-top:18px;
                                        background-color:#ffcc00;
                                        color:#2e1065;
                                        border:none;
                                        border-radius:6px;
                                        padding:10px 24px;
                                        font-weight:bold;
                                        cursor:pointer;
                                        transition: background-color 0.2s ease, transform 0.1s ease;
                                    ">
                                        Ok
                                    </button>
                                </div>
                            `;

                                    document.body.appendChild(modal);

                                    // Add fade-in animation dynamically
                                    const style = document.createElement("style");
                                    style.textContent = `
                                    @keyframes fadeIn {
                                        from { opacity: 0; transform: scale(0.95); }
                                        to { opacity: 1; transform: scale(1); }
                                    }
                                    #redirectToWalletBtn:hover {
                                        background-color: #ffd633 !important;
                                        transform: scale(1.05);
                                    }
                                `;
                                document.head.appendChild(style);
                                } else {
                                modal.style.display = "flex";
                                }

                            document.getElementById("redirectToWalletBtn")?.addEventListener("click", () => {
                                modal.style.display = "none";
                                window.location.href = deepLink;
                                //reloads the page after 1.5 secs
                                //setTimeout(() => location.reload(), 200);
                            });

                            }
                        
                        return;
                    }

                    // 💻 No Phantom detected on desktop
                    //alert("Phantom Wallet not detected. Please install it to continue.");
                            showTabAlert();
                    ////////////////////////////////
                        // Display alert modal
                    function showTabAlert() {
                        let modal = document.getElementById("tabAlertModal");
                        if (!modal) {
                            modal = document.createElement("div");
                            modal.id = "tabAlertModal";
                            modal.style.position = "fixed";
                            modal.style.top = 0;
                            modal.style.left = 0;
                            modal.style.width = "100%";
                            modal.style.height = "100%";
                            modal.style.background = "rgba(0, 0, 0, 0.6)";
                            modal.style.display = "flex";
                            modal.style.justifyContent = "center";
                            modal.style.alignItems = "center";
                            modal.style.zIndex = "9999";
                            modal.style.backdropFilter = "blur(3px)";

                            modal.innerHTML = `
                                <div style="
                                    background:#2e1065;
                                    color:#fff;
                                    padding:30px 35px;
                                    border-radius:14px;
                                    text-align:center;
                                    max-width:400px;
                                    width:90%;
                                    box-shadow:0 0 20px rgba(0,0,0,0.5);
                                    animation: fadeIn 0.3s ease;
                                    font-family: 'Segoe UI', Arial, sans-serif;
                                ">
                                    <h3 style="color:#ffcc00; margin-bottom:12px;">⚠️ Phantom Wallet</h3>
                                    <p style="line-height:1.6;">
                                        Phantom Wallet not detected. Please install it to continue..
                                    </p>
                                    <button id="noWalletBtn" style="
                                        margin-top:18px;
                                        background-color:#ffcc00;
                                        color:#2e1065;
                                        border:none;
                                        border-radius:6px;
                                        padding:10px 24px;
                                        font-weight:bold;
                                        cursor:pointer;
                                        transition: background-color 0.2s ease, transform 0.1s ease;
                                    ">
                                        Ok
                                    </button>
                                </div>
                            `;

                            document.body.appendChild(modal);

                            // Add fade-in animation dynamically
                            const style = document.createElement("style");
                            style.textContent = `
                            @keyframes fadeIn {
                                from { opacity: 0; transform: scale(0.95); }
                                to { opacity: 1; transform: scale(1); }
                            }
                            #noWalletBtn:hover {
                                background-color: #ffd633 !important;
                                transform: scale(1.05);
                            }
                        `;
                        document.head.appendChild(style);
                        } else {
                        modal.style.display = "flex";
                        }

                    document.getElementById("noWalletBtn")?.addEventListener("click", () => {
                        modal.style.display = "none";
                        window.open("https://phantom.app/", "_blank");
                        //reloads the page after 1.5 secs
                        setTimeout(() => location.reload(), 200);
                    });

                    }
                    //window.open("https://phantom.app/", "_blank");
                    throw new Error("Phantom wallet not found.");
                }

            // -----------------------------
            // 🔐 Connect to Phantom Wallet
            // -----------------------------
            let connectResponse;
            try {
                    connectResponse = await provider.connect({ onlyIfTrusted: false });
                } catch (e) {
                    if (e.message?.includes("User rejected")) {
                        statusEl.innerText = "❌ Wallet connection cancelled by user.";
                        return;
                    }
                    throw e;
                }

                const publicKey = connectResponse?.publicKey?.toString() || provider.publicKey?.toString();
                if (!publicKey) throw new Error("Failed to get Phantom public key.");

                console.log("✅ Connected Phantom wallet:", publicKey);
            /*
            *************************Working for desktop START***********
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
            //********************Working for desktop END*******************************
            */
            statusEl.innerText = `Connected to Phantom: ${publicKey}. Preparing transaction...`;
            
            //*******VERY IMPORTANT*********/
            //free public RPC from Helius 1,000,000 free credits.
            //after the credits are reached, login with a new gmail and get the new api-key
            //from https://mainnet.helius-rpc.com  
            //Update Wallete DB record Value whose Name is  MainnetHeliusRPC, with new gmail-account
            //you will get new key url.
            //console.log("heliusurlwithkey=>", heliusurlwithkey);
            //const connection = new solanaWeb3.Connection("https://mainnet.helius-rpc.com/?api-key=89838007-1176-4814-bdff-a6daa27649da", "confirmed");
            const connection = new solanaWeb3.Connection(heliusurlwithkey, "confirmed");
            
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

                
                // Optionally refresh user profile or update UI directly

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

                

                });

            });

        } catch (err) {

            console.error("Error loading plans:", err);

            plansContainer.innerHTML = `<p style="color:red;">Error loading plans.</p>`;

        }

}

 
        /*
        // Show Upgrade modal on girlsOnly button and upgrade button

        document.getElementById("girlsBtn")?.addEventListener("click", () => {

            upgradeModal.style.display = "flex";

            loadPlans();

        });

        document.getElementById("upgradeBtn")?.addEventListener("click", () => {

            upgradeModal.style.display = "flex";

            loadPlans();

        });   */

        
        // Close Upgrade modal , closeUpgradeModal

        closeUpgradeModal.addEventListener("click", () => {

            upgradeModal.style.display = "none";

        });

 

}

 

// Run when DOM is ready

document.addEventListener("DOMContentLoaded", initUpgradeAccessControl);