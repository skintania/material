import { CONFIG } from '../config.js';

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector('form');

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // ป้องกันการรีเฟรชหน้าเว็บ

    const emailOrUser = document.getElementById("student_id").value;
    const password = document.getElementById("password").value;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;

    submitBtn.innerText = "กำลังเข้าสู่ระบบ...";
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: emailOrUser,
          password: password
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("userId", result.user?.id ?? "");
        localStorage.setItem("username", result.user?.username ?? "");
        localStorage.setItem("role", result.user?.role ?? "");

        // 2. ส่งไปหน้า Dashboard หรือหน้าแรก (แก้ path ตามต้องการ)
        window.location.replace("/");
      } else {
        // 🚨 กรณีพิเศษ: ถ้ายังไม่ได้ยืนยัน OTP (Error 403 ที่เราเขียนไว้ใน Worker)
        const needsVerify = response.status === 403 ||
          (result.error && result.error.toLowerCase().includes('verif'));

        if (needsVerify) {
          const params = new URLSearchParams({ identifier: emailOrUser, from: 'login' });
          if (result.email) params.set('email', result.email);
          window.location.href = `/register/verify-email.html?${params}`;
        } else {
          alert("ผิดพลาด: " + (result.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
        }

        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
    }
  });
});