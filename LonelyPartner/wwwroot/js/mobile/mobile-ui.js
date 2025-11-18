document.addEventListener("DOMContentLoaded", () => {

    if (window.innerWidth > 768) return; // mobile only

    const wrapper = document.getElementById("mobileAppWrapper");
    if (!wrapper) return;

    const btn = document.getElementById("mobileChatBtn");

    const chatInputWrap = document.getElementById("mobileChatInput");
    const chatInput = document.getElementById("mobileChatText");
    const overlay = document.getElementById("mobileChatOverlay");
    const chatWindow = document.getElementById("chatWindow"); // where messages show

    /* ------------------------------------------------------------
       OPEN CHAT FROM MOBILE BUTTON
    ------------------------------------------------------------ */
    btn.addEventListener("click", () => {
        chatInputWrap.style.display = "block";
        overlay.style.display = "block";

        setTimeout(() => chatInput.focus(), 160);
    });

    /* ------------------------------------------------------------
       TYPING PREVIEW
    ------------------------------------------------------------ */
    chatInput.addEventListener("input", () => {
        const txt = chatInput.value.trim();
        if (txt.length > 0) {
            overlay.style.display = "block";
            overlay.innerHTML = `<div>${txt}</div>`;
        } else {
            hideOverlay();
        }
    });

    /* ------------------------------------------------------------
       FIX: MOBILE SEND BUTTON (ENTER) WORKING
       - works on Android / iOS / all keyboards
    ------------------------------------------------------------ */
    chatInput.addEventListener("keyup", (e) => {
        // For Android Chrome → e.key === "Enter"
        if (e.key === "Enter") {
            sendMobileMessage();
            return;
        }

        // iOS Safari sometimes gives key === "Done"
        if (e.key === "Done" || e.key === "Go" || e.key === "Send") {
            sendMobileMessage();
            return;
        }
    });

    // Additional safety fallback for iOS (pressed “send” but key does not fire)
    chatInput.addEventListener("change", () => {
        sendMobileMessage();
    });

    /* ------------------------------------------------------------
       SEND MOBILE MESSAGE
       → same behavior as desktop initChat()
    ------------------------------------------------------------ */
    async function sendMobileMessage() {
        const msg = chatInput.value.trim();
        if (!msg) {
            hideOverlay();
            return;
        }

        if (!window.currentPartnerId) {
            setStatus("Click Start, connect to a partner.", "info");
            return;
        }

        // identical to desktop logic
        window.appendMessage("You", msg);
        chatInput.value = "";
        hideOverlay();

        await window.sendChatToPartner(window.currentPartnerId, msg);
    }

    /* ------------------------------------------------------------
       RECEIVING PARTNER MESSAGES ON MOBILE
       Desktop version updates the DOM.
       Mobile needs to reflect updates → observe new messages.
    ------------------------------------------------------------ */
    if (chatWindow) {
        const observer = new MutationObserver(() => {
            // auto-scroll so mobile always sees the newest message
            chatWindow.scrollTop = chatWindow.scrollHeight;
        });

        observer.observe(chatWindow, { childList: true, subtree: true });
    }

    /* ------------------------------------------------------------
       CLICK OUTSIDE → HIDE OVERLAY
    ------------------------------------------------------------ */
    document.addEventListener("click", (e) => {
        if (!chatInputWrap.contains(e.target) && !overlay.contains(e.target)) {
            hideOverlay();
        }
    });

    function hideOverlay() {
        overlay.style.display = "none";
        overlay.innerHTML = "";
    }
});
