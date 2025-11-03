// ===============================

// 🔹 Menu Button  Logic

// ===============================

 
document.addEventListener("DOMContentLoaded", async () => {

 

    //login modal

    function showLoginModal() {

        if (loginModal) {

            loginModal.style.display = "flex";

        }

    }

    //menu button

    document.getElementById('menuToggle').addEventListener('click', () => {

        document.getElementById('overlayMenu').classList.add('show');

    });

    // close button

    document.getElementById('closeMenu').addEventListener('click', () => {

        document.getElementById('overlayMenu').classList.remove('show');

    });

    //login button

    document.getElementById('loginInMenu').addEventListener('click', () => {

        showLoginModal();

    });

 

});

