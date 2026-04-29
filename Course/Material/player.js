import { CONFIG } from '/config.js';

const player = document.getElementById("videoPlayer");
const catalog = document.getElementById("catalog");
const token = () => localStorage.getItem("authToken") || '';

let currentCourseId = null;

// ── Custom controls ──────────────────────────────────────────────
const playBtn       = document.getElementById('playBtn');
const playIcon      = document.getElementById('playIcon');
const pauseIcon     = document.getElementById('pauseIcon');
const muteBtn       = document.getElementById('muteBtn');
const volOnIcon     = document.getElementById('volOnIcon');
const volOffIcon    = document.getElementById('volOffIcon');
const seekBar       = document.getElementById('seekBar');
const seekWrap      = document.getElementById('seekWrap');
const volumeBar     = document.getElementById('volumeBar');
const timeDisplay   = document.getElementById('timeDisplay');
const speedToggle   = document.getElementById('speedToggle');
const speedMenu     = document.getElementById('speedMenu');
const videoControls = document.getElementById('videoControls');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const fsEnterIcon   = document.getElementById('fsEnterIcon');
const fsExitIcon    = document.getElementById('fsExitIcon');
const playerWrap    = document.getElementById('playerWrap');
const skipBackBtn   = document.getElementById('skipBackBtn');
const skipFwdBtn    = document.getElementById('skipFwdBtn');
const previewVideo  = document.getElementById('previewVideo');
const seekPreview   = document.getElementById('seekPreview');
const previewTimeEl = document.getElementById('previewTime');
const dblLeft       = document.getElementById('dblLeft');
const dblRight      = document.getElementById('dblRight');

function fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function syncPlay() {
    playIcon.style.display  = player.paused ? '' : 'none';
    pauseIcon.style.display = player.paused ? 'none' : '';
}

function syncVol() {
    const muted = player.muted || player.volume === 0;
    volOnIcon.style.display  = muted ? 'none' : '';
    volOffIcon.style.display = muted ? '' : 'none';
    volumeBar.style.setProperty('--pct', `${muted ? 0 : player.volume * 100}%`);
}

// Play / Pause
playBtn.addEventListener('click', () => player.paused ? player.play() : player.pause());
player.addEventListener('click', () => player.paused ? player.play() : player.pause());
player.addEventListener('play',  syncPlay);
player.addEventListener('pause', syncPlay);

// Seek bar
player.addEventListener('timeupdate', () => {
    if (!player.duration) return;
    const pct = (player.currentTime / player.duration) * 100;
    seekBar.value = pct;
    seekBar.style.setProperty('--pct', `${pct}%`);
    timeDisplay.textContent = `${fmt(player.currentTime)} / ${fmt(player.duration)}`;
});
player.addEventListener('loadedmetadata', () => {
    timeDisplay.textContent = `0:00 / ${fmt(player.duration)}`;
});
seekBar.addEventListener('input', () => {
    if (player.duration) player.currentTime = (seekBar.value / 100) * player.duration;
    seekBar.style.setProperty('--pct', `${seekBar.value}%`);
});

// Volume
volumeBar.addEventListener('input', () => {
    player.volume = parseFloat(volumeBar.value);
    player.muted = player.volume === 0;
    syncVol();
});
muteBtn.addEventListener('click', () => {
    player.muted = !player.muted;
    if (!player.muted && player.volume === 0) player.volume = 0.5;
    volumeBar.value = player.muted ? 0 : player.volume;
    syncVol();
});
player.addEventListener('volumechange', syncVol);

// Speed
speedToggle.addEventListener('click', e => { e.stopPropagation(); speedMenu.classList.toggle('open'); });
document.addEventListener('click', () => speedMenu.classList.remove('open'));
speedMenu.querySelectorAll('.speed-opt').forEach(opt => {
    opt.addEventListener('click', () => {
        player.playbackRate = parseFloat(opt.dataset.speed);
        speedToggle.textContent = opt.textContent;
        speedMenu.querySelectorAll('.speed-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        speedMenu.classList.remove('open');
    });
});

// Fullscreen (with Safari webkit fallbacks)
const enterFullscreen = el => el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.();
const exitFullscreen  = () => document.exitFullscreen?.() ?? document.webkitExitFullscreen?.();
const getFullscreenEl = () => document.fullscreenElement ?? document.webkitFullscreenElement;

fullscreenBtn.addEventListener('click', () => {
    getFullscreenEl() ? exitFullscreen() : enterFullscreen(playerWrap);
});

function onFsChange() {
    const fs = !!getFullscreenEl();
    fsEnterIcon.style.display = fs ? 'none' : '';
    fsExitIcon.style.display  = fs ? '' : 'none';
}
document.addEventListener('fullscreenchange', onFsChange);
document.addEventListener('webkitfullscreenchange', onFsChange);

syncPlay();
syncVol();

// ── Skip ±10s ────────────────────────────────────────────────
skipBackBtn.addEventListener('click', () => {
    player.currentTime = Math.max(0, player.currentTime - 10);
});
skipFwdBtn.addEventListener('click', () => {
    player.currentTime = Math.min(player.duration || 0, player.currentTime + 10);
});

// ── Seek bar preview ─────────────────────────────────────────
const PREVIEW_W = 160;
let previewSeeking = false;

function showSeekPreview() {
    if (player.src && isFinite(player.duration)) seekPreview.style.display = 'flex';
}
function hideSeekPreview() {
    seekPreview.style.display = 'none';
    previewSeeking = false;
}
function updatePreview(clientX, time) {
    if (!isFinite(player.duration) || !previewVideo.src) return;
    const wrapRect = seekWrap.getBoundingClientRect();
    const raw  = clientX - wrapRect.left - PREVIEW_W / 2;
    const left = Math.max(0, Math.min(wrapRect.width - PREVIEW_W, raw));
    seekPreview.style.left = `${left}px`;
    previewTimeEl.textContent = fmt(time);
    if (!previewSeeking) {
        previewSeeking = true;
        previewVideo.currentTime = time;
    }
}

// Desktop
seekBar.addEventListener('mouseenter', showSeekPreview);
seekBar.addEventListener('mouseleave', hideSeekPreview);
seekBar.addEventListener('mousemove', e => {
    const rect = seekBar.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updatePreview(e.clientX, pct * player.duration);
});

// Mobile
seekBar.addEventListener('touchstart', showSeekPreview, { passive: true });
seekBar.addEventListener('touchend', () => setTimeout(hideSeekPreview, 400), { passive: true });
seekBar.addEventListener('touchmove', e => {
    const touch = e.touches[0];
    const rect  = seekBar.getBoundingClientRect();
    const pct   = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    updatePreview(touch.clientX, pct * player.duration);
}, { passive: true });

previewVideo.addEventListener('seeked', () => { previewSeeking = false; });

// ── Mobile double-tap ────────────────────────────────────────
function showTapIndicator(side) {
    const el = side === 'left' ? dblLeft : dblRight;
    el.classList.remove('active');
    void el.offsetWidth; // restart animation
    el.classList.add('active');
}

let lastTapTime  = 0;
let tapTimeoutId = null;

playerWrap.addEventListener('touchend', e => {
    if (e.target.closest('.video-controls, .catalog')) return;
    e.preventDefault();

    const now = Date.now();
    const gap = now - lastTapTime;

    if (gap < 300 && gap > 0) {
        clearTimeout(tapTimeoutId);
        lastTapTime = 0;
        const { left, width } = playerWrap.getBoundingClientRect();
        if (e.changedTouches[0].clientX < left + width / 2) {
            player.currentTime = Math.max(0, player.currentTime - 10);
            showTapIndicator('left');
        } else {
            player.currentTime = Math.min(player.duration || 0, player.currentTime + 10);
            showTapIndicator('right');
        }
    } else {
        lastTapTime = now;
        tapTimeoutId = setTimeout(() => {
            player.paused ? player.play() : player.pause();
        }, 300);
    }
}, { passive: false });

async function findCourseId() {
    const res = await fetch(`${CONFIG.API_URL}/courses`, {
        headers: { 'Authorization': `Bearer ${token()}` }
    });
    if (!res.ok) throw new Error(`GET /courses failed: ${res.status}`);
    const { courses = [] } = await res.json();
    const match = courses.find(c => c.title?.toLowerCase().includes('material'));
    if (!match) throw new Error('ไม่พบคอร์ส Material ในระบบ');
    return match.id;
}

async function fetchClips(courseId) {
    const res = await fetch(`${CONFIG.API_URL}/courses/${courseId}/clips`, {
        headers: { 'Authorization': `Bearer ${token()}` }
    });
    if (!res.ok) throw new Error(`GET /courses/${courseId}/clips failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.files ?? data.clips ?? []);
}

function playClip(courseId, key, el, { autoplay = true } = {}) {
    document.querySelectorAll(".item").forEach(i => i.classList.remove("active"));
    el.classList.add("active");

    player.src = `${CONFIG.API_URL}/courses/${courseId}/clips/${encodeURIComponent(key)}?token=${encodeURIComponent(token())}`;
    previewVideo.src = player.src;
    previewVideo.load();
    seekPreview.style.display = 'none';
    if (!autoplay) return;

    player.play().catch(() => {
        // Autoplay blocked — retry muted, unmute on first user interaction
        player.muted = true;
        player.play().catch(() => {});
        document.addEventListener('click', () => { player.muted = false; }, { once: true });
    });
}

(async () => {
    try {
        currentCourseId = await findCourseId();
        const clips = await fetchClips(currentCourseId);

        if (!clips.length) {
            catalog.innerHTML = '<p style="color:#94a3b8;padding:16px;text-align:center;">ยังไม่มีคลิปในขณะนี้</p>';
            return;
        }

        clips.forEach((clip, index) => {
            const div = document.createElement("div");
            div.className = "item";

            const key = clip.key ?? clip.id ?? clip.name ?? String(index + 1);
            const filename = key.includes('/') ? key.split('/').pop() : key;
            const displayName = filename.replace(/\.[^.]+$/, '') || `คลิปที่ ${index + 1}`;
            div.textContent = displayName;

            div.onclick = () => playClip(currentCourseId, key, div, { autoplay: true });
            catalog.appendChild(div);

            if (index === 0) playClip(currentCourseId, key, div);
        });
    } catch (err) {
        console.error('Course init error:', err);
        catalog.innerHTML = `<p style="color:#ef4444;padding:16px;">โหลดข้อมูลไม่สำเร็จ: ${err.message}</p>`;
    }
})();
