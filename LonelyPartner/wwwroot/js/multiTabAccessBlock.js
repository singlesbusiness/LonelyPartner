(function () {
    const PAGE_KEY = "mainPageOpened";

    localStorage.setItem(PAGE_KEY, Date.now().toString());

    window.addEventListener("storage", function (event) {
        if (event.key === PAGE_KEY) {
            showTabAlert();
            
            /*
             // defined videochat.js
            if (window.LP && typeof window.LP.endCallLocal === "function") {
                window.LP.endCallLocal();
            } else {
                console.warn("⚠️ LP.endCallLocal() not found");
            }
             */   
            }
    });

    window.addEventListener("beforeunload", function () {
        localStorage.removeItem(PAGE_KEY);
    });

    function showTabAlert() {
        const modal = document.getElementById("tabAlertModal");
        modal.style.display = "flex";
    }

    //setTimeout(() => location.reload(), 1500);
    //endCallLocal();
    /*
    function stopCameras() {
        navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop());
            })
            .catch(err => console.warn("No active camera to stop:", err));
    }
    */

    document.getElementById("restartSearchBtn")?.addEventListener("click", () => {
        document.getElementById("tabAlertModal").style.display = "none";
        setTimeout(() => location.reload(), 150);
        /*
        // defined videochat.js
            if (window.LP && typeof window.LP.onStartClicked === "function") {
                window.LP.onStartClicked();
            } else {
                console.warn("⚠️ LP.endCallLocal() not found");
            }
                */
    });

     
})();
