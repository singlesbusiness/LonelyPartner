// ===============================

// 🔹 Select drop down access logic

// ===============================

function initAccessControl() {

 

    //const girlsBtn = document.getElementById("girlsBtn");

    const genderSelect = document.getElementById("genderSelect");

    const continentSelect = document.getElementById("continentSelect");

 
    //modals
    const loginModal = document.getElementById("loginModal");

    const upgradeModal = document.getElementById("upgradeModal");

    //remote

 
    // ===============================
    // 🌍 Auto-detect continent (non-paid users)
    // ===============================
            let userContinent = "All";
            window.addEventListener("load", async () => {
            try {
                const res = await fetch("https://ipapi.co/json/");
                const data = await res.json();
                userContinent = data.continent_code || "All";
                //console.log("🌍 User continent:", userContinent);
                if (continentSelect) 
                    {
                        continentSelect.value = userContinent;
                    }
                } catch (e) {
                console.warn("🌍 Failed to get continent:", e);
                continentSelect.value = "All";
                }
            });
            
        function isActivePlan() {
                if (!window.appUser?.isAuthenticated || !window.appUser?.endDate)
                    return false;

                const endDateLocal = new Date(window.appUser.endDate);
                const nowLocal = new Date();
                //console.log("accessbutton end date=>" , endDateLocal);
                //console.log("accessbutton nowLocal=>" , nowLocal);
                return (window.appUser.productId != 0) && (endDateLocal > nowLocal);
            }      
    
    //Login Modal
    function showLoginModal() {

        if (loginModal) {

            loginModal.style.display = "flex";
            document.getElementById("remoteControls").style.display = "none";
        }       

    }

    
    //Upgrade Modal
    function showUpgradeModal() {

        if (upgradeModal){

            upgradeModal.style.display = "flex";

            //if(typeof loadPlans === "function") loadPlans();

        }       

    }

 

    function lockSelects() {

        if (genderSelect) {

            genderSelect.value = "All";

            genderSelect.disabled = true;

        }

    }

    // When plan is clicked

    document.addEventListener("click", (e) => {

        if (e.target.classList.contains("buy-btn")) {

            const plan = e.target.dataset.plan;

            alert(`Purchase process for ${plan} started.`);

            // TODO: integrate payment logic or API call here

        }

    });

    const isLoggedIn = window.appUser?.isAuthenticated === true;

    const hasActivePlan = isActivePlan();

    //const hasActivePlan = window.appUser?.hasPlan === false;

    //console.log("accessButton=> isLoggedIn=>", isLoggedIn, "==hasActivePlan=>", hasActivePlan);

 
    // 🔸 Condition 2: Logged in but no active plan

    if (isLoggedIn && !hasActivePlan) {

        [genderSelect, continentSelect].forEach(el => {

            if (!el) return;

            el.addEventListener("click", e => {

                e.preventDefault();

                if (el.tagName === "SELECT") el.value = "All";

                showUpgradeModal()

            });

            if (el.tagName === "SELECT") {

                el.addEventListener("chnage", e => {

                    e.preventDefault();

                    el.value = "All";

                    showUpgradeModal();

                });

            }

        });

   
        return;

    }

    else // 🔸 Condition 1: User not logged in

        if (!isLoggedIn) {
      

            [genderSelect, continentSelect].forEach(el => {

                if (!el) return;

                el.addEventListener("click", e => {

                    e.preventDefault();

                    if (el.tagName === "SELECT") el.value = "All";

                    showLoginModal()

                });

                if (el.tagName === "SELECT") {

                    el.addEventListener("change", e => {

                        e.preventDefault();

                        el.value = "All";

                        showLoginModal();

                    });

                }               

            });

           

            return;

        }

        // 🔸 Condition 3: Logged in and active plan

        else if (isLoggedIn && hasActivePlan) {

 

            //Hide Girls Only Button

            //if (girlsBtn) girlsBtn.style.display = "none";

            // Ensure filters  are enabled

            [genderSelect, continentSelect].forEach(el => {

                if (!el) return;

                el.disabled = false;

                el.style.opacity = "1";

                el.style.cursor = "pointer";

            });

        }

        else {

           

               [genderSelect, continentSelect].forEach(el => {

                if (!el) return;

                el.addEventListener("click", e => {

                    e.preventDefault();

                    if (el.tagName === "SELECT") el.value = "All";

                    showLoginModal()

                });

                if (el.tagName === "SELECT") {

                    el.addEventListener("chnage", e => {

                        e.preventDefault();

                        el.value = "All";

                        showLoginModal();

                    });

                }               

            });

           

            /*

            lockSelects();

            */

        }

}

 

// Run when DOM is ready

document.addEventListener("DOMContentLoaded", initAccessControl);

 