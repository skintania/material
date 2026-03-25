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

            // 1. Set Dynamic Text
            this.querySelector('#dynamic-title').textContent = pageTitle;
            this.querySelector('#dynamic-desc').textContent = pageDesc;

            // 2. Menu Toggle Logic
            const btn = this.querySelector('#menu-toggle');
            const nav = this.querySelector('.navbar');
            if (btn && nav) {
                btn.onclick = () => {
                    nav.classList.toggle('active');
                    btn.innerHTML = nav.classList.contains('active') ? '✕' : '☰';
                };
            }

            // 3. Profile Dropdown Logic
            const profileBtn = this.querySelector('#profileBtn');
            const dropdown = this.querySelector('#profileDropdown');
            if (profileBtn && dropdown) {
                profileBtn.onclick = (e) => {
                    e.stopPropagation();
                    const isVisible = dropdown.style.display === 'block';
                    dropdown.style.display = isVisible ? 'none' : 'block';
                    dropdown.style.opacity = isVisible ? '0' : '1';
                    dropdown.style.visibility = isVisible ? 'hidden' : 'visible';
                };
                window.addEventListener('click', (e) => {
                    if (!e.target.closest('.profile-dropdown')) {
                        dropdown.style.display = 'none';
                        dropdown.style.opacity = '0';
                        dropdown.style.visibility = 'hidden';
                    }
                });
            }

            // 4. Logout Logic (เน้นจุดนี้)
            const logoutBtn = this.querySelector('#logoutBtn');
            if (logoutBtn) {
                logoutBtn.onclick = (e) => {
                    e.preventDefault();
                    console.log("Logging out..."); // Debug
                    localStorage.removeItem('authToken');
                    window.location.href = '/login/';
                };
            }

            // 5. ดึงรูปโปรไฟล์
            this.initProfile();

        } catch (e) { 
            console.error("Error loading header:", e); 
        }
    }

    async initProfile() {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            // ต้องหา Element ภายใน Shadow/Component นี้เท่านั้น
            const imgEl = this.querySelector('#headerAvatarImg');
            const iconEl = this.querySelector('#headerDefaultIcon');

            if (data.profileUrl && imgEl && iconEl) {
                await fetchAndSetAvatar(imgEl, iconEl, data.profileUrl);
            }
        } catch (e) {
            console.error("Profile init failed", e);
        }
    }
}
customElements.define('site-header', SiteHeader);

// --- ลบฟังก์ชัน syncHeaderProfile() เก่าที่อยู่นอก Class ทิ้งให้หมด ---

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
