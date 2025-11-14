document.addEventListener("DOMContentLoaded", () => {

    // Only activate on mobile
    if (window.innerWidth > 768) return;

    const wrapper = document.getElementById("mobileAppWrapper");
    if (!wrapper) return;

    /* ============================================================
       1. BUILD MOBILE UI LAYOUT
    ============================================================ */
    wrapper.innerHTML = `
        <div id="mobileTopControls">
            ${document.getElementById("startBtn").outerHTML}
            ${document.getElementById("stopBtn").outerHTML}
            ${document.getElementById("nextBtn").outerHTML}
            ${document.getElementById("girlsBtn").outerHTML}
            ${document.getElementById("myGenderSelect").outerHTML}
            ${document.getElementById("genderSelect").outerHTML}
            ${document.getElementById("continentSelect").outerHTML}
        </div>

        <div id="mobileRemoteBlock">
            ${document.getElementById("remoteVideo").outerHTML}
        </div>

        <div id="mobileLocalBlock">
            ${document.getElementById("localVideo").outerHTML}
            <button id="mobileChatBtn">💬 Chat</button>
        </div>
    `;

    /* Move real elements into mobile wrapper */
    const move = (id) => {
        const original = document.getElementById(id);
        const placeholder = wrapper.querySelector("#" + id);
        if (original && placeholder) placeholder.replaceWith(original);
    };

    [
        "remoteVideo", "localVideo",
        "startBtn", "stopBtn", "nextBtn",
        "girlsBtn", "myGenderSelect",
        "genderSelect", "continentSelect"
    ].forEach(move);

    /* ============================================================
       2. MOBILE CHAT HANDLER
    ============================================================ */
    const chatBtn = document.getElementById("mobileChatBtn");
    const chatPanel = document.querySelector(".right-panel");

    if (chatBtn && chatPanel) {
        chatPanel.style.display = "none";

        chatBtn.addEventListener("click", () => {
            if (chatPanel.style.display === "none") {
                chatPanel.style.display = "block";
                chatPanel.scrollIntoView({ behavior: "smooth" });
            } else {
                chatPanel.style.display = "none";
            }
        });
    }

    /* ============================================================
       3. MOBILE MODAL FIXES – prevent overflow bugs
    ============================================================ */
  /*  const modals = document.querySelectorAll(
        ".modal, .consentmodal, .profile-modal, .upgrademodal, .sol-modal"
    );

    modals.forEach(modal => {
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.background = "rgba(0,0,0,0.75)";
        modal.style.zIndex = "99999";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style="display:none";
    });
*/
      /* ============================================================
       MODAL CLOSE BUTTONS – UNIVERSAL FIX
============================================================ */
    document.querySelectorAll(".cs-modal-close").forEach(btn => {
        btn.addEventListener("click", () => {
            const modal = btn.closest(".cs-modal-overlay");
            if (modal) modal.style.display = "none";
        });
    });
});
