// ===============================

// 🔹 Upgrade Button / GrielyOnly Button + Modal Logic + Payment

// ===============================

 

//console.log("🧭 upgradeButton.js loaded.");

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
                //console.log("upgrade end date=>" , endDateLocal);
                //console.log("upgrade nowLocal=>" , nowLocal);
                return (window.appUser.productId != 0) && (endDateLocal > nowLocal);
            }
 
    //check if user is on mobile        
    function isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
    }

    //reusing the alert modal
    function createModal({ message, buttonText, modalHeader, onClick }) {
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
                <h3 style="color:#ffcc00; margin-bottom:12px;">⚠️ ${modalHeader}</h3>
                <p style="line-height:1.6;color:#ffcc00">${message}</p>
                <button id="modalButton" style="
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
                    ${buttonText}
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        const style = document.createElement("style");
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            #modalButton:hover {
                background-color: #ffd633 !important;
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);
    } else {
        modal.style.display = "flex";
    }

    document.getElementById("modalButton")?.addEventListener("click", () => {
        modal.style.display = "none";
        if (onClick) onClick();
    });
}


// Helper: format SOL amount as a decimal string safe for Phantom deep links
function formatSol(sol) {
  // Accept numbers or numeric strings
  const n = Number(sol);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid SOL amount");
  // Use 9 decimals (Solana precision). toFixed avoids scientific notation for small numbers.
  // Then trim trailing zeros and possible trailing dot.
  return n
    .toFixed(9)         // fixed to 9 decimal places
    .replace(/(?:\.0+|(\.\d+?)0+)$/, "$1") // trim trailing zeros, leave at least one decimal if needed
    .replace(/\.$/, ""); // remove trailing dot if any
}


    //load upgrade modal in backgroud

    loadPlans();

    function showLoginModal() {

        loginModal.style.display = "flex";

    }

 

    function showUpgradeModal() {

        const upgradeModal = document.getElementById("upgradeModal");

        upgradeModal.style.display = "flex";

        //if (typeof loadPlans === "function") loadPlans();

    }
    
    /* close upgrade modal*/
    closeUpgradeModal?.addEventListener("click", () => {

            upgradeModal.style.display = "none";

        });

 

    const isLoggedIn = window.appUser?.isAuthenticated === true;

    const hasActivePlan = isActivePlan();

    //const hasActivePlan = window.appUser?.hasPlan === false;

    //console.log("Upgrade button===> isLoggedIn=>", isLoggedIn, "==hasActivePlan=>", hasActivePlan);


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
            //console.log("Create order failed: " + txt);
            //alert("Create order failed: Please try again."); 

             createModal({
                            message: "Create Order failed: Please try again.",
                            buttonText: "Ok",
                            modalHeader: "Create Order",
                            //onClick: () => modal.style.display = "none",
                        });

            return;

        }

        const data = await res.json();
        //console.log("create-order response==>", data);

        //console.log(data.checkout.success);
        if (data.checkout.success != true) {
            //console.log("Create order failed: " ,data.checkout.success );
            //alert("Create order failed: Please try again");
            createModal({
                            message: "Create Order failed: Please try again.",
                            buttonText: "Ok",
                            modalHeader: "Create Order",
                            //onClick: () => modal.style.display = "none",
                        });
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
                //console.log("provider==>",   provider);
                if (!provider) {
                   

                   
                        // 📱 On mobile, try deep linking to Phantom app
                        if (isMobile()) {
                        // Prepare Phantom universal link to open the app's transfer UI.
                        // This opens the Phantom app with a prefilled transfer (user must approve inside the Phantom mobile app).
                        // note: we cannot retrieve a signature automatically if the provider is not injected,
                        // so we ask the user to copy/paste the tx signature or we poll for a matching tx (optional).
                        try{
                        const recipient = receiveAddress;      // REQUIRED
                        const amountStr = formatSol(checkout.amountSol); // REQUIRED
                        const memoMb = memo || "";
                        const label = checkout.label || "Payment";
                        const heliusurl = heliusurlwithkey; // helium url with key

                        // Phantom needs a single reference[] param
                        const reference =
                        (typeof crypto !== "undefined" && crypto.randomUUID)
                            ? crypto.randomUUID()
                            : "ref-" + Math.random().toString(36).slice(2, 12);

                        // Save for post-transaction verification
                            localStorage.setItem("phantom_reference", reference);
                            localStorage.setItem("phantom_orderId", checkout.orderId || "");

                            // Build the URL to wwwroot/send.html with query params
                                const sendPageUrl = new URL("https://lonelypartner.com/send.html");
                                sendPageUrl.searchParams.set("recipient", recipient);
                                sendPageUrl.searchParams.set("amount", amountStr);
                                sendPageUrl.searchParams.set("memo", memoMb);
                                sendPageUrl.searchParams.set("label", label);
                                sendPageUrl.searchParams.set("reference", reference);
                                sendPageUrl.searchParams.set("heliusurl", heliusurl);

                                //console.log("Send page URL:", sendPageUrl.toString());
                        
                            // ------------------------------------------------------
                            // Must be triggered by a user gesture (button click)
                            // ------------------------------------------------------
                            createModal({
                                modalHeader: "Open in Phantom App",
                                message: `Copy the URL below and open it inside Phantom Wallet → Search Icon at bottom right → paste URL → pay inside the Phantom in-app browser.`,
                                buttonText: "Copy URL",
                                onClick: () => {
                                    navigator.clipboard.writeText(sendPageUrl.toString())
                                        .then(() => {
                                            alert("URL copied! Open Phantom and paste it in the in-app browser.");

                                            // ➜ After copying URL, show a second step inside modal
                                            showSignatureVerificationUI(orderId);
                                        })
                                        .catch(err => alert("Failed to copy: " + err));
                                },
                            });


                            return;  

                            } catch (e) {
                                //console.error("❌ Phantom deeplink error:", e);
                                statusEl.innerText =  "❌ Payment failed, please try again.";
                            }
                        
                        }

                         // 💻 No Phantom detected on desktop
                         //alert("Phantom Wallet not detected. Please install it to continue.");
                        else
                            {
                                createModal({
                                    message: "Phantom Wallet not detected. Please install it to continue.",
                                    buttonText: "Ok",
                                    modalHeader: "Phantom Wallet",
                                    onClick: () => window.open("https://phantom.app/", "_blank"),
                                });
                         }
                            return;      // Exit function if Phantom is not detected
                    
                    
                        //throw new Error("Phantom wallet not found.");
                        
                    }
                

            // -----------------------------
            // 🔐 Connect to Phantom Wallet
            // -----------------------------
            let connectResponse;
            try {
                    // only for desktop, mobile users, flow goes to send.html above
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

                //console.log("✅ Connected Phantom wallet:", publicKey);
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

            let signature = null;
            
           
            // ✅ Sign and send via Phantom for desktop
            const signedTx = await provider.signTransaction(transaction);
            //using Helius
            const txsignaturedesktop = await connection.sendRawTransaction(signedTx.serialize());
            signature = txsignaturedesktop ;
            //console.log("dt TransactionSignature:", signature);
             
            
             
             // ✅ Modern confirmation style using Helius
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
            //console.log("🎉 web3 api Transaction confirmed!");

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

            //console.log("result=>", result);

            if (verifyRes.ok && result.ok ) {

                statusEl.innerText = "✅ Payment verified successfully! Your plan is now active.";

                statusEl.className = "text-green-600 text-sm";

                
                // Optionally refresh user profile or update UI directly

                //reloads the page after 2 secs, so user can notice his active plan with no GirlsOnly button

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

            if (err.message?.includes("User rejected")) {
                statusEl.innerText = "❌ Transaction rejected by User.";
                statusEl.className = "text-red-500 text-sm"; 
               
            }
            else{
                //console.error("Payment failed:", err);
                statusEl.innerText = `❌ Payment failed. Please try again.`;
                statusEl.className = "text-red-500 text-sm";
            }
           
        }

    }

////////////mobile payment asking for signatiure from Phantom in-app browser alert after successful payment/////////////////////
function showSignatureVerificationUI(orderId) {

    // Try get modal body
    let modalBody = document.querySelector(".modal-body");

    // If not found, create minimal modal structure
    if (!modalBody) {
        //console.warn("⚠ .modal-body not found — creating fallback modal.");

        let wrapper = document.createElement("div");
        wrapper.id = "phantomVerifyModal";
        wrapper.style.cssText = `
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.7); display:flex; justify-content:center;
            align-items:center; z-index:99999; padding:20px;
        `;

        wrapper.innerHTML = `
            <div style="
                background:#2e1065; padding:25px; border-radius:12px;
                width:90%; max-width:420px; color:white;
            ">
                <h3 style="margin-top:0; color:#ffcc00;">
                    Verify Phantom Payment
                </h3>
                <div class="modal-body"></div>
            </div>
        `;

        document.body.appendChild(wrapper);
        modalBody = wrapper.querySelector(".modal-body");
    }

    // Now modalBody is guaranteed to exist
    modalBody.innerHTML = `
        <p style="font-size:15px;margin-top:15px;color:#fff">
            After completing payment inside Phantom, it will show a <b>Transaction Signature</b>.<br><br>
            Paste it below to verify your payment:
        </p>

       
        
        <input id="mobileSigInput" 
       placeholder="Paste transaction signature"
       style="width:100%; padding:12px; margin-top:10px; font-size:16px; color:#000;">


        <button id="mobileVerifyBtn"
            style="width:100%; margin-top:15px; padding:12px; background:#4CAF50; color:white; font-size:18px; border:none; border-radius:6px;">
            Verify Payment
        </button>

        <button id="mobileCloseBtn"
            style="width:100%; margin-top:10px; padding:12px; background:#777; color:white; font-size:16px; border:none; border-radius:6px;">
            Close
        </button>

        <p id="mobileVerifyStatus" style="margin-top:15px; color:#fff"></p>
    `;

    // Apply placeholder styling safely
    const input = document.getElementById("mobileSigInput");
    if (input) {
        input.style.color = "#000"; // typed text = black
        const style = document.createElement("style");
        style.textContent = `
            #mobileSigInput::placeholder {
                color: #fff !important;
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    // FIX: Do NOT call verifyMobilePayment(orderId) immediately.
    document.getElementById("mobileVerifyBtn").onclick = () =>
        verifyMobilePayment(orderId);

    document.getElementById("mobileCloseBtn").onclick = () => {
        const wrapper = document.getElementById("phantomVerifyModal");
        if (wrapper) wrapper.remove();
            //hide solModal
                setTimeout(() => {
                    document.getElementById("solModal").style.display = "none";
                    }, 2000);
            //reloads the page after 2 secs, so user can notice his active plan with no GirlsOnly button
                setTimeout(() => location.reload(), 2500);
    };
}



/////////Verify mobile payment//////////////////////////////
async function verifyMobilePayment(orderId) {
    const sig = document.getElementById("mobileSigInput").value.trim();
    const orderIdMb = orderId; // comes from create-order api

    if (!sig) {
            createModal({
                                message: "Please paste the transaction signature.",
                                buttonText: "Ok",
                                modalHeader: "Phantom Wallet",
                                //onClick: () => modal.style.display = "none",
                            });
        return;
    }

    const statusElMb = document.getElementById("mobileVerifyStatus");
    statusElMb.innerText = "Verifying on Solana blockchain… please wait...";

    try {
        //call verify-mobile API in SolanaPaymentscontroller
        const response = await fetch("/api/solanapayments/verify-mobile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: orderIdMb, txSig: sig })

        });

        const json = await response.json();

        if (json.ok) {
            statusElMb.innerText = "✅ Payment verified successfully! Your plan is now active.";
            statusElMb.className = "text-green-600 text-sm";
            //solmodal inner text
            statusEl.innerText = "✅ Payment verified successfully! Your plan is now active.";
            statusEl.className = "text-green-600 text-sm";

            //user clicks close button, then  we wait for 2 secs and
            //close solmodal, in event mobileCloseBtn above

            

        } 
        else {
                statusElMb.innerText = `❌ Payment failed. Please try again.`;
                statusElMb.className = "text-red-500 text-sm";
        }
    }
    catch (err) {
                 //console.error("Payment failed:", err);
                statusElMb.innerText = `❌ Payment failed. Please try again.`;
                statusElMb.className = "text-red-500 text-sm";
                //solmodal iner text
                statusEl.innerText = `❌ Payment failed. Please try again.`;
                statusEl.className = "text-red-500 text-sm";
        
    }
}

 //////////////Load plans modal- upgrade modal//////////////

async function loadPlans() {

    try {

            //Upgrade Modal

            plansContainer.innerHTML = `<div class="upgrademodal">Loading plans...</div>`;

            const response = await fetch("/api/plans");

            const plans = await response.json();

            //console.log("plans===>", plans);
            // Sort plans by plan.id to ensure they are in the correct order (ascending)
            plans.sort((a, b) => a.id - b.id);

            plansContainer.innerHTML = ""; // clear previous

            //plans.forEach(async plan => {
                // Loop through each plan to create a plan card
            for (const plan of plans) {
                
                ////////////////
                let tagline = "";
                let badge = "";
                
                switch (plan.name.toLowerCase()) {
                    
                    case "hourplan":
                        tagline = "⭐ Cheapest premium access";
                        badge = `<span class="badge cheap">Cheapest</span>`;
                        
                        break;

                    case "dayplan":
                        tagline = "📈 For short premium sessions";
                        badge = `<span class="badge quick">Quick Upgrade</span>`;
                        break;

                    case "weekplan":
                        tagline = "🔥 Most purchased";
                        badge = `<span class="badge popular">Most Popular</span>`;
                        break;

                    case "monthplan":
                        tagline = "💰 Best value";
                        badge = `<span class="badge value">Best Value</span>`;
                        break;
                        case "yearplan":
                        tagline = "💎 Unlock all features for the entire year";
                        badge = `<span class="badge best">Top Tier</span>`;
                        break;
                }
                /////////////////

                const div = document.createElement("div");

                div.className = "plan-card";

                div.dataset.productid = plan.id;

                div.dataset.name = plan.name;

                div.dataset.amount = plan.price;
                ////get real time INR value start////
                
                    // Construct the API URL with the usdAmount as a query parameter
                    const inrresponse =  await fetch(`/api/plans/inrofusd?usdAmount=${plan.price.toFixed(2)}`);
                    
                    
                    // Check if the response is successful
                    if (!inrresponse.ok) {
                        //do not throw error as we can use default values from appsetting
                        console.log("failed to get INR vlaue of USD");
                    }

                    // Parse the response body to get the INR amount not asyn to keep the order ot cards
                    const inrAmount =  await inrresponse.json();

                    // Log the INR amount to the console
                    //console.log("INR Amount:", inrAmount);

                ///end////
                //was after feature
                //<p style="text-align:center;">Save ${plan.savePercent}%</p>

                div.innerHTML = `

                    <h3>${plan.name.replace("Plan", " Plan")}</h3>

                    <div class="features">${plan.features}</div>

                    <p class="tagline">${tagline}</p>

                    <p class="price">$${plan.price.toFixed(2)}/₹${inrAmount ? inrAmount.toFixed(2) : plan.priceINR}</p>

                    <button class="buyBtn">Buy</button>

                    `;

                plansContainer.appendChild(div);

        //});
                }

 

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