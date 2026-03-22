const coursesGrid = document.getElementById('coursesGrid');

async function fetchCourses() {
  try {
    const response = await fetch('tips.json'); 
    const coursesData = await response.json();
    renderCourses(coursesData);
  } catch (error) {
    console.error('Error loading courses:', error);
    coursesGrid.innerHTML = '<p style="color: #ef4444; text-align: center; width: 100%;">ไม่สามารถโหลดข้อมูลรายวิชาได้ (ต้องรันบน Web Server)</p>';
  }
}

function renderCourses(coursesData) {
  coursesData.forEach(course => {
    const cardHTML = `
      <div class="card">
        <div class="card-main">
          <div class="card-image-container">
            <img src="${course.imageUrl}" alt="${course.title}" class="card-image">
          </div>
          <div class="card-content">
            <h2>${course.title}</h2>
            <p class="short-desc">${course.shortDesc}</p>
            <div class="btn-expand-container">
              <button class="btn-expand" onclick="toggleDetails(this, '${course.id}')">อ่านเพิ่มเติม ▼</button>
            </div>
          </div>
        </div>
        
        <div id="${course.id}-details" class="details-container">
          <div class="details-inner">
            <div class="tab-header">
              <button class="tab-btn active" onclick="switchTab(event, '${course.id}-info')">ข้อมูลเบื้องต้น</button>
              <button class="tab-btn" onclick="switchTab(event, '${course.id}-warning')">จุดที่ควรระวัง</button>
              <button class="tab-btn" onclick="switchTab(event, '${course.id}-prof')">อาจารย์</button>
              <button class="tab-btn" onclick="switchTab(event, '${course.id}-tips')">ทริคเก็บ A</button>
            </div>
            
            <div class="tab-content active" id="${course.id}-info">${formatText(course.info)}</div>
            <div class="tab-content" id="${course.id}-warning">⚠️ ${formatText(course.warning)}</div>
            <div class="tab-content" id="${course.id}-prof">👨‍🏫 ${formatText(course.instructor)}</div>
            <div class="tab-content" id="${course.id}-tips">🎯 ${formatText(course.tips)}</div>
          </div>
        </div>
      </div>
    `;
    coursesGrid.insertAdjacentHTML('beforeend', cardHTML);
  });
}

function toggleDetails(btn, courseId) {
  const container = document.getElementById(`${courseId}-details`);
  container.classList.toggle('show');
  
  if (container.classList.contains('show')) {
    btn.innerHTML = "ย่อเนื้อหา ▲";
  } else {
    btn.innerHTML = "อ่านเพิ่มเติม ▼";
  }
}

function switchTab(event, targetId) {
  const container = event.target.closest('.details-inner');
  
  container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  container.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  event.target.classList.add('active');
  container.querySelector(`#${targetId}`).classList.add('active');
}

// ฟังก์ชันสำหรับตัดช่องว่างหัวท้าย และเปลี่ยน \n เป็น <br>
function formatText(text) {
  if (!text) return ""; // ป้องกัน error กรณีไม่มีข้อมูล
  return text.trim().replace(/\n/g, '<br>');
}

fetchCourses();