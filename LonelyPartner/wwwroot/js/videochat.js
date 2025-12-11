// wwwroot/j
// /videochat.js

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

    let chatInput, sendChatBtn, messagesDiv, statusText, infoDiv, emojiBtn, emojiPicker , mobileBox , switchCameraBtn;
    let remoteToggleMic , toggleCamera, toggleMic;

    let leftPanel, verticalDivider, localBlock, remoteBlock, splitter, rightPanel;

    let isMatched = false; // global flag to prevent re-search overwrite

    let fallbackTimer = null; //for fallback match,set to 5sec in on.waiting

 
 

 

    //=================================================//
    //*******SignalR + WebRTC state********************//
    //=================================================//

    let connection = null;

    //let currentPartnerId = null;
    window.currentPartnerId = null;

    let isInitiator = false;

    let localStream = null;
    
    //for bck camera on mobile
    let usingBackCamera = false;

    let pc = null;

    //from 447 line
    //const peer = null;

    const pendingCandidates = {}; // partnerId -> [candidate,...]

 

    // STUN config
    /*    //STUN ONLY
    const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

    */
     
    //Use both STUN + TURN:
    const RTC_CONFIG = {
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"   // This is the public Google STUN server
                },  
                {
                    urls: [
                        "turn:lonelypartner.com:3478?transport=udp", // TURN server using UDP
                        "turn:lonelypartner.com:3478?transport=tcp"  // TURN server using TCP
                    ],
                    username: "lpturnserver",         // Replace with the username you set in your TURN server
                    credential: "password1234"    // Replace with the password you set in your TURN server
                }
            ]
        };
    

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

    //clear chat messages
    function clearChatMessages() {
            //const chatArea = document.getElementById("chatMessages");
            if (messagesDiv) messagesDiv.innerHTML = "";
            if(mobileBox) mobileBox.innerHTML ="";
    }
    //append message for mobile
    function appendMobile(sender, text) {
        if (!mobileBox) return;

        const bubble = document.createElement("div");
        bubble.className = `message ${sender === "You" ? "me" : "other"}`;
        bubble.innerHTML = `<strong>${escapeHtml(sender)}:</strong> ${escapeHtml(text)}`;
        //bubble.textContent = msg;

        mobileBox.appendChild(bubble);
        mobileBox.style.display = "block";

        mobileBox.scrollTop = mobileBox.scrollHeight;
    }
    // append message
    //function appendMessage(sender, text) {
    // MAKE GLOBAL — so mobile.js can use it
    window.appendMessage = function (sender, text) {

        // mobile 
        
        if (window.innerWidth <= 768) {        
            appendMobile(sender, text);
        } 
        //for desktop
        if (!messagesDiv) return;

        const el = document.createElement("div");
        el.className = `message ${sender === "You" ? "me" : "other"}`;
        el.innerHTML = `<strong>${escapeHtml(sender)}:</strong> ${escapeHtml(text)}`;

        messagesDiv.appendChild(el);

        messagesDiv.scrollTop = messagesDiv.scrollHeight;

    }

 

    // --- consent/Age verification (one-time via localStorage) ---

    function ensureAgeVerified() {

        try {

            if (localStorage.getItem("lp_ageVerified") === "true") return true;

        } catch (e) {

            console.warn("LocalStorage not available:", e);

        }

        const modal = document.getElementById("consentModal");

        const yesBtn = document.getElementById("consentConfirmYes");

        const noBtn = document.getElementById("consentConfirmNo");

        if (!modal || !yesBtn || !noBtn) {

            //console.error("Consent verification modal not found in DOM.");

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

                //alert("You must be 18+ to use this service.");

                resolve(false);

            };

        });

    }

    // --- CAMERA SWITCH ---
    
function enableCameraSwitch() {
    const switchBtn = document.getElementById("switchCameraBtn");

    switchBtn.onclick = async () => {
        try {
                if (!pc) {
                    //alert("Peer connection not ready yet!");
                    return;
                }
                    usingBackCamera = !usingBackCamera;
                    // Stop old stream
                    if (localStream) {
                        localStream.getTracks().forEach(t => t.stop());
                    }
                    
                    const constraints = {
                        video: {
                            facingMode: usingBackCamera 
                                ? { ideal: "environment" } 
                                : { ideal: "user" },
                            width: { ideal: 1920, max: 3840 },
                            height: { ideal: 1080, max: 2160 },
                            frameRate: { ideal: 60, max: 60 }
                        },
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true
                        }
                    };
            
                    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            
                    // Update video preview
                    const localVideo = document.getElementById("localVideo");
                    localVideo.srcObject = newStream;
            
                    // Update RTCPeerConnection
                    if ( pc) {
            
                        const senders = pc.getSenders();

                        const videoTrack = newStream.getVideoTracks()[0];
                        const audioTrack = newStream.getAudioTracks()[0];
            
                        const videoSender = senders.find(s => s.track?.kind === "video");
                        if (videoSender) await videoSender.replaceTrack(videoTrack);
            
                        const audioSender = senders.find(s => s.track?.kind === "audio");
                        if (audioSender) await audioSender.replaceTrack(audioTrack);
                        
                    }

                    localStream = newStream;
            
            } catch (err) {
                    console.error(err);
                }
    }
}



    // --- Camera controls ---

    async function startCamera() {

        //if (localStream) { console.log("camera already running"); return localStream; }

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

                try { await localVideo.play(); } catch (e) { console.log("localVideo.play() prevented:", e); }

            }

            //console.log("Local camera started", s.getTracks().map(t => t.kind));

            return s;

        } catch (e) {

            error("getUserMedia failed:", e);

            throw e;

        }

    }

 

    function stopCamera(calledfrom = "") {

        // 1️⃣ Stop local video stream
        if (localStream) {

            localStream.getTracks().forEach(t => t.stop());

            localStream = null;

        }
        // 2️⃣ Hide local video preview
        if (localVideo) {

            localVideo.srcObject = null;

            localVideo.style.display = "none";

            if (localPlaceholder) localPlaceholder.style.display = "block";

        }

        //console.log("Local camera stopped");
        //stops pc connection and stops remote camera
        //if called from multitab, neeed not call endCallLocal, as the flow goes 
        // to hub->Stop->Partnerleft->endCallLocal
        
        // 3️⃣ Handle disconnect logic
        if (calledfrom === "multitab") {
            //console.log("call came from multiTab");
            
            // In multitab case, just tell the hub user left
            try {
                    if (connection && connection.state === signalR.HubConnectionState.Connected) 
                        {
                         connection.invoke("Stop");
                    } else 
                        {
                        console.warn("SignalR not connected when multi tab opened");
                    }
                } catch (e) {
                    console.error("Stop failed:", e);
                }
        }
        else 
            {
            // Normal flow: stop call locally 
            endCallLocal();
            }
   

    }

        // 🔹 Stop remote partner's video stream
    function stopRemoteVideo() {
        const remoteVideo = document.getElementById("remoteVideo");
        if (remoteVideo && remoteVideo.srcObject) {
            const tracks = remoteVideo.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            remoteVideo.srcObject = null;
            //console.log("🎥 Remote video stopped.");
        }
    }

    // 🔹 Stop local chat input and hide typing area
    function stopTextChat() {
        
        //if (chatInput) chatInput.disabled = true;
        //if (sendChatBtn) sendBtn.disabled = true;

        //setStatus("Chat ended.");
        //console.log("💬 Chat disabled.");
    }

    // 🔹 Enable local chat input 
    function starttextChat() {
        
        //if (chatInput) chatInput.enabled = true;
        //if (sendChatBtn) sendBtn.enabled = true;

        //setStatus("Chat ended.");
        //console.log("💬 Chat enabled.");
    }



    // 🔹 Optional: show a subtle 'You left the chat' message
    function showStoppedMessage() {
        setStatus("You left the chat.", "info");
        //console.log("🛑 User stopped chat manually.");
    }

    // For status message

    //function setStatus(message, type = "info") {
    // MAKE GLOBAL — used by mobile.js also
    window.setStatus = function (message, type = "info") {
        
        if (!statusText) return;
        
        statusText.className = `alert alert-${type} text-center mb-3`;
        statusText.textContent = message;
        statusText.style.display = "block";
    }

    function clearStatus() {
        const el = document.getElementById("statusText");
        if (el) el.style.display = "none";
    }
 

    // --- PeerConnection lifecycle ---

    function createPeerConnection(partnerId) {

        //console.log("createPeerConnection for", partnerId);

        const peer = new RTCPeerConnection(RTC_CONFIG);

 

        peer.ontrack = (ev) => {

            //console.log("ontrack", ev.streams);

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

                //log("onicecandidate sent", partnerId);

            }

        };

 

        peer.onconnectionstatechange = () => {

            //log("pc state:", peer.connectionState);

            if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {

                // handle as partner left

                // don't auto-close here; Next/Stop will manage

                //console.log("pc failed/disconnected");

            }

        };

 

        // add pending candidates (if any)

        const pending = pendingCandidates[partnerId];

        if (pending && pending.length) {

            setTimeout(async () => {

                for (const c of pending) {

                    try { 
                        await peer.addIceCandidate(new RTCIceCandidate(c)); 
                        //log("applied queued candidate"); 
                        }

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

            try { await startCamera(); } catch (e) { console.error("no local stream for offer"); return; }

        }

        pc = createPeerConnection(partnerId);

        // add local tracks

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

 

        // create offer

        const offer = await pc.createOffer();

        await pc.setLocalDescription(offer);

 

        // send as JSON string

        await sendSignal(partnerId, "offer", JSON.stringify(offer));

        //log("Offer created & sent to", partnerId);

        // Now it's safe: enable the camera switch button
            enableCameraSwitch();

    }

 

    // handle incoming offer (callee)

    async function handleOffer(fromId, offerStr) {

        //console.log("handleOffer from", fromId);

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

        //console.log("Answer created & sent to", fromId);

    }

 

    // handle incoming answer (initiator)

    async function handleAnswer(answerStr) {

        //console.log("handleAnswer");

        if (!pc) { warn("No pc when answer arrived"); return; }

        const answer = safeParse(answerStr);

        try {

            await pc.setRemoteDescription(new RTCSessionDescription(answer));

            //console.log("Remote description set (answer)");

        } catch (e) {

            console.error("setRemoteDescription(answer) failed:", e);

        }

    }

 

    // handle incoming candidate

    async function handleCandidate(fromId, candidateStr) {

        const cand = safeParse(candidateStr);

        if (!cand) return;

        if (!pc) {

            //console.log("pc not ready, queue candidate for", fromId);

            ensurePendingArray(fromId).push(cand);

            return;

        }

        try {

            await pc.addIceCandidate(new RTCIceCandidate(cand));

            //console.log("Added ICE candidate");

        } catch (e) {

            console.error("addIceCandidate failed:", e);

        }

    }

 

    // end current call

    function endCallLocal() {
        
        //set status empty set when app opened in two tabs.
        setStatus("", "info");
        statusText.style.display = "none";
        //local and remote cam and  mic icon display off
        remoteToggleMic.style.display = "none"
        //toggleCamera.style.display = "none";
        //toggleMic.style.display = "none";
        //clear chat
        if (infoDiv) {
            infoDiv.textContent = "";
            infoDiv.style.display = "none";
            }

        //clear text chat messages
        clearChatMessages();
            //close connection
        if (pc) try {

            pc.close();
            //added new
            pc.stop();
            //console.log("🔴 Disconnected from hub");
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

       

        //console.log("Call ended locally");

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

   // async function sendChatToPartner(partnerId, message) {
   // MAKE GLOBAL — send chat to partner from mobile & desktop
    window.sendChatToPartner = async function (partnerId, message) {

        if (!connection) { error("SignalR connection missing"); return; }

        try {

            // primary method name

            await connection.invoke("SendChatMessage", partnerId, message);

        } catch (e1) {

            //log("SendChatMessage failed, trying alternative 'SendChat'...", e1);

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

            .configureLogging(signalR.LogLevel.Error) // Only show errors

            .build();

 
        //connection.on("Error", (message) => { from = start stop next
        connection.on("Waiting", async (from) => {
                //console.log("⏳ No match found. Waiting...");

                mygenderSelectEl = document.getElementById("myGenderSelect");

                genderSelectEl = document.getElementById("genderSelect");

                continentSelectEl = document.getElementById("continentSelect");

                let myGender = mygenderSelectEl?.value || "All";

                let desiredGender = genderSelectEl?.value || "All";

                let desiredContinent = continentSelectEl?.value || "All";

                //Read User Info

                const appUser = window.appUser || {};

                const isLoggedIn = appUser.isAuthenticated === true;

                const productId = parseInt(window.appUser?.productId || 0);

                const endDate = appUser.endDate ? new Date(appUser.endDate) : null;

                const hasActivePlan = (isLoggedIn && productId > 0 && endDate > new Date());

                //console.log(" Waiting js=>hasActivePlan" , hasActivePlan);
                // 6️⃣ Give WebRTC time to fully close before restarting
                await new Promise(r => setTimeout(r, 1000)); // waits 1 second

            if(!isMatched) 
                {
                    //console.log("⏳ No match found, going for Waiting...");
                        // Only trigger fallback for paid/admin users
                if (hasActivePlan) 
                {
                    
                      //if waiting comes from hub-start we should do RelaxedSearch
                     if(from == "start")
                        {   
                            //console.log("⏳ No Strict match found. going for relaxed search...");
                            // After 10 seconds, call relaxed version
                            fallbackTimer = setTimeout(async () => {
                            try {   
                                    //if is for, in case match happens in the delay period, then dont call relaxed search.
                                    if(!isMatched) {
                                    setStatus(`Expanding search for ${desiredGender} in all continents...`, "info");
                                    await connection.invoke("StartSearchingRelaxed", myGender, desiredGender);
                                        }
                                } catch (err) {
                                    //console.error("Relaxed search failed:", err);
                                    setStatus("Relaxed search failed. Please try again.", "error");
                                    myGenderSelect.style.display = "inline-block";  // dont hide mygender
                                }
                             }, 10000);
                        }
                        //if waiting comes from hub-Next, meaning next button click, should start from 
                        //StrictSearch, then relaxedsearch
                     if(from == "next")
                        {   
                            //console.log("⏳ Next button match with Strict search...");
                            //just to make await work adding dealy of 3millisecs
                            fallbackTimer = setTimeout(async () => {
                            try {
                                setStatus(`Searching for ${desiredGender} in ${desiredContinent}...`, "info");
                                await connection.invoke("StartSearchingStrict", myGender, desiredGender, desiredContinent);
                        
                                
                            } catch (err) {
                                //console.error("RSearch failed:", err);
                                setStatus("Search failed. Please try again.", "error");
                                myGenderSelect.style.display = "inline-block";  // dont hide mygender
                            }
                        }, 300);  
                      }
                    }
                    //non paid user clicks next button=from js->nexthub->here
                    if (from == "next" && !hasActivePlan)
                        {   
                            //just to make await work adding dealy of 1sec
                            fallbackTimer = setTimeout(async () => {
                            // Free or anonymous user/non paid user, comes from=next
                            try
                            {
                                setStatus("Searching for a partner...", "info");
                                await connection.invoke("StartSearchingFree", myGender, desiredContinent);
                            }
                            catch (err) {
                                        //console.error("Search failed:", err);
                                        setStatus("Search failed. Please try again.", "error");
                                        myGenderSelect.style.display = "inline-block";  // dont hide mygender
                                    }
                                }, 1000);
                        }
                }
                
            
                if (isMatched) return; // 🚫 Don’t show searching if already matched
                //setStatus("🔎 Searching for a partner...", "info");

                //from = stop, means user will be in waiting.
            });
 

        // Matched payload may be object with .partner / .Partner and isInitiator / IsInitiator

        connection.on("Matched", async (payload, role, partnerCountry, partnerCity, partnerGenderIcon) => {
            // ✅ mark matched state so “Searching...” won't override later
            isMatched = true;
            setStatus("🎉 Partner found!", "success");
            //remote mic and cam icon display on for both local and remote
            remoteToggleMic.style.display = "inline-block";
            //toggleCamera.style.display = "inline-block";
            //toggleMic.style.display = "inline-block";
            // show partner’s location
            infoDiv.style.display = "inline-block";
            /*
            if (infoDiv) {
                    infoDiv.textContent = `🌍 ${partnerCity}, ${partnerCountry} , ${partnerGenderIcon}`;
                }
            */
            
            //console.log("Matched with partner:",  partnerCity, partnerCountry, partnerGenderIcon);

            if (infoDiv) {
                    // Set location text + icon
                    infoDiv.innerHTML = `🌍 ${partnerCity}, ${partnerCountry} , <span id="genderIcon">${partnerGenderIcon}</span>`;

                    const genderSpan = document.getElementById("genderIcon");

                    // Make bigger + bold for ALL icons
                    genderSpan.style.fontSize = "1.8rem";
                    genderSpan.style.fontWeight = "bold";

                    // Apply color based on icon
                    if (partnerGenderIcon === "♂️") {
                        genderSpan.style.color = "dodgerblue";   // blue male
                    } else if (partnerGenderIcon === "♀️") {
                        genderSpan.style.color = "hotpink";      // pink female
                    }
                    else if (partnerGenderIcon === "💑") {
                        genderSpan.style.color = "hotpink";      // pink couple
                    }
                }

            try {

                //console.log("Matched payload:", payload);

                isCaller = role === "Caller";

                const partner = payload.partner ?? payload.Partner ?? (typeof payload === "string" ? payload : null);

                const initiator = payload.isInitiator ?? payload.IsInitiator ?? false;

                if (!partner) {

                    //console.warn("Matched received but partner id missing:", payload);

                    return;

                }

                currentPartnerId = partner;

                isInitiator = !!initiator;

                //console.log("Matched -> partner:", currentPartnerId, "initiator:", isInitiator);

 
                // Start WebRTC flow
                
                if (isInitiator || isCaller ) {

                    await createOfferFlow(currentPartnerId);

                } else {

                    // wait for offer; nothing to do here explicitly

                    //console.log("Awaiting offer from partner");

                }

            } catch (e) {

                console.error("Matched handler error:", e);

            }

        });

 

        // ReceiveSignal(senderId, type, data)

        connection.on("ReceiveSignal", async (senderId, type, data) => {

            // ✅ Safety check: only accept signals from current partner
            if (!currentPartnerId) {
                //console.warn("⚠️ Ignored signal (no active partner):", senderId, type);
                return;
            }

            if (senderId !== currentPartnerId) {
                //console.warn("🚫 Ignored signal from non-partner:", senderId, "Expected:", currentPartnerId);
                return;
            }

            // ✅ Proceed only if signal comes from current partner
            //console.log("📡 ReceiveSignal:", senderId, type);

            try {
                    switch (type) {
                        case "offer":
                            await handleOffer(senderId, data);
                            break;
                        case "answer":
                            await handleAnswer(data);
                            break;
                        case "candidate":
                            await handleCandidate(senderId, data);
                            break;
                        default:
                            warn("Unknown signal type:", type);
                            break;
                    }
                } catch (err) {
                    console.error("❌ Error handling signal:", type, err);
                }

        });

        //Partnerlwft
        connection.on("PartnerLeft", async () => {
            /*
            // Prevent false PartnerLeft during match setup
            if (isMatched === true && currentPartnerId) {
                console.log("⚠️ Ignoring PartnerLeft — currently matched in progress");
                return;
            } */
            //console.log("⚠️ Partner left the chat.");

            //Reset partner status
            isMatched = false;
            //currentPartnerId = null;

            //location reset
            //if (infoDiv) infoDiv.textContent = "";
            // 5️Show waiting UI while finding next match
            setStatus("Partner left. Searching for next partner...", "info");
            
            

            // 1️⃣ Stop local media and peer connection
            endCallLocal(); // your existing function for ending WebRTC call

            
            // 2️⃣ Stop remote video cleanly (if stream still visible)
            stopRemoteVideo();

            // 3️⃣ Stop chat / disable typing
            //stopTextChat();

            
            // 6️⃣ Give WebRTC time to fully close before restarting
            await new Promise(res => setTimeout(res, 500));

            // 7️⃣ Try to start searching for the next partner
            try {
                await start(); // your existing start() reconnects to hub for next partner
            } catch (e) {
                err("Next partner search failed:", e);
            }
});


        
    
 
    //called from hub from Next and stop
        connection.on("ChatStopped", () => {
            //for statusText
            isMatched = false;
            endCallLocal();
            setStatus("You left the chat. Click Start again...", "info");
            //resetUI("You left the chat. Click Start to join again.");
            //appendMessage("System", "Chat stopped.");
        });

 

        connection.on("Error", (message) => {

            setStatus("Error...", "info");
            //console.error("Hub Error:", message);

            //End the call safely
            if (typeof endCallLocal === "function") {

                endCallLocal();
            }

        });

 

        //chat messages

        connection.on("ReceiveChatMessage", (senderId, message) => {

            //console.log("ReceiveChatMessage from", senderId, message);

            appendMessage("Partner", message);

        });

 
        //when server connection is lost or server is down
        connection.onclose(async () => {
                //console.warn("⚠️ Connection to server lost.");

                setStatus("⚠️ Disconnected from server. Please refresh the page.", "danger");

                // Stop local camera and mic
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                    localStream = null;
                }

                // Clean up peer connection
                if (peerConnection) {
                    peerConnection.close();
                    peerConnection = null;
                }

                // Optionally disable UI buttons
                document.getElementById("startBtn").disabled = true;
                document.getElementById("stopBtn").disabled = true;
            });

        // ===============================
        // setStatus message coming from hub
        // ===============================
        connection.on("StatusUpdate", (message, type) => {
        setStatus(message, type);
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
        //not using it for now
        connection.on("PlanActivated", (payload) => {

            //console.log("PlanActivated payload:", payload);

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

        if (!val || val == "All") {

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

        //select mygenderSelect

        if (!validateMyGender()) return;

 

        // start camera (user gesture)

        try {

            await startCamera();

        } catch (e) {

            //alert("Camera is required to start. Please reset-settings in browser-settings, and refresh the page.");
            showTabAlert();
                ////////////////////////////////
                // Display alert modal
                function showTabAlert() {
                        let modal = document.getElementById("tabAlertModal");
                        if (!modal) {
                            modal = document.createElement("div");
                            modal.id = "tabAlertModal";
                            modal.style.position = "fixed";
                            modal.style.top = 0;
                            modal.style.left = 0;
                            modal.style.width = "100%";
                            modal.style.height = "100%";
                            modal.style.background = "rgba(0, 0, 0, 0.6)";
                            modal.style.display = "flex";
                            modal.style.justifyContent = "center";
                            modal.style.alignItems = "center";
                            modal.style.zIndex = "9999";
                            modal.style.backdropFilter = "blur(3px)";

                            modal.innerHTML = `
                                <div style="
                                    background:#2e1065;
                                    color:#fff;
                                    padding:30px 35px;
                                    border-radius:14px;
                                    text-align:center;
                                    max-width:400px;
                                    width:90%;
                                    box-shadow:0 0 20px rgba(0,0,0,0.5);
                                    animation: fadeIn 0.3s ease;
                                    font-family: 'Segoe UI', Arial, sans-serif;
                                ">
                                    <h3 style="color:#ffcc00; margin-bottom:12px;">⚠️ Camera Setting</h3>
                                    <p style="line-height:1.6;color:#ffcc00">
                                        Camera is required to start. Please go to  browser-settings >  click reset-settings, and refresh the page.
                                    </p>
                                    <button id="cameraSettingBtn" style="
                                        margin-top:18px;
                                        background-color:#ffcc00;
                                        color:#2e1065;
                                        border:none;
                                        border-radius:6px;
                                        padding:10px 24px;
                                        font-weight:bold;
                                        cursor:pointer;
                                        transition: background-color 0.2s ease, transform 0.1s ease;
                                    ">
                                        Ok
                                    </button>
                                </div>
                            `;

                            document.body.appendChild(modal);

                            // Add fade-in animation dynamically
                            const style = document.createElement("style");
                            style.textContent = `
                            @keyframes fadeIn {
                                from { opacity: 0; transform: scale(0.95); }
                                to { opacity: 1; transform: scale(1); }
                            }
                            #cameraSettingBtn:hover {
                                background-color: #ffd633 !important;
                                transform: scale(1.05);
                            }
                        `;
                        document.head.appendChild(style);
                        } else {
                        modal.style.display = "flex";
                        }

                    document.getElementById("cameraSettingBtn")?.addEventListener("click", () => {
                        modal.style.display = "none";
                        //reloads the page after 1.5 secs
                        //setTimeout(() => location.reload(), 200);
                    });

            }
            return;

        }

        // ✅ Connect to hub now, if not already connected
            try {
                if (!connection) await initSignalR(); // build connection if missing
                if (connection.state !== signalR.HubConnectionState.Connected) {
                    await connection.start();
                    //log("✅ SignalR connection started on Start click");
                } else {
                    //log("SignalR already connected, skipping start()");
                }

                //call hub very important
                await start();

            //enable Next button       
            nextBtn.style.display = "inline-block";
            //start button hide
            startBtn.style.display = "none";
            //enable stop button
            stopBtn.disabled = false;
            //stopBtn.Enabled = true;

            }

             catch (e) {
                    //console.error("Start error:", e);
                    //alert("Server Error, please referesh the page");
                     showTabAlert();
                ////////////////////////////////
                // Display alert modal
                function showTabAlert() {
                        let modal = document.getElementById("tabAlertModal");
                        if (!modal) {
                            modal = document.createElement("div");
                            modal.id = "tabAlertModal";
                            modal.style.position = "fixed";
                            modal.style.top = 0;
                            modal.style.left = 0;
                            modal.style.width = "100%";
                            modal.style.height = "100%";
                            modal.style.background = "rgba(0, 0, 0, 0.6)";
                            modal.style.display = "flex";
                            modal.style.justifyContent = "center";
                            modal.style.alignItems = "center";
                            modal.style.zIndex = "9999";
                            modal.style.backdropFilter = "blur(3px)";

                            modal.innerHTML = `
                                <div style="
                                    background:#2e1065;
                                    color:#fff;
                                    padding:30px 35px;
                                    border-radius:14px;
                                    text-align:center;
                                    max-width:400px;
                                    width:90%;
                                    box-shadow:0 0 20px rgba(0,0,0,0.5);
                                    animation: fadeIn 0.3s ease;
                                    font-family: 'Segoe UI', Arial, sans-serif;
                                ">
                                    <h3 style="color:#ffcc00; margin-bottom:12px;">⚠️ Connection Error</h3>
                                    <p style="line-height:1.6;color:#ffcc00">
                                        Connection Error, please referesh the page.
                                    </p>
                                    <button id="connectErrBtn" style="
                                        margin-top:18px;
                                        background-color:#ffcc00;
                                        color:#2e1065;
                                        border:none;
                                        border-radius:6px;
                                        padding:10px 24px;
                                        font-weight:bold;
                                        cursor:pointer;
                                        transition: background-color 0.2s ease, transform 0.1s ease;
                                    ">
                                        Ok
                                    </button>
                                </div>
                            `;

                            document.body.appendChild(modal);

                            // Add fade-in animation dynamically
                            const style = document.createElement("style");
                            style.textContent = `
                            @keyframes fadeIn {
                                from { opacity: 0; transform: scale(0.95); }
                                to { opacity: 1; transform: scale(1); }
                            }
                            #connectErrBtn:hover {
                                background-color: #ffd633 !important;
                                transform: scale(1.05);
                            }
                        `;
                        document.head.appendChild(style);
                        } else {
                        modal.style.display = "flex";
                        }

                    document.getElementById("connectErrBtn")?.addEventListener("click", () => {
                        modal.style.display = "none";
                        //reloads the page after 1.5 secs
                        //setTimeout(() => location.reload(), 200);
                    });

            }


                    //return;

                }

    }

 

    // invoke StartSearching on hub

    async function start() {

       try {
            clearTimeout(fallbackTimer);

            mygenderSelectEl = document.getElementById("myGenderSelect");

            genderSelectEl = document.getElementById("genderSelect");

            continentSelectEl = document.getElementById("continentSelect");

            let myGender = mygenderSelectEl?.value || "Male";

            let desiredGender = genderSelectEl?.value || "All";

            let desiredContinent = continentSelectEl?.value || "All";

            mygenderSelectEl.addEventListener("change", (e) => {
                myGender = e.target.value;
                //console.log("Updated gender:", myGender);
            });

            //Read User Info

            const appUser = window.appUser || {};

            const isLoggedIn = appUser.isAuthenticated === true;

            const productId = parseInt(window.appUser?.productId || 0);

            const endDate = appUser.endDate ? new Date(appUser.endDate) : null;

            const hasActivePlan = (isLoggedIn && productId > 0 && endDate > new Date());

            

            //console.log("isLoggedIn=>", isLoggedIn);

            //console.log("hasActivePlan=>", hasActivePlan);

            //console.log("productId=>", productId);

 

            //Only send custom filters if User has Active Plan

            if (!hasActivePlan) {

                desiredGender = "All";

                //desiredContinent is set to deafult based on ip in accessbutton.js
                //desiredContinent = continentSelectEl?.value || "All";

                //optional setting value for UI

                if (genderSelectEl) genderSelectEl.value = "All";

                //if (continentSelectEl) continentSelectEl.value = "All";

            }

          
            if (hasActivePlan) {
                // Paid or admin user - start strict search
                setStatus(`Searching for ${desiredGender} in ${desiredContinent}...`, "info");
                //console.log("StartSearchingStrict my gender=>",myGender, "-",  desiredGender , "-", desiredContinent);
                await connection.invoke("StartSearchingStrict", myGender, desiredGender, desiredContinent);
                myGenderSelect.style.display = "none";  // hide gender select while chatting
                } else {
                // Free or anonymous user
                setStatus("Searching for a partner...", "info");
                //console.log("StartSearchingFree my gender=>",myGender, "-", desiredGender , "-", desiredContinent);
                await connection.invoke("StartSearchingFree", myGender, desiredContinent);
                myGenderSelect.style.display = "none";  // hide gender select while chatting
                }
            } catch (e) {
                //console.error("Start search failed:", e);
                setStatus("Search failed. Please retry.", "error");
                myGenderSelect.style.display = "inline-block";  // hide gender select while chatting
            }
            

     }

 

    // when Next button is clicked

    async function onNextClicked() {

        isMatched = false;
        
        // 1️⃣ Clear any running fallback timer (strict→relaxed)
        clearTimeout(fallbackTimer);
        // 2️⃣ End local media cleanly
        endCallLocal();
        //PartnerLeft();

        try {

                if (connection) {

                    if (connection.invoke.length) {

                    //// Notify hub that this user is leaving the current match
                        try {
                            await connection.invoke("Next");
                            setStatus("Searching for the next partner...", "info");
                            //console.info("Next() hub is called");
                        } catch (err) {
                            //console.error("Next() failed:", err);
                            setStatus("Next failed. Please retry...", "info");
                        }
                    }
                }
            }
            catch (err) {
                           //console.error("Next() failed:", err);
                            setStatus("Next failed. Please retry...", "info");
                        }
    }    

 
    //Stop button click event
    async function onStopClicked() {

        clearTimeout(fallbackTimer);
        //reset statusText
        isMatched = false;
        setStatus("You left the chat.", "info");
        // stop camera and local call
        stopCamera();
        // not needed ast stopeCamera calls endCallLocal in side it
        //endCallLocal();
        //Next button hide
        nextBtn.style.display = "none";
        //start button hide
        startBtn.style.display = "inline-block";
        //disable stop button
        stopBtn.disabled = true;
        //myGenderSelect dispaly
        myGenderSelect.style.display = "inline-block"; 
        try {
            if (connection && connection.state === signalR.HubConnectionState.Connected) {
                await connection.invoke("Stop");
            } else {
                //console.warn("SignalR not connected when Stop clicked");
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


        //for desktop
        if (!sendChatBtn || !chatInput) return;

        sendChatBtn.addEventListener("click", async () => {

            const msg = chatInput.value.trim();

            if (!msg) return;

            if (!currentPartnerId) { 
                //alert("You are not connected to a partner."); 
                setStatus("Click Start, connect to a partner.", "info");
                return; 
            }

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

 
        infoDiv = document.getElementById("partnerInfo");

        chatInput = document.getElementById("chatText");

        sendChatBtn = document.getElementById("sendChat");

        messagesDiv = document.getElementById("messages");

        statusText = document.getElementById("statusText");

        emojiBtn = document.getElementById("emojiBtn");

        emojiPicker = document.getElementById("emojiPicker");

 

        leftPanel = document.getElementById("leftPanel");

        verticalDivider = document.getElementById("verticalDivider");

        remoteBlock = document.getElementById("remoteVideoBlock");

        localBlock = document.getElementById("localVideoBlock");

        splitter = document.getElementById("splitter");

        rightPanel = document.getElementById("rightPanel");

        //for mobile
        mobileBox = document.getElementById("mobileChatMessages");
        //for mobile back camera
        switchCameraBtn = document.getElementById("switchCameraBtn");
        //remote mic control
        remoteToggleMic = document.getElementById("remoteToggleMic");
        //local cam and  mic control
        //toggleCamera = document.getElementById("toggleCamera");
        //toggleMic = document.getElementById("toggleMic");

        // sanity check

        if (!startBtn || !nextBtn || !stopBtn || !localVideo || !remoteVideo) {

            error("Required DOM elements missing - check IDs in HTML");

            return;

        }

        // consent and  age verify once (on page load)
        /*
        if (!ensureAgeVerified()) {

            // if not OK, redirect or stop further initialization

            console.log("Age verification failed - interactive usage disabled.");

            return;

        } */

        //Disable stop button on page load
        stopBtn.disabled = true;

        // wire UI

        startBtn.addEventListener("click", onStartClicked);

        nextBtn.addEventListener("click", onNextClicked);

        stopBtn.addEventListener("click", onStopClicked);
        
        // init chat, emoji, resizers, signalr

        initChat();

        initEmojiPicker();

        initResizers();

        initSignalR();

        //console.log("UI initialized");

    });

 

    // expose some helpers globally
    // Always define LP immediately
    window.LP = window.LP || {};

    //startCamera
    window.LP.startCamera = startCamera;
    //window.LP.startCamera = startCamera;
    window.LP.stopCamera = stopCamera;
    //onStartClicked
    window.LP.onStartClicked = onStartClicked;
    //onNextClicked
    window.LP.onNextClicked = onNextClicked;
    

    //window.LP.endCallLocal = endCallLocal;
    // Optional: attach more methods
    window.LP.disconnectSignalR = function () {
        //console.log("🔌 LP.disconnectSignalR() called");
        if (window.connection?.stop) {
            window.connection.stop();
        }
    };

   //for mobile-ui.js
    window.appendMessage = appendMessage;
    window.sendChatToPartner = sendChatToPartner;
    window.setStatus = setStatus;

 

    //let localStream;

    let videoTrackEnabled = true;

    let audioTrackEnabled = true;

 

    // === CAMERA / MIC TOGGLE ===
    //local camera
    document.getElementById("toggleCamera").addEventListener("click", () => {

        const btn = document.getElementById("toggleCamera");

        if (!localStream) return;

        const videoTrack = localStream.getVideoTracks()[0];

        if (videoTrack) {

            videoTrack.enabled = !videoTrack.enabled;

            btn.classList.toggle("off", !videoTrack.enabled);

        }

    });

    //local mic

    document.getElementById("toggleMic").addEventListener("click", () => {

        const btn = document.getElementById("toggleMic");

        if (!localStream) return;

        const audioTrack = localStream.getAudioTracks()[0];

        if (audioTrack) {

            audioTrack.enabled = !audioTrack.enabled;

            btn.classList.toggle("off", !audioTrack.enabled);

        }

    });

 

    

    //remote mic toggle

    // --- REMOTE VOLUME SLIDER CONTROL ---
            /*
            document.getElementById("remoteVolumeSlider").addEventListener("input", () => {
                const slider = document.getElementById("remoteVolumeSlider");
                const remoteVideo = document.getElementById("remoteVideo");

                // Convert slider (0–100) to media volume (0–1)
                const volumeValue = slider.value / 100;

                remoteVideo.volume = volumeValue;
                remoteVideo.muted = volumeValue === 0;
            });
            */
            
            // --- REMOTE AUDIO TOGGLE LIKE YOUR ORIGINAL EXAMPLE ---
            document.getElementById("remoteToggleMic").addEventListener("click", () => {
                const btn = document.getElementById("remoteToggleMic");
                const remoteVideo = document.getElementById("remoteVideo");
                
                // Toggle mute on remote video output
                remoteVideo.muted = !remoteVideo.muted;

                btn.classList.toggle("off", remoteVideo.muted);
            }); 


       
  

})();