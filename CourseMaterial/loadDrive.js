document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Elements ---
    const gridContainer = document.getElementById('coursesGrid');
    const backBtn = document.getElementById('backBtn');
    const currentPathText = document.getElementById('currentPathText');
    const viewToggleBtn = document.getElementById('viewToggleBtn');
    const selectBtn = document.getElementById('selectBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const selectedCountSpan = document.getElementById('selectedCount');

    // --- 2. State Variables ---
    let subjectIcons = {};
    let folderHistory = [];
    let pathNames = ["Home"];
    let currentItemsData = [];
    let viewMode = 'grid';
    let isSelectMode = false;
    let selectedFiles = new Set();

    // --- 3. PDF.js Setup ---
    const pdfJS = window['pdfjs-dist/build/pdf'];
    if (pdfJS) {
        pdfJS.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const pdfObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const container = entry.target;
                const link = container.dataset.link;
                if (link) {
                    generatePdfPreview(link, container);
                    observer.unobserve(container);
                }
            }
        });
    }, { rootMargin: '150px', threshold: 0.1 });

    // --- 4. Core Logic Functions ---

    async function init() {
        try {
            const iconResponse = await fetch('icons.json');
            if (iconResponse.ok) subjectIcons = await iconResponse.json();
            await loadDirectory('');
        } catch (error) {
            showError(`Initialization failed: ${error.message}`);
        }
    }

    async function loadDirectory(targetPath) {
        gridContainer.innerHTML = '<div style="text-align:center; padding: 20px;">Loading...</div>';
        try {
            const url = targetPath
                ? `https://skintania-api.skintania143.workers.dev/skdrive?path=${encodeURIComponent(targetPath)}`
                : `https://skintania-api.skintania143.workers.dev/skdrive`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('API failed to return data');

            const items = await response.json();
            currentItemsData = items;
            renderGrid(items);
        } catch (error) {
            showError(`Could not load folder: ${error.message}`);
        }
    }

    async function getAllFilesFromFolder(apiPath, zipPrefix) {
        let files = [];
        try {
            const url = `https://skintania-api.skintania143.workers.dev/skdrive?path=${encodeURIComponent(apiPath)}`;
            const response = await fetch(url);
            const items = await response.json();

            for (const item of items) {
                if (item.type === 'file') {
                    // We attach the prefix (e.g., "Folder A/") to the filename
                    files.push({
                        link: item.link,
                        zipPath: `${zipPrefix}/${item.name}`
                    });
                } else if (item.type === 'folder') {
                    // Dig deeper, adding this folder name to the prefix
                    const subFiles = await getAllFilesFromFolder(
                        `${apiPath}/${item.name}`,
                        `${zipPrefix}/${item.name}`
                    );
                    files.push(...subFiles);
                }
            }
        } catch (e) {
            console.error("Deep fetch error:", e);
        }
        return files;
    }

    function updateDownloadBtn() {
        if (!downloadBtn || !selectedCountSpan) return;
        const count = selectedFiles.size;
        selectedCountSpan.textContent = count;
        downloadBtn.style.display = count > 0 ? 'flex' : 'none';
    }

    function renderGrid(items) {
        gridContainer.innerHTML = '';
        pdfObserver.disconnect();

        // Breadcrumbs
        currentPathText.innerHTML = '';
        pathNames.forEach((name, index) => {
            const isLast = index === pathNames.length - 1;
            const span = document.createElement('span');
            span.className = 'breadcrumb-link';
            span.textContent = name;
            if (!isLast) {
                span.onclick = () => {
                    const levelsToPop = pathNames.length - 1 - index;
                    for (let i = 0; i < levelsToPop; i++) {
                        pathNames.pop();
                        folderHistory.pop();
                    }
                    loadDirectory(pathNames.slice(1).join('/'));
                };
                currentPathText.appendChild(span);
                const sep = document.createElement('span');
                sep.className = 'path-separator';
                sep.textContent = ' > ';
                currentPathText.appendChild(sep);
            } else {
                span.style.color = '#e6eef8';
                currentPathText.appendChild(span);
            }
        });

        backBtn.disabled = (folderHistory.length === 0);
        gridContainer.className = viewMode === 'list' ? 'grid list-view' : 'grid';

        if (!items || items.length === 0) {
            gridContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: gray;">Folder is empty</div>';
            return;
        }

        items.forEach(item => {
            const isFile = item.type === 'file';
            const card = document.createElement(isFile ? 'a' : 'div');
            card.className = 'drive-card';
            if (selectedFiles.has(item.link)) card.classList.add('selected');

            const footer = document.createElement('div');
            footer.className = 'card-footer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'item-checkbox';
            checkbox.checked = selectedFiles.has(item.link);
            checkbox.style.display = isSelectMode ? 'block' : 'none';

            checkbox.onclick = (e) => {
                e.stopPropagation();
                // Create a unique ID for this specific item in this specific folder
                const currentDir = pathNames.slice(1).join('/');
                const itemID = currentDir ? `${currentDir}/${item.name}` : item.name;

                if (checkbox.checked) {
                    // Store the whole object as a JSON string so we don't lose data
                    selectedFiles.add(JSON.stringify({
                        name: item.name,
                        link: item.link,
                        type: item.type,
                        fullPath: itemID
                    }));
                    card.classList.add('selected');
                } else {
                    // Find and remove the matching item
                    for (let selected of selectedFiles) {
                        const parsed = JSON.parse(selected);
                        if (parsed.fullPath === itemID) {
                            selectedFiles.delete(selected);
                            break;
                        }
                    }
                    card.classList.remove('selected');
                }
                updateDownloadBtn();
            };

            const nameLabel = document.createElement('div');
            nameLabel.className = 'drive-name';
            nameLabel.textContent = item.name;

            footer.appendChild(checkbox);
            footer.appendChild(nameLabel);

            card.innerHTML = getIconHtml(item);
            card.appendChild(footer);

            if (isFile && !isSelectMode) {
                card.href = item.link;
                card.target = '_blank';
            }

            gridContainer.appendChild(card);

            if (viewMode === 'grid' && isFile && item.name.toLowerCase().endsWith('.pdf')) {
                const container = card.querySelector('.pdf-container');
                if (container) {
                    container.dataset.link = item.link;
                    pdfObserver.observe(container);
                }
            }

            card.addEventListener('click', (e) => {
                if (isSelectMode) {
                    e.preventDefault();
                    checkbox.click();
                    return;
                }
                if (!isFile) {
                    folderHistory.push(items);
                    pathNames.push(item.name);
                    loadDirectory(pathNames.slice(1).join('/'));
                }
            });
        });
    }

    function getIconHtml(item) {
        if (item.type === 'folder') {
            const isHome = folderHistory.length === 0;
            const iconClass = isHome ? (subjectIcons[item.name] || 'fa-solid fa-folder') : 'fa-solid fa-folder';
            return `<div class="drive-icon"><i class="${iconClass}"></i></div>`;
        }

        const ext = item.name.split('.').pop().toLowerCase();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

        if (imageExtensions.includes(ext)) {
            return `<div class="drive-icon"><img src="${item.link}" alt="${item.name}" class="file-preview-img" loading="lazy"/></div>`;
        } else if (ext === 'pdf' && viewMode !== 'list') {
            return `<div class="drive-icon pdf-container">
                        <div class="loader"></div>
                        <canvas class="pdf-preview-canvas"></canvas>
                        <i class="fa-solid fa-file-pdf fallback-icon" style="display:none; color:#e74c3c;"></i>
                    </div>`;
        } else {
            const iconColor = ext === 'pdf' ? '#e74c3c' : 'inherit';
            return `<div class="drive-icon"><i class="fa-solid ${ext === 'pdf' ? 'fa-file-pdf' : 'fa-file-lines'}" style="color:${iconColor}"></i></div>`;
        }
    }

    async function generatePdfPreview(url, container) {
        const canvas = container.querySelector('.pdf-preview-canvas');
        const loader = container.querySelector('.loader');
        const fallbackIcon = container.querySelector('.fallback-icon');
        if (!canvas) return;
        try {
            const loadingTask = pdfJS.getDocument(url);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.4 });
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            if (loader) loader.style.display = 'none';
            canvas.style.display = 'block';
        } catch (e) {
            if (loader) loader.style.display = 'none';
            if (fallbackIcon) fallbackIcon.style.display = 'block';
        }
    }

    // --- 5. Event Listeners ---

    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', () => {
            viewMode = viewMode === 'grid' ? 'list' : 'grid';
            // ADD <span> HERE:
            viewToggleBtn.innerHTML = viewMode === 'grid' 
                ? '<i class="fa-solid fa-list"></i> <span>List View</span>' 
                : '<i class="fa-solid fa-grip"></i> <span>Grid View</span>';
            renderGrid(currentItemsData);
        });
    }

    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            isSelectMode = !isSelectMode;
            gridContainer.classList.toggle('selecting', isSelectMode);
            // ADD <span> HERE:
            selectBtn.innerHTML = isSelectMode 
                ? '<i class="fa-solid fa-xmark"></i> <span>Cancel</span>' 
                : '<i class="fa-solid fa-check-double"></i> <span>Select</span>';
            
            if (!isSelectMode) {
                selectedFiles.clear();
                updateDownloadBtn();
            }
            renderGrid(currentItemsData);
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            if (selectedFiles.size === 0) return;

            const MAX_SIZE_MB = 100; // Set your limit here (e.g., 100MB)
            const zip = new JSZip();
            const originalHTML = downloadBtn.innerHTML;
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calculating size...';

            try {
                let allFilesToDownload = [];
                let totalSizeBytes = 0;

                // 1. Map all files and folders
                for (let jsonString of selectedFiles) {
                    const item = JSON.parse(jsonString);
                    if (item.type === 'folder') {
                        const folderContents = await getAllFilesFromFolder(item.fullPath, item.name);
                        allFilesToDownload.push(...folderContents);
                    } else {
                        allFilesToDownload.push({ link: item.link, zipPath: item.name });
                    }
                }

                // 2. Check sizes using HEAD requests
                downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking limits...';
                
                const sizePromises = allFilesToDownload.map(async (file) => {
                    try {
                        const res = await fetch(file.link, { method: 'HEAD' });
                        const size = res.headers.get('content-length');
                        if (size) totalSizeBytes += parseInt(size, 10);
                    } catch (e) {
                        console.warn("Could not determine size for:", file.zipPath);
                    }
                });

                await Promise.all(sizePromises);

                // 3. Abort if too large
                const totalMB = totalSizeBytes / (1024 * 1024);
                if (totalMB > MAX_SIZE_MB) {
                    alert(`Download Aborted: The total size (${totalMB.toFixed(1)}MB) exceeds the ${MAX_SIZE_MB}MB limit. Please download a smaller group of files.`);
                    return; // Stop here
                }

                // 4. Proceed with Download
                downloadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Fetching ${allFilesToDownload.length} files...`;

                await Promise.all(allFilesToDownload.map(async (file) => {
                    const res = await fetch(file.link);
                    const blob = await res.blob();
                    zip.file(file.zipPath, blob);
                }));

                const content = await zip.generateAsync({ type: "blob" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(content);
                link.download = `Skintania_Archive_${Date.now()}.zip`;
                link.click();

            } catch (err) {
                alert("Download failed: " + err.message);
            } finally {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalHTML;
            }
        });
    }

    backBtn.addEventListener('click', () => {
        if (folderHistory.length > 0) {
            pathNames.pop();
            const previousItems = folderHistory.pop();
            currentItemsData = previousItems;
            renderGrid(previousItems);
        }
    });

    function showError(msg) {
        gridContainer.innerHTML = `<p style="color:red; text-align:center;">${msg}</p>`;
    }

    init();
});