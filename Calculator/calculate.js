document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calbutton').addEventListener('click', function () {

        const gradesData = [];

        const cards = document.querySelectorAll('article.card');

        cards.forEach(card => {

            const subjectName = card.querySelector('h2').innerText;

            const selectedGradeDiv = card.querySelector('.selected-option');

            if (selectedGradeDiv) {
                const gradeValue = parseFloat(selectedGradeDiv.getAttribute('data-value'));
                gradesData.push({
                    subject: subjectName,
                    grade: gradeValue
                });
            }
        });

        console.log("Extracted Grades:", gradesData);

        // ---------------------------------------------------------
        // Calculation: score = sum(grade * weight)
        // ---------------------------------------------------------

        const departElement = document.getElementById('depart');
        const departCode = departElement?.getAttribute('data-value')?.trim();

        if (!departCode) {
            alert('กรุณาเลือกภาคก่อนคำนวณ');
            return;
        }

        Promise.all([
            fetch(`${CONFIG.API_URL}/asset?file=Calculator/weight.json`).then(res => {
                if (!res.ok) throw new Error('ไม่สามารถโหลดไฟล์น้ำหนักได้');
                return res.json();
            }),
            fetch(`${CONFIG.API_URL}/asset?file=Calculator/data.json`).then(res => {
                if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลคะแนนย้อนหลังได้');
                return res.json();
            })
        ])
            .then(([weightData, historyData]) => {
                const weights = weightData[departCode];
                if (!weights) throw new Error(`ไม่พบข้อมูลน้ำหนักสำหรับภาค "${departCode}"`);

                let totalWeight = 0;
                let weightedScore = 0;

                gradesData.forEach(({ subject, grade }) => {
                    const weight = weights[subject];
                    if (typeof weight === 'number') {
                        totalWeight += weight;
                        weightedScore += grade * weight;
                    } else {
                        console.warn('No weight for subject', subject, 'in dept', departCode);
                    }
                });

                const gpax = totalWeight > 0 ? weightedScore / totalWeight : 0;

                // --- Calculate percentage based on historical admission score range (normalized to 0-100) ---
                // We map your weighted score into the range [minScore, maxScore] observed in history.
                const yearScorePercents = Object.values(historyData)
                    .map(yearObj => {
                        const deptInfo = yearObj[departCode];
                        if (!deptInfo) return null;

                        const maxScore = Number(deptInfo.maxScore ?? 0);
                        const minScore = Number(deptInfo.minScore ?? 0);
                        const fullScore = Number(deptInfo.fullScore ?? 0);

                        if (!fullScore || !Number.isFinite(maxScore) || !Number.isFinite(minScore)) return null;

                        return {
                            minPercent: (minScore / fullScore) * 100,
                            maxPercent: (maxScore / fullScore) * 100,
                        };
                    })
                    .filter(v => v !== null);

                const minPercent = yearScorePercents.length ? Math.min(...yearScorePercents.map(v => v.minPercent)) : 0;
                const maxPercent = yearScorePercents.length ? Math.max(...yearScorePercents.map(v => v.maxPercent)) : 0;

                // Convert the computed weighted GPA into a 0-100 percent score
                const normalizedPercent = totalWeight > 0 ? (weightedScore / (totalWeight * 4)) * 100 : 0;

                let percent = 0;
                if (yearScorePercents.length && maxPercent > minPercent) {
                    const midPercent = (minPercent + maxPercent) / 2;

                    if (normalizedPercent >= midPercent) {
                        percent = 100;
                    } else if (normalizedPercent <= minPercent) {
                        percent = 0;
                    } else {
                        percent = ((normalizedPercent - minPercent) / (midPercent - minPercent)) * 100;
                    }
                } else {
                    // fallback: percent of max possible score
                    percent = normalizedPercent;
                }

                percent = Math.max(0, Math.min(100, percent));

                const chanceTextEl = document.querySelector('.chance-text');
                const circleEl = document.querySelector('.chance-circle');
                const scoreTextEls = document.querySelectorAll('.score-text');
                const statusEl = document.querySelector('.status-message');
                const deptTableBody = document.querySelector('#deptChanceTable tbody');

                if (chanceTextEl) chanceTextEl.innerText = `${percent.toFixed(2)} %`;
                if (circleEl) circleEl.style.setProperty('--percentage', `${percent.toFixed(2)}%`);

                // Update GPAX and raw score display
                if (scoreTextEls.length >= 2) {
                    scoreTextEls[0].innerText = `GPAX: ${gpax.toFixed(2)}`;
                    scoreTextEls[1].innerText = `Score: ${weightedScore.toFixed(1)} / ${(totalWeight * 4).toFixed(1)} (${(weightedScore.toFixed(1) / (totalWeight * 4).toFixed(1) * 100).toFixed(2)})%`;
                } else if (scoreTextEls.length === 1) {
                    scoreTextEls[0].innerText = `GPAX: ${gpax.toFixed(2)} | Score: ${weightedScore.toFixed(1)} / ${(totalWeight * 4).toFixed(1)}`;
                }

                if (statusEl) {
                    let message = 'Not any chance';
                    let statusClass = 'error';

                    if (percent >= 100) {
                        message = 'Guaranteed!';
                        statusClass = 'success';
                    } else if (percent >= 80) {
                        message = 'Very high chance';
                        statusClass = 'success';
                    } else if (percent >= 60) {
                        message = 'High chance';
                        statusClass = 'warning';
                    } else if (percent >= 40) {
                        message = 'Could try';
                        statusClass = 'warning';
                    } else if (percent >= 20) {
                        message = 'Low chance';
                        statusClass = 'error';
                    } else if (percent > 0) {
                        message = 'Extremely low chance';
                        statusClass = 'error';
                    } else {
                        message = 'No chance';
                        statusClass = 'error';
                    }

                    statusEl.classList.remove('error', 'warning', 'success');
                    statusEl.classList.add(statusClass);
                    statusEl.innerText = message;
                }

                // --- Update department table ---
                if (deptTableBody) {
                    deptTableBody.innerHTML = '';

                    const deptCodes = Object.keys(weightData);
                    deptCodes.sort();

                    deptCodes.forEach(code => {
                        const weightsForDept = weightData[code];
                        if (!weightsForDept) return;

                        // compute weighted score for this department
                        let deptTotalWeight = 0;
                        let deptWeightedScore = 0;
                        gradesData.forEach(({ subject, grade }) => {
                            const w = weightsForDept[subject];
                            if (typeof w === 'number') {
                                deptTotalWeight += w;
                                deptWeightedScore += grade * w;
                            }
                        });

                        const deptNormalizedPercent = deptTotalWeight > 0 ? (deptWeightedScore / (deptTotalWeight * 4)) * 100 : 0;

                        const historyPercents = Object.values(historyData)
                            .map(yearObj => {
                                const deptInfo = yearObj[code];
                                if (!deptInfo) return null;
                                const maxScore = Number(deptInfo.maxScore ?? 0);
                                const minScore = Number(deptInfo.minScore ?? 0);
                                const fullScore = Number(deptInfo.fullScore ?? 0);
                                if (!fullScore || !Number.isFinite(maxScore) || !Number.isFinite(minScore)) return null;
                                return {
                                    minPercent: (minScore / fullScore) * 100,
                                    maxPercent: (maxScore / fullScore) * 100,
                                };
                            })
                            .filter(v => v !== null);

                        const deptMinPercent = historyPercents.length ? Math.min(...historyPercents.map(v => v.minPercent)) : 0;
                        const deptMaxPercent = historyPercents.length ? Math.max(...historyPercents.map(v => v.maxPercent)) : 0;

                        let deptPercent = 0;
                        if (historyPercents.length && deptMaxPercent > deptMinPercent) {
                            const deptMidPercent = (deptMinPercent + deptMaxPercent) / 2;

                            if (deptNormalizedPercent >= deptMidPercent) {
                                deptPercent = 100;
                            } else if (deptNormalizedPercent <= deptMinPercent) {
                                deptPercent = 0;
                            } else {
                                deptPercent = ((deptNormalizedPercent - deptMinPercent) / (deptMidPercent - deptMinPercent)) * 100;
                            }
                        } else {
                            deptPercent = deptNormalizedPercent;
                        }

                        deptPercent = Math.max(0, Math.min(100, deptPercent));

                        const row = document.createElement('tr');

                        // Choose the most recent year that includes this department (so GE/others show correct names)
                        const yearKeys = Object.keys(historyData).sort();
                        const yearWithDept = yearKeys.slice().reverse().find(y => historyData[y]?.[code]);
                        const deptInfo = yearWithDept ? historyData[yearWithDept][code] : null;

                        const name = deptInfo?.department || code;
                        const minScore = deptInfo?.minScore ?? '-';
                        const maxScore = deptInfo?.maxScore ?? '-';

                        row.innerHTML = `
                        <td>${name} (${code})</td>
                        <td>${minScore}</td>
                        <td>${maxScore}</td>
                        <td class="chance">${deptPercent.toFixed(1)}%</td>
                    `;

                        deptTableBody.appendChild(row);
                    });
                }
            })
            .catch(err => {
                console.error(err);
                alert('เกิดข้อผิดพลาด: ' + err.message);
            });

    });
});