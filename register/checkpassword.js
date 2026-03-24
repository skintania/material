import { CONFIG } from '/config.js';

const form = document.getElementById('registerForm');
const username = document.getElementById('username');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirm_password');

// 1. ฟังก์ชันเช็คการพิมพ์รหัสผ่านแบบ Real-time
function validatePassword() {
  if (confirmPassword.value !== password.value) {
    confirmPassword.setCustomValidity("รหัสผ่านไม่ตรงกันครับ");
  } else {
    confirmPassword.setCustomValidity(""); 
  }
}

password.addEventListener('input', validatePassword);
confirmPassword.addEventListener('input', validatePassword);

// 2. ดักจับตอนกดปุ่ม Submit (เพิ่ม async เข้าไปเพื่อให้ใช้ await fetch ได้)
form.addEventListener('submit', async function(e) {
  // หยุดการส่งฟอร์มแบบปกติไว้ก่อน เพื่อให้ JS ตรวจสอบให้เสร็จ
  e.preventDefault(); 

  // --- A. เช็คว่าทุกช่องต้องกรอกข้อมูล (ห้ามมีแต่ช่องว่าง) ---
  const inputs = form.querySelectorAll('input[required]'); 
  let isAllFilled = true;

  inputs.forEach(input => {
    if (input.value.trim() === '') {
      isAllFilled = false;
      input.focus(); 
    }
  });

  if (!isAllFilled) {
    alert('กรุณากรอกข้อมูลให้ครบทุกช่อง (ห้ามพิมพ์แค่ช่องว่าง) ครับ');
    return; 
  }

  // --- B. เช็ค Username ว่าถูกต้องไหม (อังกฤษ/ตัวเลข เท่านั้น) ---
  const usernameRegex = /^[a-zA-Z0-9]+$/;
  if (!usernameRegex.test(username.value)) {
    alert('ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลขเท่านั้นครับ');
    username.focus();
    return;
  }

  // --- C. เช็ครหัสผ่านว่าตรงกันไหม ---
  if (password.value !== confirmPassword.value) {
    alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกันครับ');
    confirmPassword.focus();
    return;
  }

  // --- D. ถ้าผ่านด่านทั้งหมด ให้รวบรวมข้อมูลยิงไปที่ API ---
  
  // ปรับปุ่มให้เป็นสถานะกำลังโหลด (ป้องกันคนกดรัวๆ)
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerText;
  submitBtn.innerText = "กำลังลงทะเบียน...";
  submitBtn.disabled = true;

  // รวบรวมข้อมูลจากฟอร์ม
  const formData = {
    firstname: document.getElementById('firstname').value.trim(),
    lastname: document.getElementById('lastname').value.trim(),
    username: username.value.trim(),
    osk_gen: parseInt(document.getElementById('osk_gen').value.trim()), // แปลงเป็นตัวเลข
    osk_id: document.getElementById('osk_id').value.trim(),
    student_id: document.getElementById('student_id').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: password.value // รหัสผ่านไม่ต้อง trim
  };

  try {
    // ⚠️ อย่าลืมเปลี่ยน URL ตรงนี้ให้เป็นของ Worker คุณจริงๆ นะครับ!
    
    const response = await fetch(`${CONFIG.API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // 🌟 สมัครสำเร็จ! ฝากอีเมลไว้ใน sessionStorage (วิธีที่ 2)
      sessionStorage.setItem("pendingVerificationEmail", formData.email);
      
      // เปลี่ยนหน้าไปยืนยันอีเมล
      window.location.replace("verify-email.html"); 
    } else {
      // กรณี Error จากฝั่ง API (เช่น อีเมลซ้ำ, Username ซ้ำ)
      alert("เกิดข้อผิดพลาด: " + (result.error || "ไม่สามารถลงทะเบียนได้"));
      
      // คืนค่าปุ่มกลับมาให้กดใหม่ได้
      submitBtn.innerText = originalBtnText;
      submitBtn.disabled = false;
    }

  } catch (error) {
    // กรณีเน็ตหลุด หรือ API ล่ม
    alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    console.error(error);
    
    // คืนค่าปุ่ม
    submitBtn.innerText = originalBtnText;
    submitBtn.disabled = false;
  }
});