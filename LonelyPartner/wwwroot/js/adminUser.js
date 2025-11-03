// ===============================

// 🔹 Admin Button  Logic

// ===============================

 

 

document.addEventListener("DOMContentLoaded", async () => {

 

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