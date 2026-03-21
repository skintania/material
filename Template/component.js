class SiteHeader extends HTMLElement {
    async connectedCallback() {
        const pageTitle = this.getAttribute('page-title') || 'StudyKits';
        const pageDesc = this.getAttribute('page-desc') || 'เลือกคอร์สที่ต้องการเรียน';

        try {
            const response = await fetch('/Template/header.html');
            this.innerHTML = await response.text();

            this.querySelector('#dynamic-title').textContent = pageTitle;
            this.querySelector('#dynamic-desc').textContent = pageDesc;

            // --- MENU TOGGLE LOGIC ---
            const btn = this.querySelector('#menu-toggle');
            const nav = this.querySelector('.navbar');

            if (btn && nav) {
                btn.onclick = () => {
                    nav.classList.toggle('active');
                    btn.innerHTML = nav.classList.contains('active') ? '✕' : '☰';
                };
            }
        } catch (e) { console.error(e); }
    }
}
customElements.define('site-header', SiteHeader);

class CommentWidget extends HTMLElement {
    async connectedCallback() {
        try {
            const response = await fetch('/Template/commentBtn.html');
            this.innerHTML = await response.text();

            const webhookURL = "https://discord.com/api/webhooks/1483172061303148717/8e1m1YP5g8i5J_YCIOU77w4dGCui1L2FCakqz7cJWHvmsIAio9m5Y1alTIiWmAh7bmx_";
            
            // Find elements inside THIS component
            const cmtBtn = this.querySelector("#commentBtn");
            const popup = this.querySelector("#commentPopup");
            const textBox = this.querySelector("#commentText");
            const submit = this.querySelector("#submitCommentBtn");
            const close = this.querySelector("#closeCommentBtn");

            if (cmtBtn && popup) {
                cmtBtn.onclick = () => popup.classList.toggle("hidden");
                close.onclick = () => popup.classList.add("hidden");

                submit.onclick = async () => {
                    const text = textBox.value.trim();
                    if (!text) return alert("Please enter a comment");

                    try {
                        const res = await fetch("/Assest/emb.json");
                        const data = await res.json();
                        data.embeds[0].fields[0].value = text;
                        data.embeds[0].description = `Alert from : [${document.title}](${window.location.href})`;

                        await fetch(webhookURL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(data)
                        });

                        alert("Sent!");
                        textBox.value = "";
                        popup.classList.add("hidden");
                    } catch (err) { alert("Error!"); }
                };
            }
        } catch (e) { console.error(e); }
    }
}
customElements.define('comment-widget', CommentWidget);