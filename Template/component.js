import { CONFIG } from '/config.js';

// --- ฟังก์ชันช่วยโหลดรูปโปรไฟล์ผ่าน API (Shared Function) ---
async function fetchAndSetAvatar(imgEl, iconEl, profilePath) {
    if (!profilePath || !imgEl || !iconEl) return;

    const token = localStorage.getItem("authToken");
    const finalUrl = profilePath.startsWith('http') ? profilePath : `${CONFIG.API_URL}${profilePath}`;

    try {
        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("API failed");

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        imgEl.src = objectUrl;
        imgEl.style.display = 'block';
        iconEl.style.display = 'none';
    } catch (e) {
        console.warn("Avatar fetch failed, keeping default icon.");
        imgEl.style.display = 'none';
        iconEl.style.display = 'flex';
    }
}

class SiteHeader extends HTMLElement {
    async connectedCallback() {
        const pageTitle = this.getAttribute('page-title') || 'StudyKits';
        const pageDesc = this.getAttribute('page-desc') || 'เลือกคอร์สที่ต้องการเรียน';

        try {
            const response = await fetch('/Template/header.html');
            const html = await response.text();
            this.innerHTML = html;

            // ... (โค้ด Dynamic Title / Menu Toggle เดิมของคุณ) ...
            this.querySelector('#dynamic-title').textContent = pageTitle;
            this.querySelector('#dynamic-desc').textContent = pageDesc;

            // --- เรียกใช้ Profile Sync ทันทีหลังจากใส่ HTML ลงในหน้า ---
            this.syncHeaderProfile();

            // ... (โค้ด Profile Dropdown / Logout เดิมของคุณ) ...
            const profileBtn = this.querySelector('#profileBtn');
            const dropdown = this.querySelector('#profileDropdown');
            const logoutBtn = this.querySelector('#logoutBtn');
            // (คงโค้ด Logic คลิกเปิด/ปิด Dropdown ไว้เหมือนเดิม)

        } catch (e) { 
            console.error("Error loading header template:", e); 
        }
    }

    // ย้าย syncHeaderProfile เข้ามาเป็น Method ของ Class เพื่อความสะดวก
    async syncHeaderProfile() {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            const imgEl = this.querySelector('#headerAvatarImg');
            const iconEl = this.querySelector('#headerDefaultIcon');

            if (data.profileUrl && imgEl && iconEl) {
                // 🚀 ใช้ฟังก์ชัน fetch รูปภาพพร้อม Token
                await fetchAndSetAvatar(imgEl, iconEl, data.profileUrl);
            }
        } catch (e) {
            console.error("Header profile sync failed");
        }
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

// เพิ่มส่วนนี้ลงในโค้ดที่จัดการ Header Component
async function syncHeaderProfile() {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
        // ดึงข้อมูลโปรไฟล์ (ใช้ API เดียวกับหน้า Settings)
        const response = await fetch(`${CONFIG.API_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        const imgEl = document.getElementById('headerAvatarImg');
        const iconEl = document.getElementById('headerDefaultIcon');

        if (data.profileUrl) {
            imgEl.src = data.profileUrl;
            imgEl.style.display = 'block';
            iconEl.style.display = 'none';
        } else {
            imgEl.style.display = 'none';
            iconEl.style.display = 'flex';
        }
    } catch (e) {
        console.error("Header sync failed");
    }
}

// เรียกใช้งานเมื่อโหลด Component เสร็จ
syncHeaderProfile();