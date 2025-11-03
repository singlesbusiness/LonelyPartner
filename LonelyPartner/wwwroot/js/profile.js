// ===============================

// 🔹 Profile Button + Modal Logic

// ===============================

 

console.log("🧭 profileHandler.js loaded.");

 

document.addEventListener("DOMContentLoaded", async () => {

    console.log("🚀 DOM Ready in profileHandler.js");

 

    function isActivePlan() {

        if (!window.appUser

            || !window.appUser.productId || window.appUser.productId === 0

        ) {

            return false;

        }

        //return true;

 

        const now = new Date();

        const endDate = new Date(window.appUser.endDate);

        return endDate > now;

    }

if (!window.appUser) {

    console.error("❌ window.appUser not loggedin.");

    return;

}

 

console.table(window.appUser);

 

 

///

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

 

            document.getElementById("profName").innerText = data.customerName || "N/A" ;

            document.getElementById("profEmail").innerText = data.customerEmail || "N/A" ;

            document.getElementById("profProductName").innerText = data.productName || "No Active Plan";

            if (data.productId == "0" )  {

                document.getElementById("profStart").innerText = "N/A";

                document.getElementById("profEnd").innerText = "N/A";

            }

            else {

               

                    document.getElementById("profStart").innerText = data.startDate ? new Date(data.startDate).toLocaleString() : "—";

                    document.getElementById("profEnd").innerText = data.endDate ? new Date(data.endDate).toLocaleString() : "—";

                    //document.getElementById("profAmount").innerText = data.totalAmount ? `$${data.totalAmount}` : "—";

               

            }

            profileModal.style.display = "flex";

        } catch (err) {

            console.error("❌ Failed to load profile:", err);S

            alert("Could not load profile.");

        }

    });

 

    //  Close profile modal

    closeProfileModal.addEventListener("click", () => {

        profileModal.style.display = "none";

        //empty the text box

        txInput.value = "";

        statusMsg.textContent = "";

        //reloads the page after 1.5 secs

        setTimeout(() => location.reload(), 1500);

    });

});

 

