import { CONFIG } from '/config.js';

// --- Tab switching ---
const tabBtns = document.querySelectorAll('.tab-btn');
const oskForm = document.getElementById('oskForm');
const memberForm = document.getElementById('memberForm');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.tab === 'osk') {
      oskForm.style.display = '';
      memberForm.style.display = 'none';
    } else {
      oskForm.style.display = 'none';
      memberForm.style.display = '';
    }
  });
});

// --- Shared helpers ---
const usernameRegex = /^[a-zA-Z0-9]+$/;

function validatePasswordMatch(passwordEl, confirmEl) {
  confirmEl.setCustomValidity(
    confirmEl.value && confirmEl.value !== passwordEl.value ? "รหัสผ่านไม่ตรงกันครับ" : ""
  );
}

function checkAllFilled(form) {
  const inputs = form.querySelectorAll('input[required]');
  for (const input of inputs) {
    if (input.value.trim() === '') {
      input.focus();
      return false;
    }
  }
  return true;
}

async function submitRegistration(endpoint, formData, submitBtn) {
  const originalText = submitBtn.innerText;
  submitBtn.innerText = "กำลังลงทะเบียน...";
  submitBtn.disabled = true;

  try {
    const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      window.location.replace(`verify-email.html?identifier=${encodeURIComponent(formData.email)}`);
    } else {
      alert("เกิดข้อผิดพลาด: " + (result.error || "ไม่สามารถลงทะเบียนได้"));
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
    }
  } catch (error) {
    alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    console.error(error);
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
}

// --- OSK Form ---
const oskPassword = document.getElementById('password');
const oskConfirm = document.getElementById('confirm_password');

oskPassword.addEventListener('input', () => validatePasswordMatch(oskPassword, oskConfirm));
oskConfirm.addEventListener('input', () => validatePasswordMatch(oskPassword, oskConfirm));

oskForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!checkAllFilled(oskForm)) {
    alert('กรุณากรอกข้อมูลให้ครบทุกช่อง (ห้ามพิมพ์แค่ช่องว่าง) ครับ');
    return;
  }

  const username = document.getElementById('username');
  if (!usernameRegex.test(username.value)) {
    alert('ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลขเท่านั้นครับ');
    username.focus();
    return;
  }

  if (oskPassword.value !== oskConfirm.value) {
    alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกันครับ');
    oskConfirm.focus();
    return;
  }

  await submitRegistration('/users/register/osk', {
    name: document.getElementById('firstname').value.trim(),
    surname: document.getElementById('lastname').value.trim(),
    username: username.value.trim(),
    OSK_gen: parseInt(document.getElementById('osk_gen').value.trim()),
    OSK_number: document.getElementById('osk_id').value.trim(),
    CU_number: document.getElementById('student_id').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: oskPassword.value
  }, oskForm.querySelector('button[type="submit"]'));
});

// --- Member Form ---
const memberPassword = document.getElementById('m-password');
const memberConfirm = document.getElementById('m-confirm_password');

memberPassword.addEventListener('input', () => validatePasswordMatch(memberPassword, memberConfirm));
memberConfirm.addEventListener('input', () => validatePasswordMatch(memberPassword, memberConfirm));

memberForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!checkAllFilled(memberForm)) {
    alert('กรุณากรอกข้อมูลให้ครบทุกช่อง (ห้ามพิมพ์แค่ช่องว่าง) ครับ');
    return;
  }

  const username = document.getElementById('m-username');
  if (!usernameRegex.test(username.value)) {
    alert('ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลขเท่านั้นครับ');
    username.focus();
    return;
  }

  if (memberPassword.value !== memberConfirm.value) {
    alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกันครับ');
    memberConfirm.focus();
    return;
  }

  await submitRegistration('/users/register/member', {
    name: document.getElementById('m-firstname').value.trim(),
    surname: document.getElementById('m-lastname').value.trim(),
    username: username.value.trim(),
    CU_number: document.getElementById('m-student_id').value.trim(),
    email: document.getElementById('m-email').value.trim(),
    password: memberPassword.value
  }, memberForm.querySelector('button[type="submit"]'));
});
