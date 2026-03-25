import { CONFIG } from '/config.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const modal = document.getElementById('postModal');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const form = document.getElementById('createPostForm');
    const typeSelect = document.getElementById('typeSelect');
    const standardArea = document.getElementById('standardArea');
    const pollArea = document.getElementById('pollArea');
    const pollCountSelect = document.getElementById('pollCountSelect');
    const pollChoicesContainer = document.getElementById('pollChoicesContainer');

    // 1. Modal Control
    openBtn.onclick = () => { modal.style.display = 'flex'; form.scrollTop = 0; };
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    // 2. Type Switcher
    typeSelect.onchange = (e) => {
        const type = e.target.value;
        const isPoll = type === 'Poll';
        pollArea.style.display = isPoll ? 'block' : 'none';
        standardArea.style.display = isPoll ? 'none' : 'block';
        if (isPoll) renderPollChoices(pollCountSelect.value);
    };

    // 3. Poll Dynamic Rendering
    pollCountSelect.onchange = (e) => renderPollChoices(e.target.value);

    function renderPollChoices(count) {
        pollChoicesContainer.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const div = document.createElement('div');
            div.className = 'choice-item';
            div.innerHTML = `
                <label style="color: #3b82f6; font-size: 0.85rem; font-weight: 500; margin-bottom: 8px; display: block;">ตัวเลือกที่ ${i}</label>
                <input type="text" name="choiceText_${i}" placeholder="ระบุข้อความ..." required>
                <div class="file-upload-wrapper">
                    <label style="font-size: 0.75rem; color: #9aa4b2;">รูปภาพสำหรับตัวเลือกนี้ (ถ้ามี)</label>
                    <input type="file" name="choiceImage_${i}" accept="image/*">
                </div>
            `;
            pollChoicesContainer.appendChild(div);
        }
    }

    // 4. Submit Handling
    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerText = 'กำลังส่ง...';

        const formData = new FormData();
        const type = typeSelect.value;
        const token = localStorage.getItem('authToken');

        formData.append('type', type);
        formData.append('header', form.header.value);

        if (type === 'Poll') {
            const count = pollCountSelect.value;
            let texts = [];
            for (let i = 1; i <= count; i++) {
                texts.push(form[`choiceText_${i}`].value);
                const file = form[`choiceImage_${i}`].files[0];
                formData.append('images', file || new Blob()); // รักษาลำดับ Index
            }
            formData.append('choices', texts.join(','));
        } else {
            formData.append('description', form.description.value);
            const file = document.getElementById('singleImageInput').files[0];
            if (file) formData.append('images', file);
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/event/create`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                alert('สร้างโพสต์สำเร็จ!');
                location.reload();
            } else {
                const err = await response.json();
                alert('Error: ' + err.error);
            }
        } catch (err) {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        } finally {
            btn.disabled = false;
            btn.innerText = 'โพสต์กิจกรรมเลย';
        }
    };
});