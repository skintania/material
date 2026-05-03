import { CONFIG } from '/config.js';

const GRADIENTS = [
  ['#1a3a6b', '#3b82f6'],
  ['#1a4a3a', '#10b981'],
  ['#3b1a6b', '#8b5cf6'],
  ['#6b3a1a', '#f59e0b'],
  ['#1a3a6b', '#06b6d4'],
  ['#6b1a3a', '#ec4899'],
  ['#2d4a1a', '#84cc16'],
  ['#1a2a6b', '#6366f1'],
];

let activeTag = 'all';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} เดือนที่แล้ว`;
  return `${Math.floor(months / 12)} ปีที่แล้ว`;
}

function gradientFor(id) {
  const [a, b] = GRADIENTS[id % GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

function renderCard(course) {
  const a = document.createElement('a');
  a.className = 'yt-card';
  a.href = `/Course/view/?id=${course.id}`;
  a.dataset.title = course.title.toLowerCase();
  a.dataset.tag = (course.description || '').trim().toLowerCase();

  const initials = course.title.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();

  a.innerHTML = `
    <div class="yt-thumb" style="background:${gradientFor(course.id)}">
      <span class="yt-thumb-initials">${initials}</span>
      <div class="yt-play-overlay">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
          fill="white" opacity="0.9">
          <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.5)"/>
          <polygon points="10,8 18,12 10,16" fill="white"/>
        </svg>
      </div>
    </div>
    <div class="yt-info">
      <div class="yt-avatar" style="background:${gradientFor(course.id + 3)}">${(course.title[0] || 'S').toUpperCase()}</div>
      <div class="yt-meta">
        <h3 class="yt-title">${course.title}</h3>
        <p class="yt-channel">Skintania</p>
        <p class="yt-date">${course.description ? course.description + ' · ' : ''}${timeAgo(course.createdAt)}</p>
      </div>
    </div>
  `;
  return a;
}

function filterCards() {
  const grid = document.getElementById('coursesGrid');
  const countEl = document.getElementById('courseCount');
  const emptyEl = document.getElementById('emptyState');
  const q = document.getElementById('courseSearch').value.toLowerCase().trim();

  let visible = 0;
  grid.querySelectorAll('.yt-card').forEach(card => {
    const matchSearch = !q || card.dataset.title.includes(q);
    const matchTag = activeTag === 'all' || card.dataset.tag === activeTag;
    const show = matchSearch && matchTag;
    card.hidden = !show;
    if (show) visible++;
  });
  countEl.textContent = `${visible} คอร์ส`;
  emptyEl.hidden = visible > 0;
}

function buildTags(courses) {
  const tagList = document.getElementById('tagList');

  const tagCounts = new Map();
  courses.forEach(c => {
    const tag = (c.description || '').trim();
    if (tag) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  });

  tagCounts.forEach((count, tag) => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.dataset.tag = tag.toLowerCase();
    btn.textContent = tag;
    tagList.appendChild(btn);
  });

  tagList.addEventListener('click', e => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;
    activeTag = btn.dataset.tag;
    tagList.querySelectorAll('.tag-btn').forEach(b => b.classList.toggle('active', b === btn));
    filterCards();
  });
}

async function loadCourses() {
  const token = localStorage.getItem('authToken');
  const grid = document.getElementById('coursesGrid');
  const emptyEl = document.getElementById('emptyState');

  try {
    const res = await fetch(`${CONFIG.API_URL}/courses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Failed to load');

    const courses = data.courses;
    grid.innerHTML = '';

    if (courses.length === 0) {
      emptyEl.hidden = false;
      return;
    }

    courses.forEach(c => grid.appendChild(renderCard(c)));
    buildTags(courses);
    filterCards();

    document.getElementById('courseSearch').addEventListener('input', filterCards);

  } catch (err) {
    console.error('Error loading courses:', err);
    grid.innerHTML = '<p class="load-error">ไม่สามารถโหลดคอร์สได้ กรุณาลองใหม่</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadCourses);
