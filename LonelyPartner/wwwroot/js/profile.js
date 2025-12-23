// ===============================

// 🔹 Profile Button + Modal Logic

// ===============================

 

//console.log("🧭 profileHandler.js loaded.");


document.addEventListener("DOMContentLoaded", async () => {

    //console.log("🚀 DOM Ready in profileHandler.js");

 
        function isActivePlan() {
                if (!window.appUser?.isAuthenticated || !window.appUser?.endDate)
                    return false;

                const endDateLocal = new Date(window.appUser.endDate);
                const nowLocal = new Date();
                //console.log("profile end date=>" , endDateLocal);
                //console.log("profile nowLocal=>" , nowLocal);
                return (window.appUser.productId != 0) && (endDateLocal > nowLocal);
            }

        if (!window.appUser) {

            //console.error("❌ window.appUser not loggedin.");

            return;

        }

            //For paid member badge in local video
            if (isActivePlan()) {

                const badge = document.getElementById("localPremiumBadge");
                if (!badge || !window.appUser) return;
     
                badge.style.display = "inline-flex";

           }   
        //console.table(window.appUser);

 

    const profileBtn = document.getElementById("profileBtn");

    const profileModal = document.getElementById("profileModal");

    const closeProfileModal = document.getElementById("closeProfileModal");

    const txInput = document.getElementById("txSignatureInput");

    const statusMsg = document.getElementById("verifyStatusMsg");

 

    // 1️⃣ Show Profile Button if logged in

    if (window.appUser?.isAuthenticated === true) {

        if (profileBtn) profileBtn.style.display = "inline-block";

    } else {

        if (profileBtn) profileBtn.style.display = "none";

        return; // not logged in

    }

 

    // 2️⃣ Fetch and display profile when clicked

profileBtn.addEventListener("click", async () => {

    //console.log("📡 Fetching profile data for:", window.appUser.email);

        const email = window.appUser.email;

        if (!email) {

            //alert("Cannot fetch profile — missing email");
            
            showTabAlert();
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
                            <h3 style="color:#ffcc00; margin-bottom:12px;">⚠️ Session Moved</h3>
                            <p style="line-height:1.6;color:#ffcc00">
                                Cannot fetch profile — missing email.
                            </p>
                            <button id="profileLoadOkBtn" style="
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
                    #profileLoadOkBtn:hover {
                        background-color: #ffd633 !important;
                        transform: scale(1.05);
                    }
                `;
                document.head.appendChild(style);
                } else {
                modal.style.display = "flex";
                }

            document.getElementById("profileLoadOkBtn")?.addEventListener("click", () => {
                modal.style.display = "none";
                //reloads the page after 1.5 secs
                setTimeout(() => location.reload(), 200);
            });

            }
            ////////////////////////////////

            return;

        }

 

        try {

            const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);

            if (!response.ok) throw new Error("Profile fetch failed");

            const data = await response.json();

            //console.log("✅ Profile data received:", data);
            
            document.getElementById("profName").innerText = data.customerName || "N/A" ;

            document.getElementById("profEmail").innerText = data.customerEmail || "N/A" ;

            //document.getElementById("profProductName").innerText = data.productName || "No Active Plan";
            const profProductEl = document.getElementById("profProductName");

                if (!data || !data.productName) {
                    // No plan found
                    profProductEl.innerText = "No Active Plan";
                    profProductEl.style.color = "red";
                } else if (isActivePlan()) {
                    // Active plan
                    profProductEl.innerText = `${data.productName} (Active)`;
                    profProductEl.style.color = "green";
                } else {
                    // Inactive plan
                    profProductEl.innerText = `${data.productName} (Inactive)`;
                    profProductEl.style.color = "red";
                }

            if (data.productId == "0" )  {

                document.getElementById("profStart").innerText = "N/A";

                document.getElementById("profEnd").innerText = "N/A";

            }

            else {  
                    //console.log("✅ Profile data received:", data);

                


                    document.getElementById("profStart").innerText = data.startDate ? new Date(data.startDate + "Z")
                                                                                                            .toLocaleString('en-GB', {
                                                                                                            day: '2-digit',
                                                                                                            month: '2-digit',
                                                                                                            year: 'numeric',
                                                                                                            hour: '2-digit',
                                                                                                            minute: '2-digit',
                                                                                                            hour12: false,
                                                                                                            }) : "—";

                    document.getElementById("profEnd").innerText = data.endDate ? new Date(data.endDate + "Z")
                                                                                                    .toLocaleDateString('en-GB', {
                                                                                                            day: '2-digit',
                                                                                                            month: '2-digit',
                                                                                                            year: 'numeric',
                                                                                                            hour: '2-digit',
                                                                                                            minute: '2-digit',
                                                                                                            hour12: false,
                                                                                                            }) : "—";

                    //document.getElementById("profAmount").innerText = data.totalAmount ? `$${data.totalAmount}` : "—";
                }

            profileModal.style.display = "flex";
            //console.log("✅ profileHandler.js fully loaded and parsed.");

        } catch (err) {

            //console.error("❌ Failed to load profile:", err);

            //alert("Could not load profile.");
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
                                    <h3 style="color:#ffcc00; margin-bottom:12px;">⚠️ Session Moved</h3>
                                    <p style="line-height:1.6;color:#ffcc00">
                                        Could not load profile. Please login again.
                                    </p>
                                    <button id="profileLoadOkBtn" style="
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
                            #profileLoadOkBtn:hover {
                                background-color: #ffd633 !important;
                                transform: scale(1.05);
                            }
                        `;
                        document.head.appendChild(style);
                        } else {
                        modal.style.display = "flex";
                        }

                    document.getElementById("profileLoadOkBtn")?.addEventListener("click", () => {
                        modal.style.display = "none";
                        //reloads the page after 1.5 secs
                        setTimeout(() => location.reload(), 200);
                    });

            }
            ////////////////////////////////

        }
        //console.log("✅ profileHandler.js fully loaded and parsed====.");
    });

    

    //  Close profile modal

    closeProfileModal.addEventListener("click", () => {

        profileModal.style.display = "none";

        //empty the signature verification text box

        txInput.value = "";

        statusMsg.textContent = "";

        //reloads the page after 1.5 secs

        //setTimeout(() => location.reload(), 1000);

    });

});

 

