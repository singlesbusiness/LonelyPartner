function getConsent() {
    return JSON.parse(localStorage.getItem("cookieConsent") || "{}");
}

function setConsent(consent) {
    localStorage.setItem("cookieConsent", JSON.stringify(consent));
}

function applyConsent() {
    const c = getConsent();

    if (c.analytics) loadAnalytics();
    if (c.marketing) loadMarketing();
}

// Blocked scripts until consent is granted
function loadAnalytics() {
    let ga = document.createElement('script');
    ga.src = "https://www.googletagmanager.com/gtag/js?id=G-RCRG6378GH";
    document.head.appendChild(ga);
}

function loadMarketing() {
    let fb = document.createElement('script');
    fb.innerHTML = `/* Facebook Pixel */`;
    document.head.appendChild(fb);
}

document.addEventListener("DOMContentLoaded", function () {
    const banner = document.getElementById("cookie-banner");
    const modal = document.getElementById("cookie-settings");
console.log("cookie js loaded");

if (!banner) {
        console.warn("Cookie banner HTML not found");
        return;
    }
    const c = getConsent();

    if (!c.decided) banner.style.display = "block";
    else applyConsent();

    // Buttons
    document.getElementById("accept-all").onclick = function () {
        setConsent({ analytics: true, marketing: true, decided: true });
        location.reload();
    };

    document.getElementById("reject-all").onclick = function () {
        setConsent({ analytics: false, marketing: false, decided: true });
        location.reload();
    };

    document.getElementById("customize").onclick = function () {
        modal.style.display = "block";
    };

    document.getElementById("save-settings").onclick = function () {
        setConsent({
            analytics: document.getElementById("analytics").checked,
            marketing: document.getElementById("marketing").checked,
            decided: true
        });
        location.reload();
    };

    document.getElementById("close-settings").onclick = function () {
        modal.style.display = "none";
    };
});
