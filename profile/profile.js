import { CONFIG } from '/config.js';

let viewerUser = null;
let targetUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    if (!token) { window.location.replace('/login/'); return; }

    const id = new URLSearchParams(location.search).get('id');

    try {
        const meRes = await fetch(`${CONFIG.API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (meRes.status === 401) {
            localStorage.removeItem('authToken');
            window.location.replace('/login/');
            return;
        }

        const meData = await meRes.json();
        if (!meData.success || meData.user?.role === 'banned') {
            localStorage.removeItem('authToken');
            window.location.replace('/login/');
            return;
        }

        viewerUser = meData.user;

        if (id) {
            await showProfile(id, token);
        } else {
            showSearch();
        }
    } catch {
        // Network error — still try to render
        if (id) {
            await showProfile(id, token);
        } else {
            showSearch();
        }
    } finally {
        document.body.style.display = 'block';
    }
});

// ─── SEARCH VIEW ──────────────────────────────────────────────────────────────
function showSearch() {
    document.getElementById('searchView').style.display = 'block';

    const input    = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClear');
    const results  = document.getElementById('searchResults');
    let   debounce = null;

    input.addEventListener('input', () => {
        clearTimeout(debounce);
        const q = input.value.trim();
        clearBtn.style.display = q ? 'flex' : 'none';
        if (!q) { results.innerHTML = ''; return; }
        results.innerHTML = '<div class="pf-hint"><i class="fa-solid fa-spinner fa-spin"></i></div>';
        debounce = setTimeout(() => doSearch(q), 350);
    });

    clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        results.innerHTML = '';
        input.focus();
    });
}

async function doSearch(q) {
    const results = document.getElementById('searchResults');
    const token   = localStorage.getItem('authToken');
    try {
        const res  = await fetch(`${CONFIG.API_URL}/users/search?q=${encodeURIComponent(q)}&limit=12`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        renderSearchResults(data.users || []);
    } catch {
        results.innerHTML = '<div class="pf-hint">ค้นหาไม่สำเร็จ กรุณาลองใหม่</div>';
    }
}

function renderSearchResults(users) {
    const results = document.getElementById('searchResults');

    if (users.length === 0) {
        results.innerHTML = '<div class="pf-hint"><i class="fa-solid fa-user-slash"></i> ไม่พบสมาชิก</div>';
        return;
    }

    const cards = users.map(u => {
        const initials = ((u.firstname?.[0] ?? '') + (u.lastname?.[0] ?? '')).toUpperCase()
                         || u.username[0].toUpperCase();
        const name     = `${u.firstname ?? ''} ${u.lastname ?? ''}`.trim() || u.username;
        const roleKey  = u.role?.toLowerCase();
        return `
        <a class="card pf-result-card" href="/profile/?id=${u.id}">
            <div class="pf-result-avatar pf-avatar-${roleKey}">${escapeHtml(initials)}</div>
            <div class="pf-result-info">
                <div class="pf-result-name">${escapeHtml(name)}</div>
                <div class="pf-result-sub">@${escapeHtml(u.username)}</div>
            </div>
            <span class="pf-role-pill pf-pill-${roleKey}">${u.role}</span>
        </a>`;
    }).join('');

    results.innerHTML = `<div class="pf-results-grid">${cards}</div>`;
}

// ─── PROFILE VIEW ─────────────────────────────────────────────────────────────
async function showProfile(id, token) {
    document.getElementById('profileView').style.display = 'block';

    try {
        const res  = await fetch(`${CONFIG.API_URL}/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) { showProfileError(data.error || 'ไม่พบผู้ใช้'); return; }

        targetUser = data.user;
        renderProfile();
        loadAvatar(id, token);
    } catch {
        showProfileError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
}

function renderProfile() {
    document.getElementById('profileState').style.display = 'none';
    document.getElementById('profileCard').style.display  = 'block';

    const u        = targetUser;
    const fullName = `${u.firstname ?? ''} ${u.lastname ?? ''}`.trim() || u.username;

    document.getElementById('profileName').textContent     = fullName;
    document.getElementById('profileUsername').textContent = `@${u.username}`;

    const titleEl = document.querySelector('#dynamic-title');
    if (titleEl) titleEl.textContent = fullName;

    // badges
    const badgeWrap = document.getElementById('profileBadges');
    badgeWrap.innerHTML = '';
    badgeWrap.appendChild(makeBadge(`pf-pill-${u.role?.toLowerCase()}`, u.role));
    if (u.is_verified === 1) badgeWrap.appendChild(makeBadge('pf-pill-verified', '<i class="fa-solid fa-circle-check"></i> Verified'));
    if (u.is_banned   === 1) badgeWrap.appendChild(makeBadge('pf-pill-banned',   '<i class="fa-solid fa-ban"></i> Banned'));

    // info rows
    const grid = document.getElementById('profileInfoGrid');
    grid.innerHTML = '';
    addRow(grid, 'fa-solid fa-id-badge',    'User ID',    u.id);
    addRow(grid, 'fa-solid fa-envelope',    'Email',      u.email);
    addRow(grid, 'fa-solid fa-id-card',     'Student ID', u.student_id);
    addRow(grid, 'fa-solid fa-layer-group', 'OSK Gen',    u.osk_gen);
    addRow(grid, 'fa-solid fa-hashtag',     'OSK ID',     u.osk_id);

    // admin actions
    if (viewerUser?.role === 'admin' && viewerUser.id !== u.id) {
        const zone     = document.getElementById('adminZone');
        const banBtn   = document.getElementById('banBtn');
        const banLabel = document.getElementById('banLabel');
        const isBanned = u.is_banned === 1;

        zone.style.display  = 'block';
        banBtn.className    = isBanned ? 'pf-btn-unban' : 'pf-btn-ban';
        banLabel.textContent = isBanned ? 'Unban User' : 'Ban User';
        banBtn.querySelector('i').className = isBanned
            ? 'fa-solid fa-circle-check'
            : 'fa-solid fa-ban';
        banBtn.onclick = isBanned ? doUnban : doBan;

        document.getElementById('roleSelect').value     = u.role;
        document.getElementById('applyRoleBtn').onclick = doChangeRole;
    }
}

async function doBan() {
    if (!confirm(`Ban @${targetUser.username}?`)) return;
    const r = await adminPost(`/users/${targetUser.id}/ban`);
    if (r.ok) { targetUser.is_banned = 1; renderProfile(); }
    else alert(`❌ ${r.error}`);
}

async function doUnban() {
    const r = await adminPost(`/users/${targetUser.id}/unban`);
    if (r.ok) { targetUser.is_banned = 0; renderProfile(); }
    else alert(`❌ ${r.error}`);
}

async function doChangeRole() {
    const role = document.getElementById('roleSelect').value;
    if (role === targetUser.role) return;
    if (!confirm(`Change @${targetUser.username}'s role to "${role}"?`)) return;

    const token = localStorage.getItem('authToken');
    try {
        const res  = await fetch(`${CONFIG.API_URL}/users/${targetUser.id}/role`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
        const data = await res.json();
        if (res.ok && data.success) { targetUser.role = role; renderProfile(); }
        else alert(`❌ ${data.error || 'Failed to change role'}`);
    } catch {
        alert('❌ ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
    }
}

async function adminPost(path) {
    const token = localStorage.getItem('authToken');
    try {
        const res  = await fetch(`${CONFIG.API_URL}${path}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        return { ok: res.ok && data.success, error: data.error || 'เกิดข้อผิดพลาด' };
    } catch {
        return { ok: false, error: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้' };
    }
}

async function loadAvatar(id, token) {
    try {
        const res = await fetch(`${CONFIG.API_URL}/users/${id}/avatar`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const img  = document.getElementById('profileAvatarImg');
        const icon = document.getElementById('profileAvatarIcon');
        img.src            = URL.createObjectURL(await res.blob());
        img.style.display  = 'block';
        icon.style.display = 'none';
    } catch {}
}

function showProfileError(msg) {
    const el = document.getElementById('profileState');
    el.style.display = 'flex';
    el.innerHTML = `
        <i class="fa-solid fa-circle-exclamation" style="color:#f87171;font-size:2rem"></i>
        <p style="color:#f87171;margin:0">${escapeHtml(msg)}</p>`;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function addRow(grid, icon, label, value) {
    if (value == null || value === '') return;
    const div = document.createElement('div');
    div.className = 'pf-info-row';
    div.innerHTML = `
        <span class="pf-info-icon"><i class="${icon}"></i></span>
        <span class="pf-info-label">${label}</span>
        <span class="pf-info-value">${escapeHtml(String(value))}</span>`;
    grid.appendChild(div);
}

function makeBadge(cls, html) {
    const span = document.createElement('span');
    span.className = `pf-badge ${cls}`;
    span.innerHTML = html;
    return span;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
