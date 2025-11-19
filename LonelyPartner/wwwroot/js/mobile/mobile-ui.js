document.addEventListener("DOMContentLoaded", () => {

    if (window.innerWidth > 768) return; // mobile only

    const wrapper = document.getElementById("mobileAppWrapper");
    if (!wrapper) return;

    const btn = document.getElementById("mobileChatBtn");

    const chatInputWrap = document.getElementById("mobileChatInput");
    const chatInput = document.getElementById("mobileChatText");
    const overlay = document.getElementById("mobileChatOverlay");
    const sendBtn = document.getElementById("sendChatmobile");
    const mobileMessages = document.getElementById("mobileChatMessages");
   // const chatWindow = document.getElementById("messages"); // USE DESKTOP CHAT WINDOW

    //chatInputWrap.style.display = true;
    //overlay.style.display = true;

    /* ---------------------------------------------
       OPEN CHAT POPUP
    --------------------------------------------- */
    btn.addEventListener("click", () => {
        

        // Make visible
        chatInputWrap.style.display = "block";
        overlay.style.display = "block";

        //setTimeout(() => chatInput.focus(), 160);
        // MUST BE SAME CLICK TICK FOR MOBILE
        chatInput.focus({ preventScroll: true });

        // Force keyboard open by scrolling input into view
        setTimeout(() => {
            chatInput.scrollIntoView({ block: "center", behavior: "auto" });
        }, 50);
    });

    /* ---------------------------------------------
       TYPING PREVIEW
    --------------------------------------------- */
  /*  chatInput.addEventListener("input", () => {
        const txt = chatInput.value.trim();
        overlay.style.display = txt.length > 0 ? "block" : "none";
        overlay.innerHTML = txt ? `<div>${txt}</div>` : "";
    });
*/
    /* ---------------------------------------------
       SEND ON ENTER / DONE / SEND
    --------------------------------------------- */
    chatInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter" || e.key === "Done" || e.key === "Go" || e.key === "Send") {
            sendMobileMessage();
        }
    });

    //chatInput.addEventListener("change", sendMobileMessage);

    // Fallback button
    sendBtn.addEventListener("click", sendMobileMessage);

    /* ---------------------------------------------
       SEND CHAT (MOBILE → DESKTOP BRIDGE)
    --------------------------------------------- */
    async function sendMobileMessage() {
        const msg = chatInput.value.trim();
        if (!msg) {
            hideOverlay();
            return;
        }

        if (!window.currentPartnerId) {
            window.setStatus("Click Start, connect to a partner.", "info");
            return;
        }

        // Desktop function + mobile
        window.appendMessage("You", msg);
        chatInput.value = "";
        hideOverlay();

        await window.sendChatToPartner(window.currentPartnerId, msg);
    }

    /* ---------------------------------------------
       AUTO-SCROLL MOBILE ON NEW MESSAGES
    --------------------------------------------- */
    if (chatWindow) {
        const observer = new MutationObserver(() => {
            chatWindow.scrollTop = chatWindow.scrollHeight;
        });

        observer.observe(chatWindow, { childList: true, subtree: true });
    }

    /* ---------------------------------------------
       CLICK OUTSIDE TO HIDE CHAT POPUP
    --------------------------------------------- */
    document.addEventListener("click", (e) => {
        if (chatBtn.contains(e.target)) return;
        if (chatWrap.contains(e.target)) return;
        if (overlay.contains(e.target)) return;
        hideOverlay();
    });

    function hideOverlay() {
        overlay.style.display = "none";
        overlay.innerHTML = "";
        chatInputWrap.style.display = "none";
    }
});
