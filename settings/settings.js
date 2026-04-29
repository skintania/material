import { CONFIG } from '/config.js';

function showToast(message, type = 'success') {
    const existing = document.getElementById('settings-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'settings-toast';
    toast.className = `settings-toast settings-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserData();

    document.querySelectorAll('.nav-item[data-section]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById('section-' + this.getAttribute('data-section'))?.classList.add('active');
        });
    });

    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const profileForm = document.getElementById('profileForm');
    const imageUpload = document.getElementById('imageUpload');
    const settingsLogoutBtn = document.getElementById('settingsContentLogoutBtn');

    const startDeleteBtn = document.getElementById('startDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteArea = document.getElementById('confirmDeleteArea');
    const initialDeleteArea = document.getElementById('initialDeleteArea');
    const finalDeleteBtn = document.getElementById('finalDeleteBtn');

    if (editBtn) editBtn.addEventListener('click', () => toggleEditMode(true));

    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        toggleEditMode(false);
        loadUserData();
    });

    if (imageUpload) {
        imageUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                showToast('ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ขนาดไม่เกิน 5MB', 'error');
                this.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function(event) {
                const imgPreview = document.getElementById('imagePreview');
                const iconEl = document.getElementById('mainIcon');
                imgPreview.src = event.target.result;
                imgPreview.style.display = 'block';
                iconEl.style.display = 'none';
            };
            reader.readAsDataURL(file);
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateUserData();
        });
    }

    if (settingsLogoutBtn) {
        settingsLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    if (startDeleteBtn) {
        startDeleteBtn.onclick = () => {
            confirmDeleteArea.classList.remove('hidden');
            initialDeleteArea.classList.add('hidden');
        };
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.onclick = () => {
            confirmDeleteArea.classList.add('hidden');
            initialDeleteArea.classList.remove('hidden');
            document.getElementById('deleteConfirmPassword').value = '';
        };
    }

    if (finalDeleteBtn) {
        finalDeleteBtn.onclick = async () => {
            const password = document.getElementById('deleteConfirmPassword').value;
            if (!password) {
                showToast('กรุณากรอกรหัสผ่านเพื่อยืนยัน', 'error');
                return;
            }
            await processDeleteAccount(password);
        };
    }
});

async function loadUserData() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${CONFIG.API_URL}/users/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error);

        const user = resData.user;
        if (!user) return;
        localStorage.setItem('userId', user.id ?? '');

        setInputValue('firstName', user.firstname);
        setInputValue('lastName', user.lastname);
        setInputValue('username', user.username);
        setInputValue('email', user.email);
        setInputValue('oskGen', user.osk_gen);
        setInputValue('oskNum', user.osk_id);
        setInputValue('cuId', user.student_id);

        if (user.profile_url) {
            updateAvatarDisplay('sidebarAvatar', 'sidebarIcon', user.id);
            updateAvatarDisplay('imagePreview', 'mainIcon', user.id);
        }

        const sidebarName = document.getElementById('sidebarUsername');
        if (sidebarName) sidebarName.innerText = user.username || 'User';

        const unverifiedWarning = document.getElementById('unverifiedWarning');
        if (unverifiedWarning) {
            unverifiedWarning.style.display = user.is_verified ? 'none' : 'flex';
        }

        toggleEditMode(false);
    } catch {
        showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
    }
}

async function updateUserData() {
    const saveBtn = document.getElementById('saveProfileBtn');
    if (!saveBtn) return;
    const originalBtnHtml = saveBtn.innerHTML;

    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        if (!userId) throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');

        const oskGenVal = document.getElementById('oskGen').value.trim();
        const patchBody = {
            firstname: document.getElementById('firstName').value.trim(),
            lastname: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            student_id: document.getElementById('cuId').value.trim(),
            osk_id: document.getElementById('oskNum').value.trim(),
            ...(oskGenVal !== '' && { osk_gen: Number(oskGenVal) }),
        };
        const patchRes = await fetch(`${CONFIG.API_URL}/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(patchBody),
        });
        const patchResult = await patchRes.json();
        if (!patchRes.ok) throw new Error(patchResult.error || 'บันทึกล้มเหลว');

        const avatarFile = document.getElementById('imageUpload')?.files?.[0];
        if (avatarFile) {
            const avatarRes = await fetch(`${CONFIG.API_URL}/users/${userId}/avatar`, {
                method: 'PUT',
                headers: { 'Content-Type': avatarFile.type, 'Authorization': `Bearer ${token}` },
                body: avatarFile,
            });
            if (!avatarRes.ok) throw new Error('อัปโหลดรูปโปรไฟล์ไม่สำเร็จ');
        }

        showToast('บันทึกข้อมูลสำเร็จ');
        toggleEditMode(false);
        loadUserData();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHtml;
    }
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function toggleEditMode(isEditing) {
    ['firstName', 'lastName', 'email', 'cuId', 'oskGen', 'oskNum'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !isEditing;
    });
    const usernameEl = document.getElementById('username');
    if (usernameEl) usernameEl.disabled = true;

    const avatarActions = document.querySelector('.avatar-actions');
    if (avatarActions) avatarActions.style.display = isEditing ? 'flex' : 'none';

    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const saveBtn = document.getElementById('saveProfileBtn');

    if (editBtn) editBtn.style.display = isEditing ? 'none' : 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = isEditing ? 'inline-flex' : 'none';
    if (saveBtn) saveBtn.style.display = isEditing ? 'inline-flex' : 'none';
}

async function updateAvatarDisplay(imgId, iconId, userId) {
    const imgEl = document.getElementById(imgId);
    const iconEl = document.getElementById(iconId);
    if (!imgEl || !iconEl || !userId) return;

    try {
        const response = await fetch(`${CONFIG.API_URL}/users/${userId}/avatar`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (!response.ok) throw new Error('no avatar');
        const blob = await response.blob();
        imgEl.src = URL.createObjectURL(blob);
        imgEl.style.display = 'block';
        iconEl.style.display = 'none';
    } catch {
        // no avatar — default icon stays visible
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    window.location.href = '/login/';
}

async function processDeleteAccount() {
    try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        if (!userId) throw new Error('ไม่พบข้อมูลผู้ใช้');

        const finalDeleteBtn = document.getElementById('finalDeleteBtn');
        if (finalDeleteBtn) {
            finalDeleteBtn.disabled = true;
            finalDeleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังลบ...';
        }

        const response = await fetch(`${CONFIG.API_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });

        const result = await response.json();

        if (response.ok) {
            showToast('บัญชีของคุณถูกลบเรียบร้อยแล้ว');
            setTimeout(() => {
                localStorage.removeItem('authToken');
                window.location.href = '/';
            }, 1500);
        } else {
            showToast(result.error || 'ไม่สามารถลบบัญชีได้', 'error');
            if (finalDeleteBtn) {
                finalDeleteBtn.disabled = false;
                finalDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> ยืนยันการลบถาวร';
            }
        }
    } catch (e) {
        showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    }
}
