// =========================================================
// ไฟล์ graph.js - สำหรับจัดการกราฟสถิติคะแนนย้อนหลัง
// =========================================================

let trendChart = null; 
let globalHistoryData = null; 

// กำหนดสีให้แต่ละภาควิชา
const deptColors = {
    "CE": "#ef4444",  // แดง
    "EE": "#22c55e",  // เขียว
    "ME": "#3b82f6",  // น้ำเงิน
    "AE": "#ec4899",  // ชมพู
    "IE": "#f59e0b",  // ส้มเหลือง
    "CHE": "#8b5cf6", // ม่วง
    "PE": "#14b8a6",  // เขียวอมฟ้า
    "GE": "#a8a29e",  // เทา
    "ENV": "#10b981", // มรกต
    "SV": "#f97316",  // ส้ม
    "MT": "#64748b",  // กรมท่า
    "CP": "#06b6d4",  // ฟ้า
    "NT": "#d946ef"   // บานเย็น
};

// ฟังก์ชันสำหรับสร้างและอัปเดตกราฟ
function renderTrendChart(historyData, scoreType = 'minScore') {
    globalHistoryData = historyData; // เก็บข้อมูลไว้ใช้ตอนสลับปุ่ม
    
    const years = Object.keys(historyData).sort(); 
    
    // ดึงรหัสภาควิชาทั้งหมดที่มีในทุกปี
    const allDepts = new Set();
    years.forEach(year => {
        Object.keys(historyData[year]).forEach(dept => allDepts.add(dept));
    });

    // สร้างชุดข้อมูล (Datasets)
    const datasets = Array.from(allDepts).map(dept => {
        const dataPoints = years.map(year => {
            const deptInfo = historyData[year][dept];
            if (deptInfo && deptInfo[scoreType] && deptInfo.fullScore) {
                // คำนวณเป็น %
                return ((deptInfo[scoreType] / deptInfo.fullScore) * 100).toFixed(2);
            }
            return null; // ปีไหนไม่มีข้อมูลให้เป็นจุดว่าง
        });

        return {
            label: dept,
            data: dataPoints,
            borderColor: deptColors[dept] || '#ffffff', 
            backgroundColor: deptColors[dept] || '#ffffff',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            fill: false,
            tension: 0.3, // ความโค้งของเส้น
            spanGaps: true // เชื่อมเส้นกราฟข้ามปีที่ข้อมูลหาย
        };
    });

    const canvas = document.getElementById('scoreTrendChart');
    if (!canvas) return; 
    const ctx = canvas.getContext('2d');

    // ลบกราฟเก่าทิ้งก่อนวาดใหม่
    if (trendChart) {
        trendChart.destroy();
    }

    // สีตั้งต้นให้เข้ากับ Dark Theme
    const textColor = '#9aa4b2'; 
    const gridColor = 'rgba(255, 255, 255, 0.05)'; 

    // วาดกราฟ
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            color: textColor,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: false
                    
                },
                tooltip: {
                    backgroundColor: '#0b1220', 
                    titleColor: '#e6eef8',
                    bodyColor: '#9aa4b2',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        callback: function(value) { return value + '%'; }
                    },
                    title: { display: true, text: 'คะแนนเปรียบเทียบ (%)', color: textColor }
                },
                x: {
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    ticks: { color: textColor },
                    title: { display: true, text: 'ปีการศึกษา', color: textColor }
                }
            }
        }
    });

    generateCustomLegend(trendChart);
}

// ผูก Event ให้ปุ่ม และ โหลดข้อมูลเมื่อเปิดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    const btnMin = document.getElementById('btnMinScore');
    const btnMax = document.getElementById('btnMaxScore');

    if (btnMin && btnMax) {
        btnMin.addEventListener('click', function() {
            if (globalHistoryData) renderTrendChart(globalHistoryData, 'minScore');
            this.classList.add('active');
            btnMax.classList.remove('active');
        });

        btnMax.addEventListener('click', function() {
            if (globalHistoryData) renderTrendChart(globalHistoryData, 'maxScore');
            this.classList.add('active');
            btnMin.classList.remove('active');
        });
    }

    const btnToggleAll = document.getElementById('btnToggleAll');
    let isAllVisible = true; // สถานะเริ่มต้นคือแสดงทั้งหมด

    if (btnToggleAll) {
        btnToggleAll.addEventListener('click', function() {
            if (!trendChart) return;

            isAllVisible = !isAllVisible; // สลับสถานะ

            // สั่งเปิด-ปิด ทุก Dataset ในกราฟ
            trendChart.data.datasets.forEach((dataset, index) => {
                trendChart.setDatasetVisibility(index, isAllVisible);
            });
            
            trendChart.update(); // อัปเดตกราฟให้วาดใหม่

            generateCustomLegend(trendChart);

            // เปลี่ยนสีปุ่มให้รู้สถานะ (ใช้สีม่วงให้ดูต่างจากปุ่มหลัก)
            if (isAllVisible) {
                this.style.backgroundColor = '#fff';
                this.style.color = '#8b5cf6';
            } else {
                this.style.backgroundColor = '#f3e8ff';
                this.style.color = '#6d28d9';
            }
        });
    }

    const finalUrl = `${CONFIG.API_URL}/asset?file=Calculator/data.json`;

    fetch(finalUrl)
        .then(res => {
            if (!res.ok) {
                console.error("Server responded with:", res.status);
                return res.text().then(text => { throw new Error(text) });
            }
            return res.json();
        })
        .then(historyData => {
            // ✅ ต้องเพิ่มบรรทัดนี้ เพื่อส่งข้อมูลไปวาดกราฟ!
            renderTrendChart(historyData, 'minScore');
        })
        .catch(err => console.error("Fetch error:", err));
});

// ฟังก์ชันสร้างปุ่ม Legend แบบ Custom
function generateCustomLegend(chart) {
    const legendContainer = document.getElementById('customLegend');
    if (!legendContainer) return;
    
    legendContainer.innerHTML = ''; // ล้างปุ่มเก่าออกก่อนสร้างใหม่

    // วนลูปสร้างปุ่มตามจำนวนภาควิชาที่มีในกราฟ
    chart.data.datasets.forEach((dataset, index) => {
        const btn = document.createElement('button');
        btn.className = 'legend-btn';
        btn.innerText = dataset.label;
        
        const color = dataset.borderColor; // ดึงสีประจำภาคที่ตั้งไว้
        
        // กำหนดสีให้ปุ่ม
        btn.style.borderColor = color;
        btn.style.borderWidth = '2px';
        btn.style.borderStyle = 'solid';
        btn.style.color = color;

        // เช็คว่ากราฟเส้นนี้ถูกซ่อนอยู่หรือไม่
        const isVisible = chart.isDatasetVisible(index);
        
        if (!isVisible) {
            btn.classList.add('inactive'); // ถ้าซ่อนอยู่ ให้ใส่คลาสสีเทา
        } else {
            // ถ้าแสดงผลอยู่ ให้สีพื้นหลังเป็นสีประจำภาคแบบโปร่งใส 15% (Hex + 26)
            btn.style.backgroundColor = `${color}26`; 
        }

        // เมื่อผู้ใช้คลิกปุ่ม
        btn.onclick = () => {
            // สลับการแสดงผลกราฟเส้นนั้น
            chart.setDatasetVisibility(index, !isVisible);
            chart.update(); // อัปเดตกราฟ
            generateCustomLegend(chart); // รีเฟรชสีของปุ่มใหม่
        };

        legendContainer.appendChild(btn);
    });
}
