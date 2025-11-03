// ===============================

// 🔹 Feature Access Control Logic

// ===============================

 

 

function initAccessControl() {

 

    const girlsBtn = document.getElementById("girlsBtn");

    const genderSelect = document.getElementById("genderSelect");

    const continentSelect = document.getElementById("continentSelect");

 

    const loginModal = document.getElementById("loginModal");

    const upgradeModal = document.getElementById("upgradeModal");

 

   

    function isActivePlan() {

        const now = new Date();

        const endDate = new Date(window.appUser.endDate);

       

 

        if (window.appUser.isAuthenticated === true

            && (window.appUser.productId != 0) && (endDate > now)

           // && (window.appUser.isActivePlan === true)

        )

          {

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

 

    function showLoginModal() {

        if (loginModal) {

            loginModal.style.display = "flex";

        }       

    }

 

    function showUpgradeModal() {

        if (upgradeModal){

            upgradeModal.style.display = "flex";

            if(typeof loadPlans === "function") loadPlans();

        }       

    }

 

    function lockSelects() {

        if (genderSelect) {

            genderSelect.value = "All";

            genderSelect.disabled = true;

        }

        if (continentSelect) {

            continentSelect.value = "All";

            continentSelect.disabled = true;

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

    console.log("accessButton=> isLoggedIn=>", isLoggedIn, "==hasActivePlan=>", hasActivePlan);

 

 

   

 

    // 🔸 Condition 2: Logged in but no active plan

    if (isLoggedIn && !hasActivePlan) {

 

        [girlsBtn, genderSelect, continentSelect].forEach(el => {

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

           

            [girlsBtn, genderSelect, continentSelect].forEach(el => {

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

           

            return;

        }

        // 🔸 Condition 3: Logged in and active plan

        else if (isLoggedIn && hasActivePlan) {

 

            //Hide Girls Only Button

            if (girlsBtn) girlsBtn.style.display = "none";

 

            // Ensure filters  are enabled

            [genderSelect, continentSelect].forEach(el => {

                if (!el) return;

                el.disabled = false;

                el.style.opacity = "1";

                el.style.cursor = "pointer";

            });

        }

        else {

           

               [girlsBtn, genderSelect, continentSelect].forEach(el => {

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

 