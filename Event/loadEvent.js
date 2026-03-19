document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('coursesGrid');
    const eventJsonPath = './Event.json';

    if (!grid) return;

    fetch(eventJsonPath)
        .then(response => {
            if (!response.ok) throw new Error('ไม่สามารถโหลด Event.json ได้');
            return response.json();
        })
        .then(data => {
            Object.keys(data).forEach(eventKey => {
                const eventItem = data[eventKey];
                const card = document.createElement('article');
                card.className = 'card';

                // 1. หัวข้อและ Tag ประเภท
                const title = document.createElement('h2');
                title.innerText = eventItem.header || `กิจกรรม ${eventKey}`;
                card.appendChild(title);

                const typeTag = document.createElement('span');
                typeTag.innerText = eventItem.type;
                typeTag.style.fontSize = '12px';
                typeTag.style.padding = '2px 8px';
                typeTag.style.borderRadius = '4px';
                typeTag.style.background = 'rgba(59, 130, 246, 0.2)';
                typeTag.style.color = '#3b82f6';
                card.appendChild(typeTag);

                // 3. แยกการแสดงผลตามประเภท
                if (eventItem.type === 'Poll' && Array.isArray(eventItem.choice)) {
                    // --- แบบ POLL (รูปซ้าย บาร์ขวา พร้อมคะแนนโหวต) ---
                    const images = Array.isArray(eventItem.imgLink) ? eventItem.imgLink : [eventItem.imgLink];
                    const voteScores = Array.isArray(eventItem.vote_score) ? eventItem.vote_score : [];
                    const totalVotes = voteScores.reduce((acc, value) => acc + Number(value || 0), 0);

                    const pollContainer = document.createElement('div');
                    pollContainer.style.marginTop = '15px';
                    pollContainer.style.display = 'flex';
                    pollContainer.style.flexDirection = 'column';
                    pollContainer.style.gap = '15px';

                    eventItem.choice.forEach((choice, i) => {
                        const row = document.createElement('div');
                        row.style.display = 'flex';
                        row.style.alignItems = 'center';
                        row.style.gap = '15px';
                        row.style.marginBottom = '15px';

                        // 1. Image
                        const img = document.createElement('img');
                        img.src = images[i] || images[0]; 
                        img.style.width = '150px';
                        // img.style.height = '60px';
                        img.style.borderRadius = '8px';
                        img.style.objectFit = 'cover';
                        img.style.flexShrink = '0';

                        // 2. Poll Content (Center)
                        const pollContent = document.createElement('div');
                        pollContent.style.flexGrow = '1';

                        const votes = Number(eventItem.vote_score[i] || 0);
                        const percent = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

                        pollContent.innerHTML = `
                            <div style="display:flex; justify-content:space-between; font-size:2em; margin-bottom:4px;">
                                <strong>${choice}</strong>
                                <span class="vote-text" style="color: #60a5fa;">${votes} โหวต (${percent.toFixed(0)}%)</span>
                            </div>
                            <div style="height:20px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
                                <div class="progress-bar" style="width:${percent}%; height:100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); transition: width 0.3s ease;"></div>
                            </div>
                        `;

                        // 3. Radio-style Checkbox (Right Side)
                        const checkContainer = document.createElement('div');
                        checkContainer.style.flexShrink = '0';

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox'; // Keeping checkbox type as requested, but adding radio logic
                        checkbox.style.width = '20px';
                        checkbox.style.height = '20px';
                        checkbox.style.cursor = 'pointer';

                        // Track which index was previously voted for on this card
                        if (eventItem.lastVotedIndex === undefined) eventItem.lastVotedIndex = null;

                        checkbox.addEventListener('change', (e) => {
                            const allChecks = pollContainer.querySelectorAll('input[type="checkbox"]');
                            
                            if (e.target.checked) {
                                // 1. If user previously voted for someone else, subtract that vote first
                                if (eventItem.lastVotedIndex !== null && eventItem.lastVotedIndex !== i) {
                                    eventItem.vote_score[eventItem.lastVotedIndex]--;
                                    allChecks[eventItem.lastVotedIndex].checked = false;
                                }
                                
                                // 2. Add the new vote
                                eventItem.vote_score[i]++;
                                eventItem.lastVotedIndex = i;
                            } else {
                                // 3. If user unchecks their current choice, subtract the vote
                                eventItem.vote_score[i]--;
                                eventItem.lastVotedIndex = null;
                            }

                            // --- RE-CALCULATE AND UPDATE UI ---
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
                    });
                    
                    card.appendChild(pollContainer);

                } else if (eventItem.type === 'Activity') {
                    // --- แบบ ACTIVITY (มีรูปซ้าย + เนื้อหากลาง + Checkbox เข้าร่วมขวา) ---
                    const activityContainer = document.createElement('div');
                    activityContainer.style.marginTop = '15px';
                    activityContainer.style.display = 'flex';
                    activityContainer.style.alignItems = 'center';
                    activityContainer.style.gap = '15px';

                    // รูปภาพ
                    if (eventItem.imgLink) {
                        const sideImg = document.createElement('img');
                        sideImg.src = Array.isArray(eventItem.imgLink) ? eventItem.imgLink[0] : eventItem.imgLink;
                        sideImg.style.width = '30%';
                        // sideImg.style.height = '500px';
                        sideImg.style.borderRadius = '10px';
                        sideImg.style.objectFit = 'cover';
                        activityContainer.appendChild(sideImg);
                    }

                    // เนื้อหาตรงกลาง
                    const textContent = document.createElement('div');
                    textContent.style.flexGrow = '1';
                    
                    if (eventItem.description) {
                        const desc = document.createElement('p');
                        desc.style.margin = '0 0 5px 0';
                        desc.style.fontSize = '2em';
                        desc.innerText = eventItem.description;
                        textContent.appendChild(desc);
                    }

                    const partP = document.createElement('div');
                    partP.style.fontSize = '13px';
                    partP.style.color = '#10b981'; 
                    partP.innerText = `👥 ผู้เข้าร่วม: ${eventItem.participants || 0} คน`;
                    textContent.appendChild(partP);
                    activityContainer.appendChild(textContent);

                    // Checkbox ด้านขวาสุด (เฉพาะ Activity)
                    const joinBox = document.createElement('div');
                    joinBox.style.textAlign = 'center';
                    joinBox.innerHTML = `
                        <input type="checkbox" id="chk-${eventKey}" style="width:20px; height:20px; cursor:pointer; display:block; margin:0 auto;">
                        <label for="chk-${eventKey}" style="font-size:12px; cursor:pointer; color:#94a3b8;">เข้าร่วม</label>
                    `;

                    // Logic เพิ่ม/ลดจำนวนคน
                    joinBox.querySelector('input').addEventListener('change', (e) => {
                        if (e.target.checked) {
                            eventItem.participants++;
                            joinBox.querySelector('label').style.color = '#10b981';
                        } else {
                            eventItem.participants--;
                            joinBox.querySelector('label').style.color = '#94a3b8';
                        }
                        partP.innerText = `👥 ผู้เข้าร่วม: ${eventItem.participants} คน`;
                    });

                    activityContainer.appendChild(joinBox);
                    card.appendChild(activityContainer);

                } else {
                    // --- แบบ ANNOUNCEMENT (เน้นรูปและข้อความ ไม่มี Checkbox) ---
                    const announceContainer = document.createElement('div');
                    announceContainer.style.marginTop = '15px';
                    
                    if (eventItem.imgLink) {
                        const fullImg = document.createElement('img');
                        fullImg.src = Array.isArray(eventItem.imgLink) ? eventItem.imgLink[0] : eventItem.imgLink;
                        fullImg.style.width = '100%';
                        fullImg.style.maxHeight = '200px';
                        fullImg.style.borderRadius = '8px';
                        fullImg.style.objectFit = 'cover';
                        fullImg.style.marginBottom = '10px';
                        announceContainer.appendChild(fullImg);
                    }

                    if (eventItem.description) {
                        const desc = document.createElement('p');
                        desc.style.fontSize = '1.5em';
                        desc.style.lineHeight = '1.5';
                        desc.innerText = eventItem.description;
                        announceContainer.appendChild(desc);
                    }

                    card.appendChild(announceContainer);
                }
                                                
                grid.appendChild(card);
            });
        })
        .catch(err => {
            console.error('Error:', err);
            grid.innerHTML = '<p>ไม่สามารถโหลดข้อมูลได้</p>';
        });
});