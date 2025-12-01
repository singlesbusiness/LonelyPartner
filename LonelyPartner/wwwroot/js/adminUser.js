// ===============================

// 🔹 Admin Button  Logic

// ===============================

//=======Wallet details==================


                async function updateSolKey(newKey) {
                    console.log("update address");
                    try{
                            if (!confirm("⚠️ Changing the Solana address will redirect all new payments. Proceed?"))
                                return;

                            const res = await fetch("/api/wallet/solkey/update", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ newKey })
                            });

                            const data = await res.json();
                            alert(data.message || "✅ Solana public key updated.");
                            
                            await loadSolKey(); // refresh displayed key
                        } catch (err) {
                            console.error("❌ updateSolKey() failed:", err);
                            alert("Error updating Solana public key. Check console.");
                            }
                        }
                    
                    
                    async function loadSolKey() {
                        
                            console.log("get address");
                            try {
                                const res = await fetch("/api/wallet/solkey");
                                if (!res.ok) {
                                    console.error("Failed to load SolKey:", res.status);
                                    return;
                                }
                                const text = await res.text();
                                if (!text) {
                                    console.warn("Empty response");
                                    return;
                                }
                                const data = JSON.parse(text);
                                console.log("get address==", data);
                                document.getElementById("solKey").textContent = data.solanaPublicKey || "(none)";
                            } catch (err) {
                                console.error("Error fetching SolKey:", err);
                            }
                        }
    //======================================
    //==============for helius url==========
         async function updateHeliusURL(newKey) {
                    console.log("update HeliusURL");
                    try{
                            if (!confirm("⚠️ Changing Helius URL will impact Solana payments. Proceed?"))
                                return;

                            const res = await fetch("/api/wallet/heliusurl/update", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ newKey })
                            });

                            const data = await res.json();
                            alert(data.message || "✅ Helius URL updated.");
                            
                            await loadHeliusURL(); // refresh displayed key
                        } catch (err) {
                            console.error("❌ updateHeliusURL() failed:", err);
                            alert("Error updating Helius URL. Check console.");
                            }
                        }
                    
                    
                    async function loadHeliusURL() {
                        
                            console.log("get helius url");
                            try {
                                const res = await fetch("/api/wallet/heliusurl");
                                if (!res.ok) {
                                    console.error("Failed to load Helius url:", res.status);
                                    return;
                                }
                                const text = await res.text();
                                if (!text) {
                                    console.warn("Empty response");
                                    return;
                                }
                                const data = JSON.parse(text);
                                console.log("get helius url==", data);
                                document.getElementById("heliusurl").textContent = data.heliusURL || "(none)";
                            } catch (err) {
                                console.error("Error fetching Helius URL:", err);
                            }
                        }
    //======================================

    
 
document.addEventListener("DOMContentLoaded", async () => {
    console.log("adminUser.js script loaded ✅");

    // Wait until DOM has the wallet buttons
    const refreshKeyBtn = document.getElementById("refreshKey");
    const changeKeyBtn = document.getElementById("changeKey");
    const refreshHeliusURLBtn = document.getElementById("refreshHeliusURL");
    const changeHeliusURLBtn = document.getElementById("changeHeliusURL");


    // Attach wallet button handlers (if present)
    if (refreshKeyBtn && changeKeyBtn) {
        refreshKeyBtn.addEventListener("click", loadSolKey);
        changeKeyBtn.addEventListener("click", async () => {
            const newKey = prompt("Enter new Solana key:");
            if (newKey) await updateSolKey(newKey);
        });
    }

    // Attach helius button handlers (if present)
    if (refreshHeliusURLBtn && changeHeliusURLBtn) {
        refreshHeliusURLBtn.addEventListener("click", loadHeliusURL);
        changeHeliusURLBtn.addEventListener("click", async () => {
            const newKey = prompt("Enter new Helius URL with key:");
            if (newKey) await updateHeliusURL(newKey);
        });
    }

   

    if (window.appUser.isAuthenticated === true)

        {
            const adminBtn = document.getElementById("adminBtn");

                    if (!adminBtn) return;

                    try {

                        const response = await fetch("/api/user/role", {

                            method: "GET",

                            credentials: "include" // needed if using Google cookies

                        });

                            if (!response.ok) {

                            console.warn("Role check failed", response.status);

                            return;

                        }

                        const data = await response.json();

                        console.log("admin data=>", data);

                        if (data.role && data.role.toLowerCase() === "admin") {

                            adminBtn.style.display = "inline-block";

                        }

                    } catch (err) {

                        console.error("Error checking admin role:", err);

                    }

                //====admin button click===

                adminBtn.addEventListener("click", e => {
                    if (e.target.id === "adminBtn") {
                        window.location.href = "/Admin/Dashboard"; // your admin page route
                        }
                    });

        }

});

