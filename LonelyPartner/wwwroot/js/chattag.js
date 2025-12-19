// ===============================

// 🔹 Chat Tag js

// ===============================
(() => {
    const interests = [];

    window.ChatTags = {
        init,
        getInterests
    };

    function init(inputId, containerId) {
        const input = document.getElementById(inputId);
        const container = document.getElementById(containerId);

        if (!input || !container) return;

        input.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();

            const value = input.value.trim().toLowerCase();
            if (!value || interests.includes(value)) return;

            interests.push(value);
            container.appendChild(createTag(value));
            input.value = "";
        });

        function createTag(text) {
            const tag = document.createElement("span");
            tag.className = "interest-tag";
            tag.innerHTML = `
                ${text}
                <span class="remove">✖</span>
            `;

            tag.querySelector(".remove").onclick = () => {
                const index = interests.indexOf(text);
                if (index > -1) interests.splice(index, 1);
                tag.remove();
            };

            return tag;
        }
    }

    function getInterests() {
        return [...interests]; // safe copy
    }
})();
