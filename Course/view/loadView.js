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
let currentUser   = null;

function gradientFor(n) {
  const [a, b] = GRADIENTS[n % GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

function formatSize(bytes) {
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fileIcon(t = '') {
  const s = t.toLowerCase();
  if (s.includes('pdf')  || s.endsWith('.pdf'))           return '📕';
  if (s.includes('zip')  || s.endsWith('.zip'))           return '🗜️';
  if (s.includes('presentation') || /\.pptx?$/.test(s))  return '📊';
  if (s.includes('spreadsheet')  || /\.xlsx?$/.test(s))  return '📗';
  if (s.includes('word')         || /\.docx?$/.test(s))  return '📘';
  if (s.startsWith('image/')     || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(s)) return '🖼️';
  return '📄';
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'เมื่อกี้';
  if (m < 60)  return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d} วันที่แล้ว`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} เดือนที่แล้ว`;
  return `${Math.floor(mo / 12)} ปีที่แล้ว`;
}

async function apiFetch(path, method = 'GET', body = null) {
  const opts = { method, headers: { Authorization: `Bearer ${token()}` } };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${CONFIG.API_URL}${path}`, opts);
  if (res.status === 204) return { success: true };
  return res.json();
}

async function loadCurrentUser() {
  try {
    const data = await apiFetch('/auth/me');
    if (data.success) {
      currentUser = data.user;
      const initials = ((currentUser.firstname?.[0] || '') + (currentUser.lastname?.[0] || '')).toUpperCase()
                    || currentUser.username?.[0]?.toUpperCase() || '?';
      const el = document.getElementById('myAvatar');
      if (el) el.textContent = initials;
    }
  } catch {}
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

  playBtn.addEventListener('click', () => player.paused ? player.play() : player.pause());
  player.addEventListener('click',  () => player.paused ? player.play() : player.pause());
  player.addEventListener('play',   syncPlay);
  player.addEventListener('pause',  syncPlay);

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

  skipBackBtn.addEventListener('click', () => {
    player.currentTime = Math.max(0, player.currentTime - 10);
  });
  skipFwdBtn.addEventListener('click', () => {
    player.currentTime = Math.min(player.duration || 0, player.currentTime + 10);
  });

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
  return player;
}

// ═══════════════════════════════════════════════════════
//  CLIP THUMBNAIL
// ═══════════════════════════════════════════════════════
function loadClipThumbnail(key, thumbEl) {
  const url = `${CONFIG.API_URL}/courses/${courseId}/clips/${encodeURIComponent(key)}?token=${encodeURIComponent(token())}`;
  const vid = document.createElement('video');
  vid.muted   = true;
  vid.preload = 'metadata';
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

  vid.addEventListener('error', () => {}, { once: true });
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
  player.crossOrigin       = 'anonymous';
  player.src               = url;
  previewVideo.crossOrigin = 'anonymous';
  previewVideo.src         = url;
  previewVideo.load();

  player.play().catch(() => {
    player.muted = true;
    player.play().catch(() => {});
    document.addEventListener('click', () => { player.muted = false; }, { once: true });
  });

  document.getElementById('nowPlayingTitle').textContent = name;
  document.title = `${name} — Skintania`;

  loadComments(key);
  loadSlides(key);
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
    const li   = document.createElement('li');
    li.className = 'clip-item';
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

  if (!cursor) {
    const first = clipList.querySelector('.clip-item');
    if (first) first.click();
  }
}

// ═══════════════════════════════════════════════════════
//  COMMENTS
// ═══════════════════════════════════════════════════════
function buildCommentEl(c, isReply = false, parentId = null) {
  const isOwn = currentUser && currentUser.id === c.user_id;
  const initials = ((c.firstname?.[0] || '') + (c.lastname?.[0] || '')).toUpperCase()
                || c.username?.[0]?.toUpperCase() || '?';

  const el = document.createElement('div');
  el.className = isReply ? 'comment-item reply-item' : 'comment-item';
  el.dataset.id = c.id;

  const effectiveParentId = isReply ? parentId : c.id;
  const replyFormId = `reply-form-${c.id}`;

  el.innerHTML = `
    <div class="comment-avatar-sm">${initials}</div>
    <div class="comment-body">
      <div class="comment-header-row">
        <span class="comment-username">${c.username || 'Unknown'}</span>
        <span class="comment-time">${timeAgo(c.created_at)}</span>
        ${isOwn ? `
          <button class="comment-action-btn edit-btn" data-id="${c.id}">แก้ไข</button>
          <button class="comment-action-btn delete-btn" data-id="${c.id}">ลบ</button>
        ` : ''}
      </div>
      <p class="comment-content" id="comment-content-${c.id}">${c.content}</p>
      <div class="comment-edit-form" id="edit-form-${c.id}" hidden>
        <textarea class="comment-textarea edit-textarea" data-id="${c.id}">${c.content}</textarea>
        <div class="comment-edit-actions">
          <button class="comment-cancel-btn cancel-edit-btn" data-id="${c.id}">ยกเลิก</button>
          <button class="btn comment-submit-btn save-edit-btn" data-id="${c.id}">บันทึก</button>
        </div>
      </div>
      <button class="reply-btn${isReply ? ' reply-btn-sm' : ''}" data-parent="${effectiveParentId}" data-form="${replyFormId}">↩ ตอบกลับ</button>
      <div class="reply-form-wrap" id="${replyFormId}" hidden>
        <textarea class="comment-textarea reply-textarea" placeholder="ตอบกลับ..."></textarea>
        <div class="comment-edit-actions">
          <button class="comment-cancel-btn cancel-reply-btn" data-form="${replyFormId}">ยกเลิก</button>
          <button class="btn comment-submit-btn post-reply-btn" data-parent="${effectiveParentId}" data-form="${replyFormId}">ตอบ</button>
        </div>
      </div>
    </div>
  `;

  if (!isReply && c.replies?.length) {
    const repliesWrap = document.createElement('div');
    repliesWrap.className = 'replies-list';
    c.replies.forEach(r => repliesWrap.appendChild(buildCommentEl(r, true, c.id)));
    el.querySelector('.comment-body').appendChild(repliesWrap);
  }

  return el;
}

function wireCommentActions(container, clipKey) {
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('ลบความคิดเห็นนี้?')) return;
      await apiFetch(`/courses/${courseId}/comments/${btn.dataset.id}`, 'DELETE');
      loadComments(clipKey);
    });
  });

  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(`edit-form-${btn.dataset.id}`).hidden = false;
      document.getElementById(`comment-content-${btn.dataset.id}`).hidden = true;
      btn.hidden = true;
      const delBtn = container.querySelector(`.delete-btn[data-id="${btn.dataset.id}"]`);
      if (delBtn) delBtn.hidden = true;
    });
  });

  container.querySelectorAll('.cancel-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(`edit-form-${btn.dataset.id}`).hidden = true;
      document.getElementById(`comment-content-${btn.dataset.id}`).hidden = false;
      const editBtn = container.querySelector(`.edit-btn[data-id="${btn.dataset.id}"]`);
      const delBtn  = container.querySelector(`.delete-btn[data-id="${btn.dataset.id}"]`);
      if (editBtn) editBtn.hidden = false;
      if (delBtn)  delBtn.hidden  = false;
    });
  });

  container.querySelectorAll('.save-edit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ta = container.querySelector(`.edit-textarea[data-id="${btn.dataset.id}"]`);
      const content = ta.value.trim();
      if (!content) return;
      btn.disabled = true;
      await apiFetch(`/courses/${courseId}/comments/${btn.dataset.id}`, 'PATCH', { content });
      loadComments(clipKey);
    });
  });

  container.querySelectorAll('.reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.form).hidden = false;
    });
  });

  container.querySelectorAll('.cancel-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.form).hidden = true;
    });
  });

  container.querySelectorAll('.post-reply-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const form = document.getElementById(btn.dataset.form);
      const ta   = form.querySelector('.reply-textarea');
      const content = ta.value.trim();
      if (!content) return;
      btn.disabled = true;
      await apiFetch(`/courses/${courseId}/comments/${btn.dataset.parent}/reply`, 'POST', { content });
      loadComments(clipKey);
    });
  });
}

async function loadComments(clipKey) {
  const list = document.getElementById('commentList');
  if (!list) return;
  list.innerHTML = '<div class="comment-loading">กำลังโหลด...</div>';

  try {
    const data = await apiFetch(`/courses/${courseId}/comments?clip_key=${encodeURIComponent(clipKey)}`);
    list.innerHTML = '';

    if (!data.success || !data.comments?.length) {
      list.innerHTML = '<p class="comment-empty">ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความเห็น!</p>';
      return;
    }

    data.comments.forEach(c => list.appendChild(buildCommentEl(c)));
    wireCommentActions(list, clipKey);
  } catch {
    list.innerHTML = '<p class="comment-empty">ไม่สามารถโหลดความคิดเห็นได้</p>';
  }
}

function initCommentForm() {
  const input   = document.getElementById('commentInput');
  const submit  = document.getElementById('commentSubmit');
  const actions = document.getElementById('commentActions');
  const cancel  = document.getElementById('commentCancel');
  if (!input) return;

  input.addEventListener('focus', () => { actions.hidden = false; });
  cancel.addEventListener('click', () => {
    input.value = '';
    actions.hidden = true;
    input.blur();
  });
  submit.addEventListener('click', async () => {
    const content = input.value.trim();
    if (!content || !activeClipKey) return;
    submit.disabled = true;
    try {
      await apiFetch(`/courses/${courseId}/comments`, 'POST', { clip_key: activeClipKey, content });
      input.value = '';
      actions.hidden = true;
      loadComments(activeClipKey);
    } finally {
      submit.disabled = false;
    }
  });
}

// ═══════════════════════════════════════════════════════
//  SLIDES
// ═══════════════════════════════════════════════════════
async function loadSlides(clipKey) {
  const list  = document.getElementById('slideList');
  const badge = document.getElementById('filesBadge');
  if (!list) return;

  list.innerHTML = '<p class="slide-loading">กำลังโหลด...</p>';
  if (badge) badge.hidden = true;

  try {
    const data = await apiFetch(`/courses/${courseId}/slides?clip_key=${encodeURIComponent(clipKey)}`);
    list.innerHTML = '';

    if (!data.success || !data.slides?.length) {
      list.innerHTML = '<div class="tab-coming-soon"><p>ยังไม่มีเอกสารสำหรับคลิปนี้</p></div>';
      return;
    }

    if (badge) { badge.textContent = data.slides.length; badge.hidden = false; }

    for (const slide of data.slides) {
      if (slide.type === 'file') {
        const url  = `${CONFIG.API_URL}/skdrive/${encodeURIComponent(slide.skdrive_path)}?token=${encodeURIComponent(token())}`;
        const name = slide.skdrive_path.split('/').pop();
        const item = document.createElement('div');
        item.className = 'slide-item';
        item.innerHTML = `
          <span class="slide-icon">${fileIcon(slide.skdrive_path)}</span>
          <span class="slide-label">${slide.label}</span>
          <a class="btn file-dl-btn" href="${url}" download="${name}" target="_blank">ดาวน์โหลด</a>
        `;
        list.appendChild(item);
      } else if (slide.type === 'folder') {
        const folderId = `folder-${slide.id}`;
        const folderEl = document.createElement('div');
        folderEl.innerHTML = `
          <p class="slide-folder-label">📁 ${slide.label}</p>
          <div class="slide-folder-files" id="${folderId}">
            <p class="slide-loading">กำลังโหลด...</p>
          </div>
        `;
        list.appendChild(folderEl);

        const skData  = await apiFetch(`/skdrive?prefix=${encodeURIComponent(slide.skdrive_path)}`);
        const filesEl = document.getElementById(folderId);
        filesEl.innerHTML = '';

        if (skData.files?.length) {
          skData.files.forEach(f => {
            const url  = `${CONFIG.API_URL}/skdrive/${encodeURIComponent(f.key)}?token=${encodeURIComponent(token())}`;
            const item = document.createElement('div');
            item.className = 'slide-item nested';
            item.innerHTML = `
              <span class="slide-icon">${fileIcon(f.contentType || f.key)}</span>
              <span class="slide-label">${f.name}</span>
              <span class="file-size">${formatSize(f.size || 0)}</span>
              <a class="btn file-dl-btn" href="${url}" download="${f.name}" target="_blank">ดาวน์โหลด</a>
            `;
            filesEl.appendChild(item);
          });
        } else {
          filesEl.innerHTML = '<p class="comment-empty">โฟลเดอร์ว่าง</p>';
        }
      }
    }
  } catch {
    list.innerHTML = '<p class="comment-empty">ไม่สามารถโหลดเอกสารได้</p>';
  }
}

// ═══════════════════════════════════════════════════════
//  ASK AI
// ═══════════════════════════════════════════════════════
function initAskAI() {
  const captureBtn = document.getElementById('captureFrameBtn');
  const canvas     = document.getElementById('aiCanvas');
  const askBtn     = document.getElementById('askAiBtn');
  const questionEl = document.getElementById('aiQuestion');
  const answerBox  = document.getElementById('aiAnswer');
  const usageEl    = document.getElementById('aiUsage');
  if (!captureBtn) return;

  captureBtn.addEventListener('click', () => {
    const player = document.getElementById('videoPlayer');
    if (!player.src || player.readyState === 0) {
      alert('กรุณาเลือกคลิปก่อน');
      return;
    }
    const ctx = canvas.getContext('2d');
    canvas.width  = player.videoWidth  || 640;
    canvas.height = player.videoHeight || 360;
    ctx.drawImage(player, 0, 0, canvas.width, canvas.height);
    canvas.hidden = false;
    captureBtn.textContent = '🔄 จับภาพใหม่';
  });

  askBtn.addEventListener('click', async () => {
    if (canvas.hidden) { alert('กรุณาจับภาพจากวิดีโอก่อน'); return; }
    const image    = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    const question = questionEl.value.trim() || undefined;

    askBtn.disabled    = true;
    askBtn.textContent = 'กำลังถาม...';
    answerBox.hidden   = true;

    try {
      const data = await apiFetch(`/courses/${courseId}/ask-ai`, 'POST', { image, question });
      answerBox.textContent = data.success ? data.answer : (data.error || 'เกิดข้อผิดพลาด');
      answerBox.hidden = false;
      if (data.usage) usageEl.textContent = `ใช้ไปแล้ว ${data.usage.used}/${data.usage.limit} ครั้งวันนี้`;
    } catch {
      answerBox.textContent = 'ไม่สามารถเชื่อมต่อได้';
      answerBox.hidden = false;
    } finally {
      askBtn.disabled    = false;
      askBtn.textContent = 'ถามเลย';
    }
  });
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

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
async function init() {
  if (!courseId) { window.location.href = '/Course/'; return; }

  initControls();
  initTabs();
  initCommentForm();
  initAskAI();

  await loadCurrentUser();

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
  loadOtherCourses(course.id);
}

document.addEventListener('DOMContentLoaded', init);
