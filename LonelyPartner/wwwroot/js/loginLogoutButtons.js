// ===============================

// 🔹 Login Logout Button + Modal Logic

// ===============================

 

//console.log("loginLogoutButtons.js loaded.");


document.addEventListener("DOMContentLoaded", async () => {

    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById("logoutBtn");

    const loginModal = document.getElementById("loginModal");
    const closeModal = document.getElementById("closeModal");

    const googleLoginBtn = document.getElementById("googleLoginBtn");

    
    // Show modal when login clicked

        loginBtn?.addEventListener("click", () => {

        loginModal.style.display = "flex";

        });
    
    //googleLoginBtn button click

    googleLoginBtn?.addEventListener("click", async () => {

            try {

                window.location.href = "/Login/GoogleLogin";

                // Hide modal and swap buttons

                loginModal.style.display = "none";

                loginBtn.style.display = "none";
                // show Logout if hidden
                document.querySelectorAll(".btn.gray")[0]?.classList.remove("hidden"); 

            } catch (err) {

                alert("Login failed: " + err.message);

            }

        });

        // logoutBtn button click

        logoutBtn?.addEventListener("click", async () => {

            try {

                window.location.href = "/Login/Logout";

            } catch (err) {

                alert("Logout failed: " + err.message);

            }

        });

      
        // Close modal on closeModal click

        closeModal?.addEventListener("click", () => {

            loginModal.style.display = "none";

        });
});