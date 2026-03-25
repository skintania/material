import { CONFIG } from '/config.js';

async function fetchEvents() {
    const token = localStorage.getItem('authToken') || '';
    try {
        const response = await fetch(`${CONFIG.API_URL}/event/all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลจาก API ได้');
        return await response.json(); 
    } catch (err) {
        console.error('Error fetching data:', err);
        return null; 
    }
}

window.editingEventId = null;

function openEditModal(eventItem) {
    // 1. จำ ID โพสต์ไว้ เพื่อให้ตอนกด Save ระบบรู้ว่าต้องไปอัปเดตอันไหน
    window.editingEventId = eventItem.id;

    // 2. เปลี่ยนหัวข้อ Modal ให้รู้ว่ากำลังแก้ไข
    const modalTitle = document.querySelector('.modal-header h2');
    if (modalTitle) modalTitle.innerText = '✏️ แก้ไขโพสต์';

    // 3. เอาข้อมูลเดิมไปหยอดใส่ Input (หาจาก name แทน id)
    const headerInput = document.querySelector('input[name="header"]');
    if (headerInput) headerInput.value = eventItem.header || "";

    const descInput = document.querySelector('textarea[name="description"]');
    if (descInput) descInput.value = eventItem.description || "";
    
    // 4. เลือกประเภท (Type) ให้ตรงกับของเดิม
    const typeSelect = document.getElementById('typeSelect');
    if (typeSelect) {
        typeSelect.value = eventItem.type;
        typeSelect.dispatchEvent(new Event('change')); 
    }

    if (eventItem.type === 'Poll' && Array.isArray(eventItem.choice)) {
        const pollCountSelect = document.getElementById('pollCountSelect');
        if (pollCountSelect) {
            // นับว่าโพลเดิมมีกี่ตัวเลือก (ขั้นต่ำ 2, สูงสุด 5 ตาม HTML ของคุณ)
            let count = eventItem.choice.length;
            if (count < 2) count = 2;
            if (count > 5) count = 5;

            // ปรับ dropdown จำนวนตัวเลือกให้ตรง
            pollCountSelect.value = count.toString();
            
            // สั่งให้โค้ดสร้างช่องกรอกทำงาน (dispatchEvent)
            pollCountSelect.dispatchEvent(new Event('change'));

            // ใช้ setTimeout ดีเลย์นิดนึง (50ms) รอให้ช่องกรอก HTML สร้างเสร็จก่อน แล้วค่อยเอาค่าไปหยอด
            setTimeout(() => {
                // หาช่องกรอกตัวเลือกทั้งหมดที่ถูกสร้างขึ้นมาใน pollChoicesContainer
                const choiceInputs = document.querySelectorAll('#pollChoicesContainer input[type="text"]');
                
                // วนลูปเอาข้อความเดิมไปใส่ทีละช่อง
                eventItem.choice.forEach((choiceText, index) => {
                    if (choiceInputs[index]) {
                        choiceInputs[index].value = choiceText;
                    }
                });
            }, 50);
        }
    }

    // เปลี่ยนข้อความปุ่ม Submit เป็นบันทึก
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.innerText = 'บันทึกการแก้ไข';

    // 5. สั่งเปิด Modal ขึ้นมาแสดง
    const modal = document.getElementById('postModal');
    // ตรงนี้อาจจะเป็น 'block' หรือ 'flex' ขึ้นอยู่กับ CSS เดิมที่คุณเขียนไว้ตอนเปิด Modal ครับ
    if (modal) modal.style.display = 'flex'; 
}

async function loadImageWithAuth(url) {
    const token = localStorage.getItem('authToken') || '';
    if (!url || !url.includes('asset?file=')) return url; 
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Photo Load Failed');
        const blob = await response.blob();
        return URL.createObjectURL(blob); 
    } catch (err) {
        console.error("Image Auth Error:", err);
        return 'https://via.placeholder.com/150?text=Error'; 
    }
}

// ==========================================
// 2. ฟังก์ชันสำหรับสร้างโพสต์ลงหน้าเว็บ (UI)
// ==========================================
// ==========================================
// 2. ฟังก์ชันสำหรับสร้างโพสต์ลงหน้าเว็บ (UI)
// ==========================================
async function renderEvents(data, gridElement) {
    gridElement.innerHTML = '';

    if (!data || Object.keys(data).length === 0) {
        gridElement.innerHTML = '<p style="color:red; text-align:center; grid-column: 1/-1;">ไม่สามารถโหลดข้อมูลกิจกรรมได้</p>';
        return;
    }

    // 🌟 แก้ไข: ใช้ for...of ดึงข้อมูลจาก Array โดยตรง
    for (const eventItem of data) {
        
        const card = document.createElement('article');
        card.className = 'card';
        card.style.position = 'relative'; // สำคัญ! เพื่อให้ปุ่ม 3 จุดลอยอยู่มุมขวาบนของ Card

        // 🌟 เช็คสิทธิ์: ถ้าเป็นคนสร้างโพสต์ หรือเป็น admin ให้สร้างปุ่ม 3 จุด
        if (eventItem.canManage === true) {
            const menuHtml = document.createElement('div');
            menuHtml.className = 'post-options-menu';
            menuHtml.innerHTML = `
                <button class="menu-dot-btn">⋮</button>
                <div class="menu-dropdown-content">
                    <button class="edit-post-btn" data-id="${eventItem.id}">✏️ แก้ไข</button>
                    <button class="delete-post-btn" data-id="${eventItem.id}" style="color: #ef4444;">🗑️ ลบ</button>
                </div>
            `;
            
            const dotBtn = menuHtml.querySelector('.menu-dot-btn');
            const dropdown = menuHtml.querySelector('.menu-dropdown-content');
            dotBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.menu-dropdown-content').forEach(m => {
                    if (m !== dropdown) m.classList.remove('show');
                });
                dropdown.classList.toggle('show');
            });

            // ดักจับปุ่มแก้ไข
            const editBtn = menuHtml.querySelector('.edit-post-btn');
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openEditModal(eventItem); // โยนข้อมูลของโพสต์นี้ไปให้ฟังก์ชันเปิดหน้าต่าง
            });

            // ปิด Dropdown เมื่อคลิกที่อื่น
            document.addEventListener('click', () => {
                dropdown.classList.remove('show');
            });

            card.appendChild(menuHtml);
        }

        // --- 1. หัวข้อและ Tag ประเภท ---
        const title = document.createElement('h2');
        title.innerText = eventItem.header || `กิจกรรม ${eventItem.id}`;
        card.appendChild(title);

        const typeTag = document.createElement('span');
        typeTag.innerText = eventItem.type;
        typeTag.style.cssText = 'font-size: 12px; padding: 2px 8px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #3b82f6;';
        card.appendChild(typeTag);

        // --- 2. แยกการแสดงผลตามประเภท ---
        if (eventItem.type === 'Poll' && Array.isArray(eventItem.choice)) {
            const voteScores = Array.isArray(eventItem.vote_score) ? eventItem.vote_score : [];
            const totalVotes = voteScores.reduce((acc, value) => acc + Number(value || 0), 0);

            const pollContainer = document.createElement('div');
            pollContainer.style.cssText = 'margin-top: 15px; display: flex; flex-direction: column; gap: 15px;';

            for (let i = 0; i < eventItem.choice.length; i++) {
                const choice = eventItem.choice[i];
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; align-items: center; gap: 15px; margin-bottom: 15px;';

                const img = document.createElement('img');
                const rawImgUrl = Array.isArray(eventItem.imgLink) ? (eventItem.imgLink[i] || eventItem.imgLink[0]) : eventItem.imgLink;
                img.src = await loadImageWithAuth(rawImgUrl); 
                img.style.cssText = 'width: 200px; max-height: 500px; border-radius: 8px; object-fit: contain; flex-shrink: 0; background: rgba(0,0,0,0.1);';

                const pollContent = document.createElement('div');
                pollContent.style.flexGrow = '1';

                const votes = Number(eventItem.vote_score[i] || 0);
                const percent = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

                pollContent.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <strong class="event-description">${choice}</strong> 
                        <span class="vote-text" style="color: #60a5fa;">${votes} โหวต (${percent.toFixed(0)}%)</span>
                    </div>
                    <div style="height:20px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
                        <div class="progress-bar" style="width:${percent}%; height:100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); transition: width 0.3s ease;"></div>
                    </div>
                `;

                const checkContainer = document.createElement('div');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.cssText = 'width: 20px; height: 20px; cursor: pointer;';

                if (eventItem.lastVotedIndex === undefined) eventItem.lastVotedIndex = null;
                if (eventItem.userVotedIndex === i) {
                    checkbox.checked = true;
                    eventItem.lastVotedIndex = i;
                }

                checkbox.addEventListener('change', async (e) => {
                    const allChecks = pollContainer.querySelectorAll('input[type="checkbox"]');
                    let action = e.target.checked ? 'vote' : 'unvote';

                    if (e.target.checked) {
                        if (eventItem.lastVotedIndex !== null && eventItem.lastVotedIndex !== i) {
                            eventItem.vote_score[eventItem.lastVotedIndex]--;
                            allChecks[eventItem.lastVotedIndex].checked = false;
                        }
                        eventItem.vote_score[i]++;
                        eventItem.lastVotedIndex = i;
                    } else {
                        eventItem.vote_score[i]--;
                        eventItem.lastVotedIndex = null;
                    }

                    try {
                        const token = localStorage.getItem('authToken') || '';
                        await fetch(`${CONFIG.API_URL}/event/vote`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            // 🌟 ส่ง eventItem.id แทน eventKey
                            body: JSON.stringify({ eventId: eventItem.id, choiceName: choice, action: action })
                        });
                    } catch (err) { console.error("Vote API Error:", err); }

                    const newTotal = eventItem.vote_score.reduce((a, b) => a + Number(b), 0);
                    const allBars = pollContainer.querySelectorAll('.progress-bar');
                    const allTexts = pollContainer.querySelectorAll('.vote-text');
                    eventItem.choice.forEach((_, idx) => {
                        const v = Number(eventItem.vote_score[idx]);
                        const p = newTotal > 0 ? (v / newTotal) * 100 : 0;
                        allBars[idx].style.width = `${p}%`;
                        allTexts[idx].innerText = `${v} โหวต (${p.toFixed(0)}%)`;
                    });
                });

                checkContainer.appendChild(checkbox);
                row.appendChild(img);
                row.appendChild(pollContent);
                row.appendChild(checkContainer);
                pollContainer.appendChild(row);
            }
            card.appendChild(pollContainer);

        } else if (eventItem.type === 'Activity') {
            const activityContainer = document.createElement('div');
            activityContainer.style.cssText = 'margin-top: 15px; display: flex; align-items: center; gap: 15px;';

            if (eventItem.imgLink) {
                const sideImg = document.createElement('img');
                const rawImgUrl = Array.isArray(eventItem.imgLink) ? eventItem.imgLink[0] : eventItem.imgLink;
                sideImg.src = await loadImageWithAuth(rawImgUrl);
                sideImg.style.cssText = 'max-height: 500px; width: 30%; border-radius: 10px; object-fit: cover; background: #222;';
                activityContainer.appendChild(sideImg);
            }

            const textContent = document.createElement('div');
            textContent.style.flexGrow = '1';
            textContent.innerHTML = `
                <p class="event-description" style="margin: 0 0 5px 0;">${eventItem.description || ''}</p>
                <div class="participant-count" style="font-size: 13px; color: #10b981;">👥 ผู้เข้าร่วม: ${eventItem.participants || 0} คน</div>
            `;

            const joinBox = document.createElement('div');
            joinBox.style.textAlign = 'center';
            joinBox.innerHTML = `
                <input type="checkbox" id="chk-${eventItem.id}" style="width:20px; height:20px; cursor:pointer; display:block; margin:0 auto;">
                <label for="chk-${eventItem.id}" style="font-size:12px; cursor:pointer; color:#94a3b8;">เข้าร่วม</label>
            `;

            const checkbox = joinBox.querySelector('input');
            const label = joinBox.querySelector('label');
            const partText = textContent.querySelector('.participant-count');

            if (eventItem.userJoined) {
                checkbox.checked = true;
                label.style.color = '#10b981';
            }

            checkbox.addEventListener('change', async (e) => {
                const isChecked = e.target.checked;
                const action = isChecked ? 'join' : 'leave';
                if (isChecked) { eventItem.participants++; label.style.color = '#10b981'; } 
                else { eventItem.participants--; label.style.color = '#94a3b8'; }
                partText.innerText = `👥 ผู้เข้าร่วม: ${eventItem.participants} คน`;

                try {
                    const token = localStorage.getItem('authToken') || '';
                    fetch(`${CONFIG.API_URL}/event/join`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        // 🌟 ส่ง eventItem.id เข้า API เข้าร่วม
                        body: JSON.stringify({ eventId: eventItem.id, action: action })
                    });
                } catch (err) { console.error("Join API Error:", err); }
            });

            activityContainer.appendChild(textContent);
            activityContainer.appendChild(joinBox);
            card.appendChild(activityContainer);

        } else {
            // ของ Announcement (ไม่เปลี่ยนแปลง)
            const announceContainer = document.createElement('div');
            announceContainer.style.marginTop = '15px';

            if (eventItem.imgLink) {
                const fullImg = document.createElement('img');
                const rawImgUrl = Array.isArray(eventItem.imgLink) ? eventItem.imgLink[0] : eventItem.imgLink;
                fullImg.src = await loadImageWithAuth(rawImgUrl);
                fullImg.style.cssText = 'width: 100%; max-height: 250px; border-radius: 8px; object-fit: cover; margin-bottom: 10px; background: #222;';
                announceContainer.appendChild(fullImg);
            }

            if (eventItem.description) {
                const desc = document.createElement('p');
                desc.className = 'event-description';
                desc.style.lineHeight = '1.5';
                desc.innerText = eventItem.description;
                announceContainer.appendChild(desc);
            }
            card.appendChild(announceContainer);
        }

        gridElement.appendChild(card);
    }
}

// ==========================================
// 3. ควบคุมการทำงานหลักตอนเปิดหน้าเว็บ
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('coursesGrid');
    if (grid) {
        const eventData = await fetchEvents();
        renderEvents(eventData, grid);
    }

    // 🌟 วางโค้ดดักปุ่มเปิด-ปิด และล้างค่าตรงนี้ครับ 🌟
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const postModal = document.getElementById('postModal');

    // สร้างฟังก์ชันล้างค่าแบบรวบยอด
    const resetForm = () => {
        window.editingEventId = null; // คืนค่า ID
        
        const modalTitle = document.querySelector('.modal-header h2');
        if (modalTitle) modalTitle.innerText = 'สร้างกิจกรรมใหม่';
        
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.innerText = 'โพสต์กิจกรรมเลย';
        
        const createForm = document.getElementById('createPostForm');
        if (createForm) createForm.reset();
        
        const typeSelect = document.getElementById('typeSelect');
        if (typeSelect) {
            typeSelect.value = 'Announcement';
            typeSelect.dispatchEvent(new Event('change')); 
        }
    };

    // ตอนกดปุ่ม "+ สร้างกิจกรรมใหม่"
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            resetForm(); // ล้างค่าก่อนเปิด
            if (postModal) postModal.style.display = 'flex'; // แสดง Modal
        });
    }

    // ตอนกดปุ่ม "ยกเลิก" (ปิด Modal)
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            resetForm(); // ล้างค่าก่อนปิด
            if (postModal) postModal.style.display = 'none'; // ซ่อน Modal
        });
    }
});