document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('coursesGrid');
    const breadcrumbContainer = document.getElementById('breadcrumbContainer');
    const backBtn = document.getElementById('backBtn');
    const currentPathText = document.getElementById('currentPathText');
    const viewToggleBtn = document.getElementById('viewToggleBtn'); // NEW: The toggle button

    let subjectIcons = {};
    let folderHistory = [];
    let pathNames = ["Home"];

    // NEW: State trackers for the view mode
    let currentItemsData = []; // Remembers the current folder's files so we can re-render instantly
    let viewMode = 'grid'; // Default view

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

    async function init() {
        try {
            const iconResponse = await fetch('icons.json');
            if (iconResponse.ok) subjectIcons = await iconResponse.json();
            await loadDirectory('');
        } catch (error) {
            showError(`Initialization failed: ${error.message}`);
        }
    }

    // --- View Toggle Logic ---
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', () => {
            // Switch the mode
            viewMode = viewMode === 'grid' ? 'list' : 'grid';

            // Update the button icon/text so the user knows what clicking it next will do
            if (viewMode === 'grid') {
                viewToggleBtn.innerHTML = '<i class="fa-solid fa-list"></i> Switch to List View';
            } else {
                viewToggleBtn.innerHTML = '<i class="fa-solid fa-grip"></i> Switch to Grid View';
            }

            // Re-render the exact same files, but in the new layout!
            renderGrid(currentItemsData);
        });
    }

    async function loadDirectory(targetPath) {
        gridContainer.innerHTML = '<div style="text-align:center; padding: 20px;">Loading...</div>';

        try {
            const url = targetPath
                ? `https://skintania-api.beamsvj.workers.dev/?path=${encodeURIComponent(targetPath)}`
                : `https://skintania-api.beamsvj.workers.dev/`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('API failed to return data');

            const items = await response.json();
            currentItemsData = items; // Save this so the toggle button can re-use it!
            renderGrid(items);
        } catch (error) {
            showError(`Could not load folder: ${error.message}`);
        }
    }

    function renderGrid(items) {
        gridContainer.innerHTML = '';

        // --- 1. NEW: BUILD CLICKABLE BREADCRUMBS ---
        currentPathText.innerHTML = ''; // Clear the "Home > Folder" text

        pathNames.forEach((name, index) => {
            const isLast = index === pathNames.length - 1;

            // Create the clickable span
            const span = document.createElement('span');
            span.className = 'breadcrumb-link';
            span.textContent = name;

            if (!isLast) {
                span.onclick = () => {
                    // Logic to jump back multiple levels
                    const levelsToPop = pathNames.length - 1 - index;
                    for (let i = 0; i < levelsToPop; i++) {
                        pathNames.pop();
                        folderHistory.pop();
                    }
                    const newPath = pathNames.slice(1).join('/');
                    loadDirectory(newPath);
                };

                currentPathText.appendChild(span);

                // Add a separator ( > )
                const separator = document.createElement('span');
                separator.className = 'path-separator';
                separator.textContent = ' > ';
                currentPathText.appendChild(separator);
            } else {
                // Last item is the current folder (not clickable/different color)
                span.style.color = '#e6eef8';
                span.style.cursor = 'default';
                currentPathText.appendChild(span);
            }
        });

        // --- 2. Handle Back Button State ---
        backBtn.disabled = (folderHistory.length === 0);

        // --- 3. Set the View Mode ---
        if (viewMode === 'list') {
            gridContainer.classList.add('list-view');
        } else {
            gridContainer.classList.remove('list-view');
        }

        pdfObserver.disconnect();

        if (!items || items.length === 0) {
            gridContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: gray;">This folder is empty.</div>';
            return;
        }

        items.forEach(item => {
            const isFile = item.type === 'file';
            const card = document.createElement(isFile ? 'a' : 'div');
            card.className = 'drive-card';

            if (isFile) {
                card.href = item.link;
                card.target = '_blank';
            }

            let iconHtml = getIconHtml(item);
            card.innerHTML = `${iconHtml}<div class="drive-name">${item.name}</div>`;
            gridContainer.appendChild(card);

            // Only observe PDFs if we are actually in Grid mode (List mode uses static icons)
            if (viewMode === 'grid' && isFile && item.name.toLowerCase().endsWith('.pdf')) {
                const container = card.querySelector('.pdf-container');
                if (container) {
                    container.dataset.link = item.link;
                    pdfObserver.observe(container);
                }
            }

            if (!isFile) {
                card.addEventListener('click', () => {
                    folderHistory.push(items);
                    pathNames.push(item.name);
                    const newPath = pathNames.slice(1).join('/');
                    loadDirectory(newPath);
                });
            }
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
            // Optional: You could also return a standard icon for images in list mode if you want it super clean!
            return `<div class="drive-icon"><img src="${item.link}" alt="${item.name}" class="file-preview-img" loading="lazy" style="max-width:40px; border-radius:4px;"/></div>`;
        } else if (ext === 'pdf') {
            // NEW: If we are in list view, skip the canvas and just return a static icon
            if (viewMode === 'list') {
                return `<div class="drive-icon"><i class="fa-solid fa-file-pdf" style="color:#e74c3c; font-size: 1.5rem;"></i></div>`;
            } else {
                // Otherwise, give them the nice grid preview
                return `
                <div class="drive-icon pdf-container">
                    <div class="loader" style="border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: auto;"></div>
                    <canvas class="pdf-preview-canvas" style="display:none; width: 100%; height: 100%; object-fit: cover;"></canvas>
                    <i class="fa-solid fa-file-pdf fallback-icon" style="display:none; color:#e74c3c;"></i>
                </div>`;
            }
        } else {
            return `<div class="drive-icon"><i class="fa-solid fa-file-lines"></i></div>`;
        }
    }

    async function generatePdfPreview(url, container) {
        const canvas = container.querySelector('.pdf-preview-canvas');
        const loader = container.querySelector('.loader');
        const fallbackIcon = container.querySelector('.fallback-icon');

        if (!canvas || !loader || !fallbackIcon) return;

        try {
            const loadingTask = pdfJS.getDocument(url);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);

            const viewport = page.getViewport({ scale: 0.3 });
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            loader.style.display = 'none';
            canvas.style.display = 'block';
        } catch (e) {
            console.warn("Preview failed, showing icon instead:", url);
            loader.style.display = 'none';
            fallbackIcon.style.display = 'block';
        }
    }

    function showError(msg) {
        gridContainer.innerHTML = `<p style="color:red; text-align:center;">${msg}</p>`;
    }

    backBtn.addEventListener('click', () => {
        if (folderHistory.length > 0) {
            pathNames.pop();
            const previousItems = folderHistory.pop();
            currentItemsData = previousItems; // Update our tracker
            renderGrid(previousItems);
        }
    });

    init();
});