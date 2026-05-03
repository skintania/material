import { CONFIG } from '/config.js';

const GRADIENTS = [
  ['#1a3a6b', '#3b82f6'], ['#1a4a3a', '#10b981'],
  ['#3b1a6b', '#8b5cf6'], ['#6b3a1a', '#f59e0b'],
  ['#1a3a6b', '#06b6d4'], ['#6b1a3a', '#ec4899'],
  ['#2d4a1a', '#84cc16'], ['#1a2a6b', '#6366f1'],
];

const params   = new URLSearchParams(location.search);
const courseId = params.get('id');
const token    = () => localStorage.getItem('authToken') || '';

let nextCursor    = null;
let isLoading     = false;
let activeClipKey = null;

function gradientFor(n) {
  const [a, b] = GRADIENTS[n % GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

function formatSize(bytes) {
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fileIcon(t = '') {
  if (t.includes('pdf'))          return '📕';
  if (t.includes('zip'))          return '🗜️';
  if (t.includes('presentation')) return '📊';
  if (t.includes('spreadsheet'))  return '📗';
  if (t.includes('word'))         return '📘';
  if (t.startsWith('image/'))     return '🖼️';
  return '📄';
}

async function apiFetch(path) {
  const res = await fetch(`${CONFIG.API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token()}` }
  });
  return res.json();
}

// ═══════════════════════════════════════════════════════
//  CUSTOM PLAYER CONTROLS
// ═══════════════════════════════════════════════════════
function initControls() {
  const player        = document.getElementById('videoPlayer');
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
  player.addEventListener('click',  () => player.paused ? player.play() : player.pause());
  player.addEventListener('play',   syncPlay);
  player.addEventListener('pause',  syncPlay);

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
    player.muted  = player.volume === 0;
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

  // Fullscreen
  const enterFs = el => el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.();
  const exitFs  = () => document.exitFullscreen?.() ?? document.webkitExitFullscreen?.();
  const getFs   = () => document.fullscreenElement ?? document.webkitFullscreenElement;

  fullscreenBtn.addEventListener('click', () => getFs() ? exitFs() : enterFs(playerWrap));
  const onFsChange = () => {
    const fs = !!getFs();
    fsEnterIcon.style.display = fs ? 'none' : '';
    fsExitIcon.style.display  = fs ? '' : 'none';
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  // Skip ±10s
  skipBackBtn.addEventListener('click', () => {
    player.currentTime = Math.max(0, player.currentTime - 10);
  });
  skipFwdBtn.addEventListener('click', () => {
    player.currentTime = Math.min(player.duration || 0, player.currentTime + 10);
  });

  // Seek preview
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

  seekBar.addEventListener('mouseenter', showSeekPreview);
  seekBar.addEventListener('mouseleave', hideSeekPreview);
  seekBar.addEventListener('mousemove', e => {
    const rect = seekBar.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updatePreview(e.clientX, pct * player.duration);
  });
  seekBar.addEventListener('touchstart', showSeekPreview, { passive: true });
  seekBar.addEventListener('touchend', () => setTimeout(hideSeekPreview, 400), { passive: true });
  seekBar.addEventListener('touchmove', e => {
    const touch = e.touches[0];
    const rect  = seekBar.getBoundingClientRect();
    const pct   = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    updatePreview(touch.clientX, pct * player.duration);
  }, { passive: true });
  previewVideo.addEventListener('seeked', () => { previewSeeking = false; });

  // Mobile double-tap ±10s
  function showTapIndicator(side) {
    const el = side === 'left' ? dblLeft : dblRight;
    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
  }

  let lastTapTime  = 0;
  let tapTimeoutId = null;

  playerWrap.addEventListener('touchend', e => {
    if (e.target.closest('.video-controls')) return;
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

  syncPlay();
  syncVol();

  // Sync playlist height with player
  const playlistCol = document.querySelector('.playlist-col');
  if (playlistCol) {
    new ResizeObserver(entries => {
      playlistCol.style.height = entries[0].contentRect.height + 'px';
    }).observe(playerWrap);
  }

  return player;
}

// ═══════════════════════════════════════════════════════
//  CLIP STATIC THUMBNAIL (one frozen frame per clip)
// ═══════════════════════════════════════════════════════
function loadClipThumbnail(key, thumbEl) {
  const url = `${CONFIG.API_URL}/courses/${courseId}/clips/${encodeURIComponent(key)}?token=${encodeURIComponent(token())}`;

  const vid = document.createElement('video');
  vid.muted    = true;
  vid.preload  = 'metadata';
  vid.setAttribute('playsinline', '');
  vid.setAttribute('disablepictureinpicture', '');

  vid.addEventListener('loadedmetadata', () => {
    vid.currentTime = Math.min(5, vid.duration * 0.05 || 0);
  }, { once: true });

  vid.addEventListener('seeked', () => {
    vid.pause();
    thumbEl.innerHTML = '';
    vid.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:6px;display:block;';
    thumbEl.appendChild(vid);
  }, { once: true });

  vid.addEventListener('error', () => { /* keep gradient on failure */ }, { once: true });

  vid.src = url;
}

// ═══════════════════════════════════════════════════════
//  PLAY CLIP
// ═══════════════════════════════════════════════════════
function playClip(key, name, liEl) {
  if (activeClipKey === key) return;
  activeClipKey = key;

  document.querySelectorAll('.clip-item').forEach(el => el.classList.remove('active'));
  liEl.classList.add('active');

  const player       = document.getElementById('videoPlayer');
  const previewVideo = document.getElementById('previewVideo');
  const placeholder  = document.getElementById('playerPlaceholder');

  const url = `${CONFIG.API_URL}/courses/${courseId}/clips/${encodeURIComponent(key)}?token=${encodeURIComponent(token())}`;

  placeholder.style.display = 'none';
  player.src       = url;
  previewVideo.src = url;
  previewVideo.load();

  player.play().catch(() => {
    player.muted = true;
    player.play().catch(() => {});
    document.addEventListener('click', () => { player.muted = false; }, { once: true });
  });

  document.getElementById('nowPlayingTitle').textContent = name;
  document.title = `${name} — Skintania`;
}

// ═══════════════════════════════════════════════════════
//  LOAD CLIPS
// ═══════════════════════════════════════════════════════
async function loadClips(cursor = null) {
  if (isLoading) return;
  isLoading = true;

  const clipList    = document.getElementById('clipList');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const emptyEl     = document.getElementById('clipEmpty');

  if (!cursor) clipList.innerHTML = '';

  const url  = `/courses/${courseId}/clips${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`;
  const data = await apiFetch(url);

  isLoading  = false;
  const clips = data.clips || data.files || [];
  nextCursor  = data.nextCursor || data.cursor || null;

  if (!data.success || clips.length === 0) {
    if (!cursor) emptyEl.hidden = false;
    return;
  }

  const offset = clipList.children.length;
  document.getElementById('playlistSub').textContent =
    `Skintania · ${offset + clips.length}${nextCursor ? '+' : ''} คลิป`;

  clips.forEach((clip, idx) => {
    const li  = document.createElement('li');
    li.className    = 'clip-item';
    const key  = clip.key ?? clip.id ?? String(offset + idx + 1);
    const name = key.split('/').pop().replace(/\.[^.]+$/, '');
    const num  = offset + idx + 1;
    li.dataset.key  = key;
    li.dataset.name = name;

    li.innerHTML = `
      <span class="clip-num">${num}</span>
      <div class="clip-thumb-mini" style="background:${gradientFor(num)}">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" opacity="0.75">
          <polygon points="5,3 19,12 5,21"></polygon>
        </svg>
      </div>
      <div class="clip-text">
        <span class="clip-name">${name}</span>
        <span class="clip-channel">Skintania</span>
      </div>
    `;

    li.addEventListener('click', () => playClip(key, name, li));
    clipList.appendChild(li);

    loadClipThumbnail(key, li.querySelector('.clip-thumb-mini'));
  });

  loadMoreBtn.hidden  = !nextCursor;
  loadMoreBtn.onclick = () => loadClips(nextCursor);

  // Auto-play the first clip on initial load
  if (!cursor) {
    const first = clipList.querySelector('.clip-item');
    if (first) first.click();
  }
}

// ═══════════════════════════════════════════════════════
//  LOAD FILES
// ═══════════════════════════════════════════════════════
async function loadFiles() {
  const data  = await apiFetch(`/courses/${courseId}/files`);
  const files = data.files || [];
  if (!data.success || !files.length) return;

  const list  = document.getElementById('fileList');
  const badge = document.getElementById('filesBadge');

  list.innerHTML = '';
  badge.textContent = files.length;
  badge.hidden = false;

  files.forEach(file => {
    const li  = document.createElement('li');
    li.className = 'file-item';
    const name = file.key.split('/').pop();
    const url  = `${CONFIG.API_URL}/courses/${courseId}/files/${encodeURIComponent(file.key)}?token=${encodeURIComponent(token())}`;
    li.innerHTML = `
      <span class="file-icon">${fileIcon(file.contentType)}</span>
      <span class="file-name">${name}</span>
      <span class="file-size">${formatSize(file.size || 0)}</span>
      <a class="btn file-dl-btn" href="${url}" download="${name}" target="_blank">ดาวน์โหลด</a>
    `;
    list.appendChild(li);
  });
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
async function init() {
  if (!courseId) { window.location.href = '/Course/'; return; }

  initControls();
  initTabs();

  const courseRes = await apiFetch(`/courses/${courseId}`);
  if (!courseRes.success) {
    document.getElementById('nowPlayingTitle').textContent = 'ไม่พบคอร์ส';
    return;
  }

  const course = courseRes.course;
  document.title = `${course.title} — Skintania`;

  const header = document.querySelector('site-header');
  if (header) {
    header.setAttribute('page-title', course.title);
    header.setAttribute('page-desc', course.description || 'คอร์สเรียน');
  }

  document.getElementById('playlistTitle').textContent = course.title;
  document.getElementById('playlistHeader').style.background =
    `linear-gradient(160deg, ${GRADIENTS[course.id % GRADIENTS.length][0]}cc 0%, #071029 100%)`;

  document.getElementById('courseNameSub').textContent = course.title;
  document.getElementById('courseDesc').textContent    = course.description || '';
  const created = new Date(course.createdAt).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('courseMeta').textContent = `สร้างเมื่อ ${created}`;

  await loadClips();
  loadFiles();
  loadOtherCourses(course.id);
}

// ═══════════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════════
function initTabs() {
  const btns   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ═══════════════════════════════════════════════════════
//  OTHER COURSES
// ═══════════════════════════════════════════════════════
async function loadOtherCourses(currentId) {
  const data = await apiFetch('/courses');
  if (!data.success) return;

  const others = data.courses.filter(c => c.id !== currentId);
  if (!others.length) {
    document.getElementById('otherCoursesCol').hidden = true;
    return;
  }

  const list = document.getElementById('otherCoursesList');
  others.forEach(course => {
    const initials = course.title.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
    const a = document.createElement('a');
    a.className = 'other-course-card';
    a.href      = `/Course/view/?id=${course.id}`;
    a.innerHTML = `
      <div class="other-course-thumb" style="background:${gradientFor(course.id)}">${initials}</div>
      <div class="other-course-info">
        <div class="other-course-title">${course.title}</div>
        <div class="other-course-sub">Skintania</div>
      </div>
    `;
    list.appendChild(a);
  });
}

document.addEventListener('DOMContentLoaded', init);
