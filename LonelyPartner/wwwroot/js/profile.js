// ===============================

// 🔹 Profile Button + Modal Logic

// ===============================

 

console.log("🧭 profileHandler.js loaded.");


document.addEventListener("DOMContentLoaded", async () => {

    console.log("🚀 DOM Ready in profileHandler.js");

 
        function isActivePlan() {
                if (!window.appUser?.isAuthenticated || !window.appUser?.endDate)
                    return false;

                const endDateLocal = new Date(window.appUser.endDate);
                const nowLocal = new Date();
                console.log("profile end date=>" , endDateLocal);
                console.log("profile nowLocal=>" , nowLocal);
                return (window.appUser.productId != 0) && (endDateLocal > nowLocal);
            }

        if (!window.appUser) {

            console.error("❌ window.appUser not loggedin.");

            return;

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

    console.log("📡 Fetching profile data for:", window.appUser.email);

        const email = window.appUser.email;

        if (!email) {

            alert("Cannot fetch profile — missing email");

            return;

        }

 

        try {

            const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);

            if (!response.ok) throw new Error("Profile fetch failed");

            const data = await response.json();

            console.log("✅ Profile data received:", data);
            console.log("date:", data.startDate);
            document.getElementById("profName").innerText = data.customerName || "N/A" ;

            document.getElementById("profEmail").innerText = data.customerEmail || "N/A" ;

            document.getElementById("profProductName").innerText = data.productName || "No Active Plan";

            if (data.productId == "0" )  {

                document.getElementById("profStart").innerText = "N/A";

                document.getElementById("profEnd").innerText = "N/A";

            }

            else {  
                    console.log("✅ Profile data received:", data);

                
/*
            if (data.endDate) {
                const endUtc = new Date(data.endDate + "Z");
                const endLocal = endUtc.toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });
                console.log("📅 end (UTC):", endUtc.toISOString());
                console.log("🕓 end (local):", endLocal);
                document.getElementById("profEnd").innerText = endLocal;
            } else {
                document.getElementById("profEnd").innerText = "—";
            }
*/

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
            console.log("✅ profileHandler.js fully loaded and parsed.");

        } catch (err) {

            console.error("❌ Failed to load profile:", err);

            alert("Could not load profile.");

        }
        console.log("✅ profileHandler.js fully loaded and parsed====.");
    });

    

    //  Close profile modal

    closeProfileModal.addEventListener("click", () => {

        profileModal.style.display = "none";

        //empty the signature verification text box

        txInput.value = "";

        statusMsg.textContent = "";

        //reloads the page after 1.5 secs

        setTimeout(() => location.reload(), 1000);

    });

});

 

