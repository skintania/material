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
    pdfJS: window['pdfjs-dist/build/pdf']
};

/**
 * --- 2. API SERVICE ---
 * จัดการการสื่อสารกับ Cloudflare Worker ทั้งหมด
 */
const DriveAPI = {
    async fetchItems(path) {
        // ดึง Token จาก localStorage (ชื่อ Key ต้องตรงกับตอน Login)
        const token = localStorage.getItem("authToken");

        const url = new URL(`${CONFIG.API_URL}/skdrive`);
        if (path) url.searchParams.append('path', path);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // 🔑 ส่งกุญแจยืนยันตัวตน
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            console.error("🚫 Token ไม่ถูกต้องหรือหมดอายุ");
            window.location.replace("/login/");
            return [];
        }

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        return await response.json();
    },

    async getDeepFiles(apiPath, zipPrefix) {
        const items = await this.fetchItems(apiPath);
        let files = [];

        for (const item of items) {
            const itemPath = `${zipPrefix}/${item.name}`;
            if (item.type === 'file') {
                files.push({ link: item.link, zipPath: itemPath });
            } else {
                const subFiles = await this.getDeepFiles(`${apiPath}/${item.name}`, itemPath);
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

            await Promise.all(files.map(async f => {
                const res = await fetch(f.link);
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
        try {
            const token = localStorage.getItem("authToken");

            // 1. ดึงข้อมูลไฟล์แบบแนบ Token
            const response = await fetch(fileUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                alert("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
                window.location.replace("/login/");
                return;
            }

            if (!response.ok) throw new Error("ไม่สามารถเปิดไฟล์ได้");

            // 2. แปลงเป็น Blob
            const blob = await response.blob();

            // 3. สร้าง URL ชั่วคราว (Blob URL)
            const blobUrl = window.URL.createObjectURL(blob);

            // 4. เปิด Preview ในแท็บใหม่
            // เบราว์เซอร์จะเปิด PDF หรือรูปภาพให้เหมือนเดิม เพราะมันเห็นเป็นไฟล์ดิบแล้ว
            const newTab = window.open(blobUrl, '_blank');

            if (!newTab) {
                alert("โปรดอนุญาตให้เปิด Pop-up เพื่อดูไฟล์");
            }

            // หมายเหตุ: ไม่ต้องสั่ง revokeObjectURL ทันที 
            // เพราะถ้าสั่งปิด URL ทันที แท็บที่เปิดใหม่อาจจะโหลดไฟล์ไม่ขึ้น
        } catch (err) {
            console.error("Preview Error:", err);
            alert("เกิดข้อผิดพลาด: " + err.message);
        }
    },
    async loadLazyPreviews() {
        const containers = document.querySelectorAll('.img-preview-container:not(.loaded)');
        if (containers.length === 0) return;

        console.log(`🖼️ Loading ${containers.length} image previews...`);

        const token = localStorage.getItem("authToken");

        await Promise.all([...containers].map(async (container) => {
            const fileUrl = container.dataset.fileUrl;
            if (!fileUrl || !token) return;

            try {
                // 🔄 2. Fetch ข้อมูลรูปภาพพร้อมแนบ Token
                const response = await fetch(fileUrl, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error("เข้าถึงไฟล์ไม่ได้");

                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                // 🔄 3. แทนที่ Icon ด้วยแท็ก <img> พร้อม Blob URL ใหม่
                const img = document.createElement('img');
                img.src = blobUrl;
                img.className = 'file-preview-img loaded-preview';
                img.loading = 'lazy';

                // ล้างข้อมูลเดิม (Icon) แล้วใส่รูปภาพแทน
                container.innerHTML = '';
                container.appendChild(img);
                container.classList.add('loaded'); // ทำเครื่องหมายว่าโหลดแล้ว

            } catch (err) {
                console.warn(`Could not load preview for ${fileUrl}: ${err.message}`);
                // ถ้าโหลดไม่ขึ้น ก็ให้โชว์ Icon Placeholder เดิมต่อไป
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
                // 1. Fetch PDF พร้อม Token
                const response = await fetch(fileUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.arrayBuffer();

                // 2. ใช้ PDF.js โหลดเอกสาร
                const pdf = await State.pdfJS.getDocument({ data }).promise;
                const page = await pdf.getPage(1); // ดึงหน้า 1

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
    // 1. โหลดไอคอนวิชา
    try {
        const iconRes = await fetch('icons.json');
        if (iconRes.ok) State.subjectIcons = await iconRes.json();
    } catch (e) { console.warn("Icons not loaded"); }

    // 2. ผูกปุ่มต่างๆ กับฟังก์ชัน
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