// wwwroot/js/videochat.js

// Combined SignalR + WebRTC + Chat + Emoji + Age check + Resizing

// Requires signalr client loaded (e.g. <script src=https://cdn.jsdelivr.net/npm/@microsoft/signalr@8/dist/browser/signalr.min.js></script>)

 

(function () {

    const log = (...args) => console.log("[LP]", ...args);

    const warn = (...args) => console.warn("[LP]", ...args);

    const error = (...args) => console.error("[LP]", ...args);

 

    // DOM refs (populated on DOMContentLoaded)

    let startBtn, nextBtn, stopBtn, girlsBtn;

    let localVideo, remoteVideo, localPlaceholder, remotePlaceholder;

    let genderSelect, continentSelect;

    let chatInput, sendChatBtn, messagesDiv, emojiBtn, emojiPicker;

    let leftPanel, verticalDivider, localBlock, remoteBlock, splitter, rightPanel;

 

 

    const loginBtn = document.getElementById('loginBtn');

    const loginModal = document.getElementById("loginModal");

    const closeModal = document.getElementById("closeModal");

    const googleLoginBtn = document.getElementById("googleLoginBtn");

    const logoutBtn = document.getElementById("logoutBtn");

 

   

 

    // Show modal when login clicked

    loginBtn?.addEventListener("click", () => {

        loginModal.style.display = "flex";

    });

 

    // Close modal

    closeModal?.addEventListener("click", () => {

        loginModal.style.display = "none";

    });

 

    // Close modal

    closeUpgradeModal?.addEventListener("click", () => {

        upgradeModal.style.display = "none";

    });

 

 

    // Simulated Google login

    googleLoginBtn?.addEventListener("click", async () => {

        try {

            //window.location.href = "/Login/Login";

            window.location.href = "/Login/GoogleLogin";

            // Hide modal and swap buttons

            loginModal.style.display = "none";

            loginBtn.style.display = "none";

            document.querySelectorAll(".btn.gray")[0]?.classList.remove("hidden"); // show Logout if hidden

        } catch (err) {

            alert("Login failed: " + err.message);

        }

    });

 

    // Simulated Google logout

    logoutBtn?.addEventListener("click", async () => {

        try {

            window.location.href = "/Login/Logout";

         } catch (err) {

            alert("Logout failed: " + err.message);

        }

    });

  

 

    //=================================================

    // SignalR + WebRTC state

    let connection = null;

    let currentPartnerId = null;

    let isInitiator = false;

    let localStream = null;

    let pc = null;

    const pendingCandidates = {}; // partnerId -> [candidate,...]

 

    // STUN config

    const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

 

    // --- Utilities ---

    function ensurePendingArray(id) {

        if (!pendingCandidates[id]) pendingCandidates[id] = [];

        return pendingCandidates[id];

    }

 

    function safeParse(str) {

        try { return JSON.parse(str); } catch (e) { return str; }

    }

 

    // escape user-provided text for HTML display

    function escapeHtml(unsafe) {

        if (!unsafe) return "";

        return unsafe.replace(/[&<"'>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));

    }

 

    // append message

    function appendMessage(sender, text) {

        if (!messagesDiv) return;

        const el = document.createElement("div");

        el.className = `message ${sender === "You" ? "me" : "other"}`;

        el.innerHTML = `<strong>${escapeHtml(sender)}:</strong> ${escapeHtml(text)}`;

        messagesDiv.appendChild(el);

        messagesDiv.scrollTop = messagesDiv.scrollHeight;

    }

 

    // --- Age verification (one-time via localStorage) ---

    function ensureAgeVerified() {

        try {

            if (localStorage.getItem("lp_ageVerified") === "true") return true;

        } catch (e) {

            console.warn("LocalStorage not available:", e);

        }

 

        const modal = document.getElementById("ageModal");

        const yesBtn = document.getElementById("ageConfirmYes");

        const noBtn = document.getElementById("ageConfirmNo");

 

        if (!modal || !yesBtn || !noBtn) {

            console.error("Age verification modal not found in DOM.");

            return false;

        }

 

        return new Promise((resolve) => {

            modal.style.display = "block";

 

            yesBtn.onclick = () => {

                modal.style.display = "none";

                try { localStorage.setItem("lp_ageVerified", "true"); } catch { }

                resolve(true);

            };

 

            noBtn.onclick = () => {

                modal.style.display = "none";

                alert("You must be 18+ to use this service.");

                resolve(false);

            };

        });

    }

 

    // --- Camera controls ---

    async function startCamera() {

        if (localStream) { log("camera already running"); return localStream; }

        try {

            //const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            const s = await navigator.mediaDevices.getUserMedia({

                video: {

                    width: { min: 640, ideal: 7680, max: 7680 },

                    height: { min: 480, ideal: 4320, max: 4320 },

                    frameRate: { min: 15, ideal: 60, max: 60 }

                },

                audio: {

                    echoCancellation: true,

                    noiseSuppression: true,

                    channelCount: 2

                }

            });

 

            localStream = s;

            if (localVideo) {

                localVideo.srcObject = s;

                localVideo.muted = true;

                localVideo.style.display = "block";

                if (localPlaceholder) localPlaceholder.style.display = "none";

                // Attempt to play (some browsers require play() to be handled explicitly)

                try { await localVideo.play(); } catch (e) { log("localVideo.play() prevented:", e); }

            }

            log("Local camera started", s.getTracks().map(t => t.kind));

            return s;

        } catch (e) {

            error("getUserMedia failed:", e);

            throw e;

        }

    }

 

    function stopCamera() {

        if (localStream) {

            localStream.getTracks().forEach(t => t.stop());

            localStream = null;

        }

        if (localVideo) {

            localVideo.srcObject = null;

            localVideo.style.display = "none";

            if (localPlaceholder) localPlaceholder.style.display = "block";

        }

        console.log("Local camera stopped");
        endCallLocal();

    }

    // 🔹 Stop remote partner's video stream
function stopRemoteVideo() {
    const remoteVideo = document.getElementById("remoteVideo");
    if (remoteVideo && remoteVideo.srcObject) {
        const tracks = remoteVideo.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        remoteVideo.srcObject = null;
        console.log("🎥 Remote video stopped.");
    }
}

// 🔹 Stop local chat input and hide typing area
function stopChat() {
    const chatInput = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendButton");

    if (chatInput) chatInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    const status = document.getElementById("chatStatus");
    if (status) status.textContent = "Chat ended.";
    console.log("💬 Chat stopped.");
}

// 🔹 Restore waiting UI state
function showWaitingState() {
    const status = document.getElementById("statusText");
    if (status) status.textContent = "⏳ Waiting for a new partner...";

    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");
    //if (remoteVideo) remoteVideo.style.opacity = 0.3; // fade remote preview

    console.log("⌛ Showing waiting state.");
}

// 🔹 Optional: show a subtle 'You left the chat' message
function showStoppedMessage() {
    const status = document.getElementById("statusText");
    if (status) status.textContent = "✅ You left the chat.";
    console.log("🛑 User stopped chat manually.");
}


 

    // --- PeerConnection lifecycle ---

    function createPeerConnection(partnerId) {

        console.log("createPeerConnection for", partnerId);

        const peer = new RTCPeerConnection(RTC_CONFIG);

 

        peer.ontrack = (ev) => {

            console.log("ontrack", ev.streams);

            try {

                remoteVideo.srcObject = ev.streams[0];

                remoteVideo.style.display = "block";

                if (remotePlaceholder) remotePlaceholder.style.display = "none";

            } catch (e) {

                error("ontrack error:", e);

            }

        };

 

        peer.onicecandidate = (ev) => {

            if (ev.candidate) {

                // send candidate as JSON string for safety across SignalR

                const candStr = JSON.stringify(ev.candidate);

                sendSignal(partnerId, "candidate", candStr);

                log("onicecandidate sent", partnerId);

            }

        };

 

        peer.onconnectionstatechange = () => {

            log("pc state:", peer.connectionState);

            if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {

                // handle as partner left

                // don't auto-close here; Next/Stop will manage

                log("pc failed/disconnected");

            }

        };

 

        // add pending candidates (if any)

        const pending = pendingCandidates[partnerId];

        if (pending && pending.length) {

            setTimeout(async () => {

                for (const c of pending) {

                    try { await peer.addIceCandidate(new RTCIceCandidate(c)); log("applied queued candidate"); }

                    catch (e) { error("queued addIceCandidate failed:", e); }

                }

                delete pendingCandidates[partnerId];

            }, 0);

        }

 

        return peer;

    }

 

    // create and send offer (initiator)

    async function createOfferFlow(partnerId) {

        if (!localStream) {

            try { await startCamera(); } catch (e) { error("no local stream for offer"); return; }

        }

        pc = createPeerConnection(partnerId);

        // add local tracks

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

 

        // create offer

        const offer = await pc.createOffer();

        await pc.setLocalDescription(offer);

 

        // send as JSON string

        await sendSignal(partnerId, "offer", JSON.stringify(offer));

        log("Offer created & sent to", partnerId);

    }

 

    // handle incoming offer (callee)

    async function handleOffer(fromId, offerStr) {

        log("handleOffer from", fromId);

        const offer = safeParse(offerStr);

        currentPartnerId = fromId;

 

        if (!localStream) {

            try { await startCamera(); } catch (e) { error("cannot start camera on offer", e); return; }

        }

 

        pc = createPeerConnection(fromId);

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

 

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();

        await pc.setLocalDescription(answer);

 

        await sendSignal(fromId, "answer", JSON.stringify(answer));

        log("Answer created & sent to", fromId);

    }

 

    // handle incoming answer (initiator)

    async function handleAnswer(answerStr) {

        log("handleAnswer");

        if (!pc) { warn("No pc when answer arrived"); return; }

        const answer = safeParse(answerStr);

        try {

            await pc.setRemoteDescription(new RTCSessionDescription(answer));

            log("Remote description set (answer)");

        } catch (e) {

            error("setRemoteDescription(answer) failed:", e);

        }

    }

 

    // handle incoming candidate

    async function handleCandidate(fromId, candidateStr) {

        const cand = safeParse(candidateStr);

        if (!cand) return;

        if (!pc) {

            log("pc not ready, queue candidate for", fromId);

            ensurePendingArray(fromId).push(cand);

            return;

        }

        try {

            await pc.addIceCandidate(new RTCIceCandidate(cand));

            log("Added ICE candidate");

        } catch (e) {

            error("addIceCandidate failed:", e);

        }

    }

 

    // teardown current call

    function endCallLocal() {

        if (pc) try {

            pc.close();
            //added new
            pc.stop();
            console.log("🔴 Disconnected from hub");
            ///
            pc = null;

        }

        catch (e) {

            pc = null;

        }

        //pc = null;

        currentPartnerId = null;

        if (remoteVideo && remoteVideo.srcObject) {

            remoteVideo.srcObject.getTracks().forEach(t => t.stop());

            remoteVideo.srcObject = null;

            remoteVideo.style.display = "none";

            remotePlaceholder.style.display = "flex";

        }

        if (remotePlaceholder) remotePlaceholder.style.display = "flex";

       

        log("Call ended locally");

    }

 

    // --- SignalR helpers ---

    async function sendSignal(targetId, type, data) {

        if (!connection) { error("SignalR not connected"); return; }

        try {

            await connection.invoke("SendSignal", targetId, type, data);

        } catch (e) {

            // fallback retry log

            error("SendSignal invoke failed:", e);

        }

    }

 

    // send chat with graceful fallback to other method name variants

    async function sendChatToPartner(partnerId, message) {

        if (!connection) { error("SignalR connection missing"); return; }

        try {

            // primary method name

            await connection.invoke("SendChatMessage", partnerId, message);

        } catch (e1) {

            log("SendChatMessage failed, trying alternative 'SendChat'...", e1);

            try {

                await connection.invoke("SendChat", partnerId, message);

            } catch (e2) {

                error("Chat send failed (both methods):", e2);

            }

        }

    }

 

    // --- SignalR initialization & handlers ---

    async function initSignalR() {

        connection = new signalR.HubConnectionBuilder()

            .withUrl("/chathub")

            .withAutomaticReconnect()

            .build();

 

        connection.on("WaitingForPartner", () => log("Server: waiting for partner..."));

        connection.on("Waiting", () => log("Server: waiting for partner..."));

 

        // Matched payload may be object with .partner / .Partner and isInitiator / IsInitiator

        connection.on("Matched", async (payload, role, partnerCountry, partnerCity) => {

            log("Matched with partner:",  partnerCity, partnerCountry);

 

            try {

                log("Matched payload:", payload);

                isCaller = role === "Caller";

                const partner = payload.partner ?? payload.Partner ?? (typeof payload === "string" ? payload : null);

                const initiator = payload.isInitiator ?? payload.IsInitiator ?? false;

                if (!partner) {

                    warn("Matched received but partner id missing:", payload);

                    return;

                }

                currentPartnerId = partner;

                isInitiator = !!initiator;

                log("Matched -> partner:", currentPartnerId, "initiator:", isInitiator);

 

                // show partner’s location

                const infoDiv = document.getElementById("partnerInfo");

                if (infoDiv) {

                    infoDiv.textContent = `🌍 ${partnerCity}, ${partnerCountry}`;

                }

 

                if (isInitiator || isCaller ) {

                    await createOfferFlow(currentPartnerId);

                } else {

                    // wait for offer; nothing to do here explicitly

                    log("Awaiting offer from partner");

                }

            } catch (e) {

                error("Matched handler error:", e);

            }

        });

 

        // ReceiveSignal(senderId, type, data)

        connection.on("ReceiveSignal", async (fromId, type, data) => {

            log("ReceiveSignal:", fromId, type);

            if (type === "offer") {

                await handleOffer(fromId, data);

            } else if (type === "answer") {

                await handleAnswer(data);

            } else if (type === "candidate") {

                await handleCandidate(fromId, data);

            } else {

                warn("Unknown signal type:", type);

            }

        });

        //Partnerlwft
        connection.on("PartnerLeft", async () => {
    log("⚠️ Partner left the chat.");

    // 1️⃣ Stop local media and peer connection
    endCallLocal(); // your existing function for ending WebRTC call

    // 2️⃣ Stop remote video cleanly (if stream still visible)
    stopRemoteVideo();

    // 3️⃣ Stop chat / disable typing
    stopChat();

    // 4️⃣ Remove partner info (country/city)
    const infoDiv = document.getElementById("partnerInfo");
    if (infoDiv) infoDiv.textContent = "";

    // 5️⃣ Show waiting UI while finding next match
    showWaitingState();

    // 6️⃣ Give WebRTC time to fully close before restarting
    await new Promise(res => setTimeout(res, 500));

    // 7️⃣ Try to start searching for the next partner
    try {
        await start(); // your existing start() reconnects to hub for next partner
    } catch (e) {
        err("Next partner search failed:", e);
    }
});


        
    
 

        connection.on("ChatStopped", () => {

            endCallLocal();
            resetUI("You left the chat. Click Start to join again.");
            //appendMessage("System", "Chat stopped.");

        });

 

        connection.on("Error", (message) => {

            console.error("Hub Error:", message);

            //End the call safely

            if (typeof endCallLocal === "function") {

                endCallLocal();

            }

        });

 

        //chat messages

        connection.on("ReceiveChatMessage", (senderId, message) => {

            log("ReceiveChatMessage from", senderId, message);

            appendMessage("Partner", message);

        });

 

        connection.onclose((err) => {

            warn("SignalR connection closed", err);

        });

 

        //these are important lines, commented so pageon load hub is not connected
        /*
        try {

            await connection.start();

            log("SignalR connected");

        } catch (e) {

            error("SignalR start failed:", e);

        }
        
        /////    */

 

        // --- SignalR PlanActivated handler: update UI when server notifies

        connection.on("PlanActivated", (payload) => {

            console.log("PlanActivated payload:", payload);

            // Example payload: { productId, productName, endDate, txId }

            const statusEl = document.getElementById("solStatus");

            if (statusEl) statusEl.innerText = `Plan activated: ${payload.productName} until ${new Date(payload.endDate).toLocaleString()}`;

 

            // hide upgrade buttons and enable filters

            const upgradeBtn = document.getElementById("upgradeBtn");

            const girlsBtn = document.getElementById("girlsBtn");

            if (upgradeBtn) upgradeBtn.style.display = "none";

            if (girlsBtn) girlsBtn.style.display = "none";

 

            const genderSelect = document.getElementById("genderSelect");

            const continentSelect = document.getElementById("continentSelect");

            if (genderSelect) { genderSelect.disabled = false; genderSelect.value = genderSelect.value || "All"; }

            if (continentSelect) { continentSelect.disabled = false; continentSelect.value = continentSelect.value || "All"; }

 

            // update local window.appUser if present

            if (window.appUser) {

                window.appUser.productId = payload.productId;

                window.appUser.productName = payload.productName;

                window.appUser.endDate = payload.endDate;

            }

        });

 

    }

   

 

      

        //===============================

 

    function validateMyGender() {

        const myGenderSelect = document.getElementById("myGenderSelect");

        if (!myGenderSelect) return true;

 

        const val = myGenderSelect.value.trim();

        if (!val) {

            myGenderSelect.classList.add("shake", "error-border");

            setTimeout(() => myGenderSelect.classList.remove("shake"), 500);

            setTimeout(() => myGenderSelect.classList.remove("error-border"), 1500);

            return false;

        }

        return true;

    }

   

 

    // --- Buttons: Start / Next / Stop handlers ---

    async function onStartClicked() {

        const verified = await ensureAgeVerified();

        if (!verified) return;

        //select my gender

        if (!validateMyGender()) return;

 

        // start camera (user gesture)

        try {

            await startCamera();

        } catch (e) {

            alert("Camera is required to start. Please allow camera access.");

            return;

        }

        // ✅ Connect to hub now, if not already connected
    try {
        if (!connection) await initSignalR(); // build connection if missing
        if (connection.state !== signalR.HubConnectionState.Connected) {
            await connection.start();
            log("✅ SignalR connection started on Start click");
        } else {
            log("SignalR already connected, skipping start()");
        }

        //call hub

       

            await start();

            //enable Next button       

            nextBtn.style.display = "inline-block";

    }

        catch (e) {
            console.error("Start error:", e);
            alert("Server Error. please wait");

            //return;

        }

    }

 

    // invoke StartSearching on hub

    async function start() {

       

        try {

            genderSelectEl = document.getElementById("genderSelect");

            continentSelectEl = document.getElementById("continentSelect");

 

            let gender = genderSelectEl?.value || "All";

            let continent = continentSelectEl?.value || "All";

 

            //Read User Info

            const appUser = window.appUser || {};

            const isLoggedIn = appUser.isAuthenticated === true;

            const productId = parseInt(window.appUser?.productId || 0);

            const endDate = appUser.endDate ? new Date(appUser.endDate) : null;

            const hasActivePlan = (isLoggedIn && productId > 0 && endDate > new Date());

            //const hasActivePlan = window.appUser?.hasPlan;

 

            console.log("isLoggedIn=>", isLoggedIn);

            console.log("hasActivePlan=>", hasActivePlan);

            console.log("productId=>", productId);

 

            //Only send custom filters if User has Active Plan

            if (!hasActivePlan) {

                gender = "All";

                continent = "All";

                console.log("genderSelect in activeplan fun=>", gender)

 

                //optional

                if (genderSelectEl) genderSelectEl.value = "All";

                if (continentSelectEl) continentSelectEl.value = "All";

            }

 

            console.log(" Sending to Hib search request with gender and continent as = ", { gender, continent });

 

            await connection.invoke("StartSearching", gender, continent);

            log("StartSearching invoked");

        } catch (e) {

            error("StartSearching invoke failed:", e);

        }

    }

 

 

    // when Next button is clicked

    async function onNextClicked() {

        // close local call and request next

        endCallLocal();

        //PartnerLeft();

        try {

            // try named method variants

            if (connection) {

                if (connection.invoke.length) {

                    // try NextPartner first (latest hub)

                    /*

                    try {

                        //await connection.invoke("Next",  gender, continent));

                        await start();

                    } catch (e) {

                        error("start invoke in hub failed:", e);

                        return;

                    }

                    */

                    try {

 

                    genderSelectEl = document.getElementById("genderSelect");

                            continentSelectEl = document.getElementById("continentSelect");

 

                            let gender = genderSelectEl?.value || "All";

                            let continent = continentSelectEl?.value || "All";

 

                            //Read User Info

                            const appUser = window.appUser || {};

                            const isLoggedIn = appUser.isAuthenticated === true;

                            const productId = parseInt(window.appUser?.productId || 0);

                            const endDate = appUser.endDate ? new Date(appUser.endDate) : null;

                            const hasActivePlan = (isLoggedIn && productId > 0 && endDate > new Date());

                            //const hasActivePlan = window.appUser?.hasPlan;

 

                            console.log("isLoggedIn=>", isLoggedIn);

                            console.log("hasActivePlan=>", hasActivePlan);

                            console.log("productId=>", productId);

 

                            //Only send custom filters if User has Active Plan

                            if (!hasActivePlan) {

                                gender = "All";

                                continent = "All";

                                console.log("genderSelect in activeplan fun=>", gender)

 

                                //optional

                                if (genderSelectEl) genderSelectEl.value = "All";

                                if (continentSelectEl) continentSelectEl.value = "All";

                            }

                                        await connection.invoke("Next", gender , continent);

                                        return;

                                    } catch (e) {

                                        error("Next invoke variants failed:", e);

                                    }                   

                }

            }

        } catch (e) {

            error("Next error:", e);

        }

    }

 
    //Stop button click event
    async function onStopClicked() {
    // stop camera and local call
    stopCamera();
    endCallLocal();
    nextBtn.style.display = "none";

    try {
        if (connection && connection.state === signalR.HubConnectionState.Connected) {
            await connection.invoke("Stop");
        } else {
            console.warn("SignalR not connected when Stop clicked");
        }
    } catch (e) {
        console.error("Stop failed:", e);
    }
}



 

    // --- Emoji picker wiring ---

 

    function initEmojiPicker() {

        if (!emojiBtn) return;

 

        // Create emoji picker container dynamically if not already present

        emojiPicker = document.getElementById("emojiPicker");

        if (!emojiPicker) {

            emojiPicker = document.createElement("div");

            emojiPicker.id = "emojiPicker";

            emojiPicker.className = "emoji-picker";

            document.body.appendChild(emojiPicker);

        }

 

        // Basic emoji list (you can expand this)

        const emojis = [

            "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😜", "🤩", "😎", "😢", "😭", "😡", "👍",

            "👎", "👏", "🙌", "💪", "💖", "🔥", "🌹", "🍀", "🍕", "🍻", "🎉", "🎶", "🚀", "🌈"

        ];

 

        // Build emoji elements

        emojiPicker.innerHTML = emojis

            .map(e => `<span class="emoji-item" style="cursor:pointer;font-size:1.4rem;padding:4px;">${e}</span>`)

            .join("");

 

        emojiPicker.style.display = "none";

        emojiPicker.style.position = "absolute";

        emojiPicker.style.background = "#fff";

        emojiPicker.style.border = "1px solid #ccc";

        emojiPicker.style.borderRadius = "8px";

        emojiPicker.style.padding = "8px";

        emojiPicker.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";

        emojiPicker.style.userSelect = "none";

        emojiPicker.style.zIndex = "999";

 

        // Toggle picker visibility

        emojiBtn.addEventListener("click", () => {

            if (emojiPicker.style.display === "block") {

                emojiPicker.style.display = "none";

            } else {

                const rect = emojiBtn.getBoundingClientRect();

                emojiPicker.style.left = rect.left + "px";

                emojiPicker.style.top = rect.top - 220 + "px"; // adjust vertical position

                emojiPicker.style.display = "block";

            }

        });

 

        // Event delegation for emoji clicks

        emojiPicker.addEventListener("click", (e) => {

            const target = e.target;

            if (target.classList.contains("emoji-item")) {

                chatInput.value += target.textContent;

                emojiPicker.style.display = "none";

                chatInput.focus();

            }

        });

 

        // Hide picker when clicking outside

        document.addEventListener("click", (e) => {

            if (e.target !== emojiBtn && !emojiPicker.contains(e.target)) {

                emojiPicker.style.display = "none";

            }

        });

    }

 

 

    // --- Chat send wiring ---

    function initChat() {

        if (!sendChatBtn || !chatInput) return;

        sendChatBtn.addEventListener("click", async () => {

            const msg = chatInput.value.trim();

            if (!msg) return;

            if (!currentPartnerId) { alert("You are not connected to a partner."); return; }

            appendMessage("You", msg);

            chatInput.value = "";

            await sendChatToPartner(currentPartnerId, msg);

        });

 

        chatInput.addEventListener("keydown", (e) => {

            if (e.key === "Enter") {

                e.preventDefault();

                sendChatBtn.click();

            }

        });

    }

 

    // --- Resizing (vertical between videos, horizontal between left/right) ---

    function initResizers() {

        if (!verticalDivider || !leftPanel || !remoteBlock || !localBlock || !splitter || !rightPanel) return;

 

        // vertical divider: change remote/local flex

        let draggingV = false, vStartY = 0, vStartRemoteH = 0;

        verticalDivider.addEventListener("mousedown", (e) => {

            draggingV = true; vStartY = e.clientY; vStartRemoteH = remoteBlock.offsetHeight; document.body.style.userSelect = "none";

        });

        document.addEventListener("mouseup", () => { draggingV = false; document.body.style.userSelect = "auto"; });

        document.addEventListener("mousemove", (e) => {

            if (!draggingV) return;

            const dy = e.clientY - vStartY;

            const total = leftPanel.clientHeight;

            const newRemote = vStartRemoteH + dy;

            const remoteFlex = newRemote / total;

            const localFlex = 1 - remoteFlex;

            if (remoteFlex > 0.12 && remoteFlex < 0.88) {

                remoteBlock.style.flex = remoteFlex;

                localBlock.style.flex = localFlex;

            }

        });

 

        // horizontal splitter: adjust leftPanel width

        let draggingH = false, hStartX = 0, hStartLeftW = 0;

        splitter.addEventListener("mousedown", (e) => {

            draggingH = true; hStartX = e.clientX; hStartLeftW = leftPanel.offsetWidth; document.body.style.userSelect = "none";

        });

        document.addEventListener("mouseup", () => { draggingH = false; document.body.style.userSelect = "auto"; });

        document.addEventListener("mousemove", (e) => {

            if (!draggingH) return;

            const dx = e.clientX - hStartX;

            let newW = hStartLeftW + dx;

            const min = 220;

            const max = window.innerWidth - 320;

            if (newW < min) newW = min; if (newW > max) newW = max;

            leftPanel.style.width = newW + "px";

        });

    }

 

    // --- Init everything when DOM ready ---

    document.addEventListener("DOMContentLoaded", async () => {

        // query DOM

        startBtn = document.getElementById("startBtn");

        nextBtn = document.getElementById("nextBtn");

        stopBtn = document.getElementById("stopBtn");

        girlsBtn = document.getElementById("girlsBtn");

 

        localVideo = document.getElementById("localVideo");

        remoteVideo = document.getElementById("remoteVideo");

        localPlaceholder = document.getElementById("localPlaceholder");

        remotePlaceholder = document.getElementById("remotePlaceholder");

 

       

 

       

        chatInput = document.getElementById("chatText");

        sendChatBtn = document.getElementById("sendChat");

        messagesDiv = document.getElementById("messages");

 

        emojiBtn = document.getElementById("emojiBtn");

        emojiPicker = document.getElementById("emojiPicker");

 

        leftPanel = document.getElementById("leftPanel");

        verticalDivider = document.getElementById("verticalDivider");

        remoteBlock = document.getElementById("remoteVideoBlock");

        localBlock = document.getElementById("localVideoBlock");

        splitter = document.getElementById("splitter");

        rightPanel = document.getElementById("rightPanel");

 

        // sanity check

        if (!startBtn || !nextBtn || !stopBtn || !localVideo || !remoteVideo) {

            error("Required DOM elements missing - check IDs in HTML");

            return;

        }

 

        // age verify once (on page load)

        if (!ensureAgeVerified()) {

            // if not OK, redirect or stop further initialization

            log("Age verification failed - interactive usage disabled.");

            return;

        }

 

        // wire UI

        startBtn.addEventListener("click", onStartClicked);

        nextBtn.addEventListener("click", onNextClicked);

        stopBtn.addEventListener("click", onStopClicked);
        
 

        // optional girls only quick filter (sets genderSelect)

        /*

        if ( genderSelect) {

            genderSelect.value = "female";           

        }

        */

      

 

        // init chat, emoji, resizers, signalr

        initChat();

        initEmojiPicker();

        initResizers();

        initSignalR();

 

        log("UI initialized");

    });

 

    // expose some helpers for debugging from console

    window.LP = {

        getConnection: () => connection,

        getPartner: () => currentPartnerId,

        getPC: () => pc,

        startCamera,

        stopCamera,

        endCallLocal

    };

 

    //let localStream;

   

    let videoTrackEnabled = true;

    let audioTrackEnabled = true;

 

    // === CAMERA / MIC TOGGLE ===

    document.getElementById("toggleCamera").addEventListener("click", () => {

        const btn = document.getElementById("toggleCamera");

        if (!localStream) return;

        const videoTrack = localStream.getVideoTracks()[0];

        if (videoTrack) {

            videoTrack.enabled = !videoTrack.enabled;

            btn.classList.toggle("off", !videoTrack.enabled);

        }

    });

 

    document.getElementById("toggleMic").addEventListener("click", () => {

        const btn = document.getElementById("toggleMic");

        if (!localStream) return;

        const audioTrack = localStream.getAudioTracks()[0];

        if (audioTrack) {

            audioTrack.enabled = !audioTrack.enabled;

            btn.classList.toggle("off", !audioTrack.enabled);

        }

    });

 

    /*

    //remote mic toggle

    document.getElementById("remoteToggleMic").addEventListener("click", () => {

        const btn = document.getElementById("remoteToggleMic");

        if (!localStream) return;

        const audioTrack = localStream.getAudioTracks()[0];

        if (audioTrack) {

            audioTrack.enabled = !audioTrack.enabled;

            btn.classList.toggle("off", !audioTrack.enabled);

        }

    });

    */

  

})();