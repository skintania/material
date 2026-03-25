import { CONFIG } from '/config.js';

document.addEventListener('DOMContentLoaded', () => {
    const passwordForm = document.getElementById('changePasswordForm');
    
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleChangePassword();
        });
    }
});

async function handleChangePassword() {
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmNewPassword');
    const saveBtn = document.getElementById('savePasswordBtn');

    // 1. ดึงค่าจาก Input
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // 2. Validation เบื้องต้น (Client-side)
    if (newPassword !== confirmPassword) {
        alert("⚠️ รหัสผ่านใหม่ไม่ตรงกัน! กรุณาตรวจสอบอีกครั้ง");
        confirmPasswordInput.focus();
        return;
    }

    if (newPassword.length < 8) {
        alert("⚠️ รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
        newPasswordInput.focus();
        return;
    }

    if (newPassword === currentPassword) {
        alert("⚠️ รหัสผ่านใหม่ห้ามซ้ำกับรหัสผ่านเดิม");
        newPasswordInput.focus();
        return;
    }

    // 3. เริ่มกระบวนการส่ง API
    try {
        setLoading(true, saveBtn);

        const token = localStorage.getItem("authToken");
        if (!token) {
            alert("❌ เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
            window.location.href = '/login/';
            return;
        }

        const response = await fetch(`${CONFIG.API_URL}/user/change-password`, {
            method: 'PUT', // หรือ POST ตามที่ Backend กำหนด
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว!");
            document.getElementById('changePasswordForm').reset();
        } else {
            // แจ้ง Error จาก Backend (เช่น รหัสผ่านเดิมไม่ถูกต้อง)
            throw new Error(result.error || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
        }

    } catch (error) {
        alert("⚠️ " + error.message);
    } finally {
        setLoading(false, saveBtn);
    }
}

// Helper function สำหรับสถานะ Loading
function setLoading(isLoading, btn) {
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปเดต...';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalHtml || '<i class="fa-solid fa-key"></i> อัปเดตรหัสผ่าน';
    }
}