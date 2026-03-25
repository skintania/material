import { CONFIG } from '/config.js';

document.addEventListener('DOMContentLoaded', () => {

  // 1. ซ่อน Dropdown ถ้ายูสเซอร์คลิกที่อื่นบนหน้าจอ
  document.addEventListener('click', () => {
    document.querySelectorAll('.menu-dropdown-content').forEach(menu => {
      menu.classList.remove('show');
    });
  });

  // 2. ใช้ Event Delegation ดักการกดปุ่ม "ลบ" และ "แก้ไข"
  document.body.addEventListener('click', async (e) => {

    // --- กรณีคลิกปุ่ม "ลบโพสต์" ---
    if (e.target.classList.contains('delete-post-btn')) {
      const eventId = e.target.getAttribute('data-id');

      if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้? ข้อมูลจะถูกลบถาวร')) return;

      const token = localStorage.getItem('authToken') || '';
      try {
        // ยิง API ไปขอลบ (ปรับ URL เป็นของระบบคุณ)
        const response = await fetch(`${CONFIG.API_URL}/event/delete`, {
          method: 'POST', // หรือ DELETE ตามที่ Backend เขียนไว้
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
          alert('ไม่สามารถลบโพสต์ได้ (คุณอาจไม่มีสิทธิ์ หรือเซิร์ฟเวอร์มีปัญหา)');
        }
      } catch (err) {
        console.error('Delete Error:', err);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
      }
    }

    // --- กรณีคลิกปุ่ม "แก้ไขโพสต์" ---

  });

});