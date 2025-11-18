document.addEventListener("DOMContentLoaded", () => {

    // Only mobile
    if (window.innerWidth > 768) return;

    const wrapper = document.getElementById("mobileAppWrapper");
    if (!wrapper) return;

    /* ============================================================
       BUILD MOBILE LAYOUT
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

    /* Replace placeholders with original elements */
    const move = id => {
        const original = document.getElementById(id);
        const temp = wrapper.querySelector("#" + id);
        if (original && temp) temp.replaceWith(original);
    };

    [
        "remoteVideo", "localVideo",
        "startBtn", "stopBtn", "nextBtn",
        "girlsBtn", "myGenderSelect",
        "genderSelect", "continentSelect"
    ].forEach(move);


    /* ============================================================
       CHAT PANEL MOBILE TOGGLE
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
       MODAL CLOSE BUTTONS – UNIVERSAL FIX
============================================================ */
    document.querySelectorAll(".cs-modal-close").forEach(btn => {
        btn.addEventListener("click", () => {
            const modal = btn.closest(".cs-modal-overlay");
            if (modal) modal.style.display = "none";
        });
    });

});
