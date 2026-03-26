import { CONFIG } from '/config.js';

document.addEventListener('DOMContentLoaded', () => {

  // 1. ซ่อน Dropdown ถ้ายูสเซอร์คลิกที่อื่นบนหน้าจอ
  document.addEventListener('click', (e) => {
    // ดักไว้ว่าถ้าคลิกที่ปุ่ม 3 จุด (ที่ใช้เปิดเมนู) ไม่ต้องปิดตัวเอง
    if (!e.target.matches('.menu-toggle-btn') && !e.target.closest('.menu-toggle-btn')) {
        document.querySelectorAll('.menu-dropdown-content').forEach(menu => {
            menu.classList.remove('show');
        });
    }
  });

  // 2. ใช้ Event Delegation ดักการกดปุ่ม "ลบ" และ "แก้ไข"
  document.body.addEventListener('click', async (e) => {

    // --- 🔴 กรณีคลิกปุ่ม "ลบโพสต์" ---
    if (e.target.classList.contains('delete-post-btn')) {
      const eventId = e.target.getAttribute('data-id');

      if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้? ข้อมูลจะถูกลบถาวร')) return;

      const token = localStorage.getItem('authToken') || '';
      try {
        const response = await fetch(`${CONFIG.API_URL}/event/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ eventId: eventId })
        });

        if (response.ok) {
          alert('ลบโพสต์สำเร็จ');
          location.reload(); // รีโหลดหน้าเพื่ออัปเดต Card
        } else {
          const err = await response.json();
          alert('ไม่สามารถลบโพสต์ได้: ' + (err.error || 'เซิร์ฟเวอร์มีปัญหา'));
        }
      } catch (err) {
        console.error('Delete Error:', err);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
      }
    }

    // --- 🔵 กรณีคลิกปุ่ม "แก้ไขโพสต์" ---
    if (e.target.classList.contains('edit-post-btn')) {
      const eventId = e.target.getAttribute('data-id');

      // 1. ตั้งค่า ID เพื่อให้ post-create.js รู้ว่ากำลังเข้าสู่โหมด "แก้ไข"
      window.editingEventId = eventId;

      // 2. ดึงข้อมูลเดิมมาใส่ใน Form 
      // (เราจะดึงข้อมูลจาก Array global ที่ชื่อ window.eventList ซึ่งมาจากตอน Fetch ข้อมูลครั้งแรก)
      if (window.eventList) {
          const eventData = window.eventList.find(ev => Number(ev.id) === Number(eventId));
          
          if (eventData) {
              // ใส่ Header และ Type
              document.querySelector('input[name="header"]').value = eventData.header || '';
              
              const typeSelect = document.getElementById('typeSelect');
              if (typeSelect) {
                  typeSelect.value = eventData.type;
                  // บังคับให้เกิด Event Change เพื่อให้ UI สลับหน้าจอเป็นแบบ Poll หรือ Activity ตามประเภท
                  typeSelect.dispatchEvent(new Event('change')); 
              }

              // ใส่ Description (ถ้ามี)
              if (eventData.type !== 'Poll') {
                  const descInput = document.querySelector('textarea[name="description"]');
                  if (descInput) descInput.value = eventData.description || '';
              } else {
                  // ถ้าเป็นโหมด Poll อาจจะต้องเขียนโค้ดเพิ่มเพื่อเติมข้อมูล Choice เก่าลงไป
                  // แต่เบื้องต้นให้เปิดหน้าต่างขึ้นมาก่อน
                  console.log("เข้าโหมดแก้ไข Poll (อาจต้องเติมข้อมูล Choice เพิ่ม)");
              }
          }
      }

      // 3. เปิดหน้าต่าง Modal Form ขึ้นมา
      const modal = document.getElementById('postModal');
      if (modal) {
          modal.style.display = 'flex';
          const form = document.getElementById('createPostForm');
          if (form) form.scrollTop = 0; // เลื่อนกลับไปบนสุดของฟอร์ม
      }
    }

  });
});