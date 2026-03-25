import { CONFIG } from '/config.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. การตั้งค่าตัวแปร (Configuration & Elements) ---
  const UI = {
    modal: document.getElementById('postModal'),
    form: document.getElementById('createPostForm'),
    typeSelect: document.getElementById('typeSelect'),
    standardArea: document.getElementById('standardArea'),
    pollArea: document.getElementById('pollArea'),
    pollCountSelect: document.getElementById('pollCountSelect'),
    pollChoicesContainer: document.getElementById('pollChoicesContainer'),
    submitBtn: document.getElementById('submitBtn'),
    openBtn: document.getElementById('openModalBtn'),
    closeBtn: document.getElementById('closeModalBtn')
  };

  /**
   * 🌟 การแก้ปัญหาแบบยั่งยืน: 
   * ดักจับ Error ของ <img> ทั้งหน้าเว็บ (รวมถึงที่ถูกสร้างใหม่แบบ Dynamic)
   * หากรูปใดโหลดไม่ขึ้น (404) ให้สั่งซ่อนตัวมันเองทันที
   */
  document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
      e.target.style.display = 'none';
      e.target.classList.add('img-error'); // สำหรับให้ CSS จัดการต่อได้ถ้าต้องการ
    }
  }, true);

  // --- 2. ฟังก์ชันหลักสำหรับจัดการ UI (UI Logic) ---

  const toggleFormType = (type) => {
    const isPoll = type === 'Poll';
    UI.pollArea.style.display = isPoll ? 'block' : 'none';
    UI.standardArea.style.display = isPoll ? 'none' : 'block';

    toggleInputsValidation(UI.pollArea, !isPoll);
    toggleInputsValidation(UI.standardArea, isPoll);

    if (isPoll) renderPollChoices(UI.pollCountSelect.value);
  };

  const toggleInputsValidation = (container, shouldDisable) => {
    const inputs = container.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.disabled = shouldDisable;
    });
  };

  const renderPollChoices = (count) => {
    UI.pollChoicesContainer.innerHTML = '';
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
      UI.pollChoicesContainer.appendChild(div);
    }
  };

  // --- 3. ฟังก์ชันจัดการข้อมูล (Data Handling) ---

  const getFormData = () => {
    const formData = new FormData();
    const type = UI.typeSelect.value;

    formData.append('type', type);
    formData.append('header', UI.form.header.value);

    if (type === 'Poll') {
      const count = UI.pollCountSelect.value;
      let texts = [];
      for (let i = 1; i <= count; i++) {
        texts.push(UI.form[`choiceText_${i}`].value);
        const fileInput = UI.form[`choiceImage_${i}`];
        if (fileInput && fileInput.files.length > 0) {
          formData.append('images', fileInput.files[0]);
        } else {
          // ยังคงส่ง Blob ว่างเพื่อรักษา Index ให้ตรงกับ DB ในตาราง pollChoices
          formData.append('images', new Blob());
        }
      }
      formData.append('choices', texts.join(','));
    } else {
      formData.append('description', UI.form.description.value);
      const fileInput = document.getElementById('singleImageInput');
      // ถ้าไม่มีการเลือกไฟล์ จะไม่ append 'images' เพื่อให้ DB เก็บเป็น NULL
      if (fileInput && fileInput.files.length > 0) {
        formData.append('images', fileInput.files[0]);
      }
    }
    return formData;
  };

  // --- 4. การเชื่อมต่อ Event Listeners ---

  UI.openBtn.onclick = () => {
    UI.modal.style.display = 'flex';
    UI.form.scrollTop = 0;
  };

  UI.closeBtn.onclick = () => UI.modal.style.display = 'none';

  window.onclick = (e) => {
    if (e.target === UI.modal) UI.modal.style.display = 'none';
  };

  UI.typeSelect.onchange = (e) => toggleFormType(e.target.value);
  UI.pollCountSelect.onchange = (e) => renderPollChoices(e.target.value);

  UI.form.onsubmit = async (e) => {
    e.preventDefault();
    UI.submitBtn.disabled = true;
    UI.submitBtn.innerText = 'กำลังส่ง...';

    const token = localStorage.getItem('authToken');
    const data = getFormData();

    try {
      const response = await fetch(`${CONFIG.API_URL}/event/create`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      if (response.ok) {
        alert('สร้างโพสต์สำเร็จ!');
        location.reload();
      } else {
        const err = await response.json();
        alert('Error: ' + (err.error || 'เกิดข้อผิดพลาดบางอย่าง'));
      }
    } catch (err) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      UI.submitBtn.disabled = false;
      UI.submitBtn.innerText = 'โพสต์กิจกรรมเลย';
    }
  };

  toggleFormType(UI.typeSelect.value);
});