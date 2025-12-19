(function () {
    const PAGE_KEY = "mainPageOpened";

    // Mark this tab as active
    localStorage.setItem(PAGE_KEY, Date.now().toString());

    //stopCamera stops local camera in videochat and calls endCallLocal in videochat, which closes pc
    //connection stops remote camera. So better to call stopCamera
    

    // Wait until LP object and its methods exist
    function waitForLP(callback) {
        const check = setInterval(() => {
            if (window.LP && typeof window.LP.stopCamera === "function" 
                     // && typeof window.LP.disconnectSignalR === "function"
            ) {
                clearInterval(check);
                callback(window.LP);
            }
        }, 200);
    }

    // Handle when another tab starts a session
            window.addEventListener("storage", (event) => {
                if (event.key === PAGE_KEY) {
                    // If newValue exists -> another tab opened
                    if (event.newValue) {
                        //console.log("⚠️ Another tab opened, closing local resources.");
                        showTabAlert();

                        waitForLP((LP) => {
                            LP.stopCamera?.(calledfrom = "multitab");
                            //LP.disconnectSignalR?.();
                        });
                    } else {
                        // event.newValue === null → a tab closed
                        //console.log("ℹ️ Tab closed, no action needed.");
                    }
                }
            });

    // Clean up when tab is closed
    window.addEventListener("beforeunload", () => {
        localStorage.removeItem(PAGE_KEY);
    });

    // Display the "other tab active" modal
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
                    <h3 style="color:#ffcc00; margin-bottom:12px;">⚠️ Session Moved</h3>
                    <p style="line-height:1.6;color:#ffcc00">
                        Your session has started in another tab.<br/>
                        This tab will now disconnect.
                    </p>
                    <button id="restartSearchBtn" style="
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
                        Restart
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
            #restartSearchBtn:hover {
                background-color: #ffd633 !important;
                transform: scale(1.05);
            }
         `;
          document.head.appendChild(style);
        } else {
         modal.style.display = "flex";
         }

    document.getElementById("restartSearchBtn")?.addEventListener("click", () => {
        modal.style.display = "none";
        localStorage.setItem(PAGE_KEY, Date.now().toString());
        // Reload page
         window.location.reload();
    });

    }
})();
