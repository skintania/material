import { CONFIG } from '/config.js';

// ==========================================
// 1. ฟังก์ชันสำหรับโหลดข้อมูลจาก API
// ==========================================
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

        return await response.json(); // คืนค่าข้อมูล JSON กลับไป
    } catch (err) {
        console.error('Error fetching data:', err);
        return null; // ถ้า Error คืนค่า null เพื่อให้ฟังก์ชันอื่นรู้
    }
}

async function loadImageWithAuth(url) {
    const token = localStorage.getItem('authToken') || '';
    if (!url || !url.includes('asset?file=')) return url; // ถ้าเป็น URL ภายนอกให้ส่งกลับเลย

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Photo Load Failed');

        const blob = await response.blob();
        return URL.createObjectURL(blob); // สร้าง URL ชั่วคราวที่ <img> ใช้ได้
    } catch (err) {
        console.error("Image Auth Error:", err);
        return 'https://via.placeholder.com/150?text=Error'; // รูปสำรองถ้าโหลดไม่ได้
    }
}

// ==========================================
// 2. ฟังก์ชันสำหรับสร้างโพสต์ลงหน้าเว็บ (UI)
// ==========================================
async function renderEvents(data, gridElement) {
    gridElement.innerHTML = '';

    if (!data || Object.keys(data).length === 0) {
        gridElement.innerHTML = '<p style="color:red; text-align:center; grid-column: 1/-1;">ไม่สามารถโหลดข้อมูลกิจกรรมได้</p>';
        return;
    }

    // 🌟 เปลี่ยนมาใช้ for...of เพื่อให้สามารถใช้ await โหลดรูปในลูปได้
    for (const eventKey of Object.keys(data)) {
        const eventItem = data[eventKey];
        const card = document.createElement('article');
        card.className = 'card';

        // --- 1. หัวข้อและ Tag ประเภท ---
        const title = document.createElement('h2');
        title.innerText = eventItem.header || `กิจกรรม ${eventKey}`;
        card.appendChild(title);

        const typeTag = document.createElement('span');
        typeTag.innerText = eventItem.type;
        typeTag.style.cssText = 'font-size: 12px; padding: 2px 8px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #3b82f6;';
        card.appendChild(typeTag);

        // --- 2. แยกการแสดงผลตามประเภท ---
        
        // --- กรณี POLL ---
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
                // 🌟 ดึงรูปผ่าน Token
                const rawImgUrl = Array.isArray(eventItem.imgLink) ? (eventItem.imgLink[i] || eventItem.imgLink[0]) : eventItem.imgLink;
                console.log(rawImgUrl)
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

                // Listener สำหรับการโหวต
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

                    // ยิง API บันทึกโหวต
                    try {
                        const token = localStorage.getItem('authToken') || '';
                        await fetch(`${CONFIG.API_URL}/event/vote`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ eventId: eventKey, choiceName: choice, action: action })
                        });
                    } catch (err) { console.error("Vote API Error:", err); }

                    // Update UI เปอร์เซ็นต์หลอด
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

        } 
        // --- กรณี ACTIVITY ---
        else if (eventItem.type === 'Activity') {
            const activityContainer = document.createElement('div');
            activityContainer.style.cssText = 'margin-top: 15px; display: flex; align-items: center; gap: 15px;';

            if (eventItem.imgLink) {
                const sideImg = document.createElement('img');
                const rawImgUrl = Array.isArray(eventItem.imgLink) ? eventItem.imgLink[0] : eventItem.imgLink;
                console.log(rawImgUrl)
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
                <input type="checkbox" id="chk-${eventKey}" style="width:20px; height:20px; cursor:pointer; display:block; margin:0 auto;">
                <label for="chk-${eventKey}" style="font-size:12px; cursor:pointer; color:#94a3b8;">เข้าร่วม</label>
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
                        body: JSON.stringify({ eventId: eventKey, action: action })
                    });
                } catch (err) { console.error("Join API Error:", err); }
            });

            activityContainer.appendChild(textContent);
            activityContainer.appendChild(joinBox);
            card.appendChild(activityContainer);

        } 
        // --- กรณี ANNOUNCEMENT ---
        else {
            const announceContainer = document.createElement('div');
            announceContainer.style.marginTop = '15px';

            if (eventItem.imgLink) {
                const fullImg = document.createElement('img');
                const rawImgUrl = Array.isArray(eventItem.imgLink) ? eventItem.imgLink[0] : eventItem.imgLink;
                console.log(rawImgUrl)
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
    if (!grid) return;

    // 1. สั่งโหลดข้อมูล
    const eventData = await fetchEvents();

    // 2. นำข้อมูลไปสร้างหน้าเว็บ
    renderEvents(eventData, grid);
});