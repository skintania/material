import { CONFIG } from '/config.js';

/**
 * --- 1. STATE MANAGEMENT ---
 * เก็บสถานะทั้งหมดของแอปไว้ที่นี่ที่เดียว
 */
const State = {
    subjectIcons: {},
    folderHistory: [],
    pathNames: ["Home"],
    currentItems: [],
    viewMode: 'grid', // 'grid' หรือ 'list'
    isSelectMode: false,
    selectedFiles: new Set(),
    pdfJS: null
};

/**
 * --- 2. API SERVICE ---
 * จัดการการสื่อสารกับ Cloudflare Worker ทั้งหมด
 */
const DriveAPI = {
    async fetchItems(path) {
        const token = localStorage.getItem("authToken");
        const url = new URL(`${CONFIG.API_URL}/skdrive`);

        // API uses 'prefix'; folders need a trailing slash
        if (path) {
            url.searchParams.append('prefix', path.endsWith('/') ? path : path + '/');
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            window.location.replace("/login/");
            return [];
        }
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();

        // Merge folders + files into a unified array matching the shape the UI expects
        const folders = (data.folders ?? []).map(f => ({
            name: f.name, key: f.key, type: 'folder'
        }));
        const files = (data.files ?? []).map(f => ({
            name: f.name, key: f.key, size: f.size, type: 'file',
            link: `${CONFIG.API_URL}/skdrive/${f.key.split('/').map(encodeURIComponent).join('/')}`
        }));

        return [...folders, ...files];
    },

    async getDeepFiles(apiPath, zipPrefix) {
        const items = await this.fetchItems(apiPath);
        let files = [];

        for (const item of items) {
            const itemPath = `${zipPrefix}/${item.name}`;
            if (item.type === 'file') {
                files.push({ link: item.link, zipPath: itemPath });
            } else {
                const subPath = apiPath ? `${apiPath}/${item.name}` : item.name;
                const subFiles = await this.getDeepFiles(subPath, itemPath);
                files.push(...subFiles);
            }
        }
        return files;
    }
};

/**
 * --- 3. UI & RENDERING ---
 * จัดการการแสดงผลบนหน้าจอ (DOM)
 */
const UI = {
    grid: document.getElementById('coursesGrid'),
    backBtn: document.getElementById('backBtn'),
    pathText: document.getElementById('currentPathText'),
    downloadBtn: document.getElementById('downloadBtn'),
    countSpan: document.getElementById('selectedCount'),

    render() {
        if (!this.grid) return;
        this.grid.innerHTML = '';
        this.updateBreadcrumbs();
        this.grid.className = State.viewMode === 'list' ? 'grid list-view' : 'grid';
        this.backBtn.disabled = State.folderHistory.length === 0;

        if (!State.currentItems || State.currentItems.length === 0) {
            this.grid.innerHTML = '<div style="text-align:center; padding:40px; color:gray;">Folder is empty</div>';
            return;
        }

        State.currentItems.forEach(item => this.createCard(item));

        // เรียกโหลด Preview หลังจาก Render เสร็จ
        if (State.currentItems.length > 0) {
            setTimeout(() => {
                Actions.loadLazyPreviews(); // สำหรับรูปภาพ
                Actions.loadPdfPreviews();  // สำหรับ PDF
            }, 100);
        }
    },

    createCard(item) {
        const isFile = item.type === 'file';
        const card = document.createElement('div'); // ใช้ div แทน a เพื่อควบคุมการคลิกได้สมบูรณ์
        card.className = `drive-card ${this.isSelected(item) ? 'selected' : ''}`;

        card.innerHTML = `
        ${this.getIconHtml(item)}
        <div class="card-footer">
            <input type="checkbox" class="item-checkbox" 
                ${State.isSelectMode ? 'style="display:block"' : 'style="display:none"'}
                ${this.isSelected(item) ? 'checked' : ''}>
            <div class="drive-name">${item.name}</div>
        </div>
    `;

        card.onclick = (e) => {
            if (State.isSelectMode) {
                e.preventDefault();
                this.toggleSelection(item, card);
            } else if (isFile) {
                // 🚀 เรียกฟังก์ชัน Preview แทนการเปิด Link ตรง
                Actions.previewFile(item.link, item.name);
            } else {
                this.navigateForward(item);
            }
        };

        this.grid.appendChild(card);
    },

    getIconHtml(item) {
        if (item.type === 'folder') {
            const isHome = State.folderHistory.length === 0;
            const icon = isHome ? (State.subjectIcons[item.name] || 'fa-folder') : 'fa-folder';
            return `<div class="drive-icon"><i class="fa-solid ${icon}"></i></div>`;
        }

        const ext = item.name.split('.').pop().toLowerCase();

        // ถ้าเป็น PDF ให้ใส่ class 'pdf-preview-container'
        if (ext === 'pdf') {
            return `<div class="drive-icon pdf-preview-container" data-file-url="${item.link}">
                    <i class="fa-solid fa-file-pdf" style="color:#e74c3c;"></i>
                </div>`;
        }

        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
            return `<div class="drive-icon img-preview-container" data-file-url="${item.link}">
                    <i class="fa-solid fa-file-image"></i>
                </div>`;
        }

        return `<div class="drive-icon"><i class="fa-solid fa-file-lines"></i></div>`;
    },

    updateBreadcrumbs() {
        if (!this.pathText) return;
        this.pathText.innerHTML = '';
        State.pathNames.forEach((name, i) => {
            const span = document.createElement('span');
            span.className = 'breadcrumb-link';
            span.textContent = name;
            span.onclick = () => this.navigateBackTo(i);
            this.pathText.appendChild(span);

            if (i < State.pathNames.length - 1) {
                const sep = document.createElement('span');
                sep.className = 'path-separator';
                sep.textContent = ' > ';
                this.pathText.appendChild(sep);
            }
        });
    },

    isSelected(item) {
        const currentPath = State.pathNames.slice(1).join('/');
        const id = currentPath ? `${currentPath}/${item.name}` : item.name;
        return [...State.selectedFiles].some(f => JSON.parse(f).fullPath === id);
    },

    toggleSelection(item, cardElement) {
        const currentPath = State.pathNames.slice(1).join('/');
        const itemID = currentPath ? `${currentPath}/${item.name}` : item.name;
        const checkbox = cardElement.querySelector('.item-checkbox');
        const itemData = JSON.stringify({ ...item, fullPath: itemID });

        if (!checkbox.checked) {
            State.selectedFiles.add(itemData);
            cardElement.classList.add('selected');
            checkbox.checked = true;
        } else {
            for (let s of State.selectedFiles) {
                if (JSON.parse(s).fullPath === itemID) State.selectedFiles.delete(s);
            }
            cardElement.classList.remove('selected');
            checkbox.checked = false;
        }
        this.updateDownloadUI();
    },

    updateDownloadUI() {
        if (!this.downloadBtn) return;
        const count = State.selectedFiles.size;
        this.countSpan.textContent = count;
        this.downloadBtn.style.display = count > 0 ? 'flex' : 'none';
    },

    navigateForward(item) {
        State.folderHistory.push([...State.currentItems]);
        State.pathNames.push(item.name);
        Actions.loadCurrentPath();
    },

    navigateBackTo(index) {
        const pops = State.pathNames.length - 1 - index;
        if (pops <= 0) return;
        for (let i = 0; i < pops; i++) {
            State.pathNames.pop();
            State.folderHistory.pop();
        }
        Actions.loadCurrentPath();
    }
};

/**
 * --- 4. ACTION CONTROLLERS ---
 * ตัวเชื่อมโยงระหว่าง API และ UI
 */
const Actions = {
    async loadCurrentPath() {
        try {
            const path = State.pathNames.slice(1).join('/');
            State.currentItems = await DriveAPI.fetchItems(path);
            UI.render();
        } catch (err) {
            console.error(err);
            UI.grid.innerHTML = `<p style="color:red; text-align:center;">Could not load folder: ${err.message}</p>`;
        }
    },

    async handleDownload() {
        if (typeof JSZip === 'undefined') {
            alert("JSZip library not found!");
            return;
        }
        const zip = new JSZip();
        UI.downloadBtn.disabled = true;
        const originalText = UI.downloadBtn.innerHTML;
        UI.downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparing...';

        try {
            let files = [];
            for (let json of State.selectedFiles) {
                const item = JSON.parse(json);
                if (item.type === 'folder') {
                    files.push(...(await DriveAPI.getDeepFiles(item.fullPath, item.name)));
                } else {
                    files.push({ link: item.link, zipPath: item.name });
                }
            }

            UI.downloadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Downloading ${files.length} files...`;

            const token = localStorage.getItem("authToken");
            await Promise.all(files.map(async f => {
                const res = await fetch(f.link, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const blob = await res.blob();
                zip.file(f.zipPath, blob);
            }));

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `Skintania_Archive_${Date.now()}.zip`;
            link.click();
        } catch (e) {
            alert("Download failed: " + e.message);
        } finally {
            UI.downloadBtn.disabled = false;
            UI.downloadBtn.innerHTML = originalText;
        }
    },
    async previewFile(fileUrl, fileName) {
        const modal = document.getElementById('filePreviewModal');
        const body = document.getElementById('previewModalBody');
        const nameEl = document.getElementById('previewFileName');
        const downloadBtn = document.getElementById('previewDownloadBtn');

        modal.style.display = 'flex';
        nameEl.textContent = fileName;
        body.innerHTML = '<div class="preview-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Loading...</span></div>';

        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch(fileUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                window.location.replace("/login/");
                return;
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fileName;
                a.click();
            };

            body.innerHTML = '';
            const ext = fileName.split('.').pop().toLowerCase();

            if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
                const img = document.createElement('img');
                img.src = blobUrl;
                img.className = 'preview-image';
                body.appendChild(img);
            } else if (ext === 'pdf') {
                const iframe = document.createElement('iframe');
                iframe.src = blobUrl;
                iframe.className = 'preview-iframe';
                body.appendChild(iframe);
            } else {
                body.innerHTML = `<div class="preview-unsupported">
                    <i class="fa-solid fa-file" style="font-size:3rem;margin-bottom:12px;display:block;"></i>
                    <div style="margin-top:8px;">${fileName}</div>
                    <div style="margin-top:8px;font-size:0.85rem;opacity:0.6;">Preview not available — use Download.</div>
                </div>`;
                downloadBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = fileName;
                    a.click();
                };
            }
        } catch (err) {
            console.error("Preview Error:", err);
            body.innerHTML = `<div class="preview-unsupported">
                <i class="fa-solid fa-circle-exclamation" style="color:#e74c3c;font-size:2rem;margin-bottom:8px;display:block;"></i>
                Could not load file: ${err.message}
            </div>`;
        }
    },

    closePreview() {
        const modal = document.getElementById('filePreviewModal');
        modal.style.display = 'none';
        document.getElementById('previewModalBody').innerHTML = '';
    },
    async loadLazyPreviews() {
        const containers = document.querySelectorAll('.img-preview-container:not(.loaded)');
        if (containers.length === 0) return;

        const token = localStorage.getItem("authToken");

        await Promise.all([...containers].map(async (container) => {
            const fileUrl = container.dataset.fileUrl;
            if (!fileUrl || !token) return;
            try {
                const response = await fetch(fileUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) return;

                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                const img = document.createElement('img');
                img.src = blobUrl;
                img.className = 'file-preview-img loaded-preview';
                img.loading = 'lazy';

                container.innerHTML = '';
                container.appendChild(img);
                container.classList.add('loaded');
            } catch (err) {
                console.warn(`Could not load preview for ${fileUrl}: ${err.message}`);
            }
        }));
    },
    async loadPdfPreviews() {
        const containers = document.querySelectorAll('.pdf-preview-container:not(.loaded)');
        if (containers.length === 0 || !State.pdfJS) return;

        const token = localStorage.getItem("authToken");

        containers.forEach(async (container) => {
            const fileUrl = container.dataset.fileUrl;
            try {
                const response = await fetch(fileUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.arrayBuffer();

                const pdf = await State.pdfJS.getDocument({ data }).promise;
                const page = await pdf.getPage(1);

                // 3. เตรียม Canvas สำหรับวาดรูป
                const viewport = page.getViewport({ scale: 0.3 }); // ปรับขนาดให้พอดี icon
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // 4. วาด PDF ลง Canvas
                await page.render({ canvasContext: context, viewport }).promise;

                // 5. แปลง Canvas เป็นรูปภาพแล้วแสดงผล
                const img = document.createElement('img');
                img.src = canvas.toDataURL();
                img.className = 'file-preview-img loaded-preview';

                container.innerHTML = '';
                container.appendChild(img);
                container.classList.add('loaded');
            } catch (err) {
                console.warn("PDF Preview failed for:", fileUrl);
            }
        });
    }

};

/**
 * --- 5. INITIALIZATION ---
 * เริ่มทำงานเมื่อโหลดหน้าเว็บเสร็จ
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Init PDF.js (CDN 3.x exposes window.pdfjsLib)
    if (window.pdfjsLib) {
        State.pdfJS = window.pdfjsLib;
        State.pdfJS.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // 2. โหลดไอคอนวิชา
    try {
        const iconRes = await fetch('icons.json');
        if (iconRes.ok) State.subjectIcons = await iconRes.json();
    } catch (e) { console.warn("Icons not loaded"); }

    // 3. Modal close handlers
    document.getElementById('previewCloseBtn').onclick = () => Actions.closePreview();
    document.getElementById('previewModalBackdrop').onclick = () => Actions.closePreview();
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') Actions.closePreview();
    });

    // 4. ผูกปุ่มต่างๆ กับฟังก์ชัน
    if (UI.backBtn) UI.backBtn.onclick = () => UI.navigateBackTo(State.pathNames.length - 2);
    if (UI.downloadBtn) UI.downloadBtn.onclick = () => Actions.handleDownload();

    const viewBtn = document.getElementById('viewToggleBtn');
    if (viewBtn) {
        viewBtn.onclick = () => {
            State.viewMode = State.viewMode === 'grid' ? 'list' : 'grid';
            viewBtn.innerHTML = State.viewMode === 'grid'
                ? '<i class="fa-solid fa-list"></i> <span>List View</span>'
                : '<i class="fa-solid fa-grip"></i> <span>Grid View</span>';
            UI.render();
        };
    }

    const selectBtn = document.getElementById('selectBtn');
    if (selectBtn) {
        selectBtn.onclick = () => {
            State.isSelectMode = !State.isSelectMode;
            selectBtn.innerHTML = State.isSelectMode
                ? '<i class="fa-solid fa-xmark"></i> <span>Cancel</span>'
                : '<i class="fa-solid fa-check-double"></i> <span>Select</span>';
            if (!State.isSelectMode) State.selectedFiles.clear();
            UI.render();
            UI.updateDownloadUI();
        };
    }

    // 3. เริ่มโหลดข้อมูลโฟลเดอร์แรก
    Actions.loadCurrentPath();
});