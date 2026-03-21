document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('coursesGrid');
    const breadcrumbContainer = document.getElementById('breadcrumbContainer');
    const backBtn = document.getElementById('backBtn');
    const currentPathText = document.getElementById('currentPathText');

    let subjectIcons = {};
    let folderHistory = [];
    let pathNames = ["Home"];

    // --- 1. Setup PDF.js for Previews ---
    const pdfJS = window['pdfjs-dist/build/pdf'];
    if (pdfJS) {
        pdfJS.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // --- 2. Lazy Loader for PDF Previews (Saves memory & bandwidth) ---
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

    // --- 3. Initial Setup & Fetch ---
    async function init() {
        try {
            // Load custom icons if you have them
            const iconResponse = await fetch('icons.json');
            if (iconResponse.ok) subjectIcons = await iconResponse.json();

            // Fetch the Home directory
            await loadDirectory(''); 
        } catch (error) {
            showError(`Initialization failed: ${error.message}`);
        }
    }

    // --- 4. Fetch Data from your API ---
    async function loadDirectory(targetPath) {
        gridContainer.innerHTML = '<div style="text-align:center; padding: 20px;">Loading...</div>';
        
        try {
            // Ask the API for the specific folder (or home if targetPath is empty)
            const url = targetPath 
                ? `https://skintania-api.beamsvj.workers.dev/?path=${encodeURIComponent(targetPath)}`
                : `https://skintania-api.beamsvj.workers.dev/`;
                
            const response = await fetch(url);
            if (!response.ok) throw new Error('API failed to return data');
            
            const items = await response.json();
            renderGrid(items); // Pass the data to the display function
        } catch (error) {
            showError(`Could not load folder: ${error.message}`);
        }
    }

    // --- 5. The Core Display Logic (Rendering the Grid) ---
    function renderGrid(items) {
        gridContainer.innerHTML = ''; // Clear current grid
        breadcrumbContainer.style.display = folderHistory.length > 0 ? 'flex' : 'none';
        currentPathText.textContent = pathNames.join(' > ');

        pdfObserver.disconnect(); // Reset the lazy loader for the new page

        // If the folder is empty
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

            let iconHtml = getIconHtml(item); // Get the correct icon/preview
            card.innerHTML = `${iconHtml}<div class="drive-name">${item.name}</div>`;
            gridContainer.appendChild(card);

            // Tell the observer to watch PDF files for lazy loading
            if (isFile && item.name.toLowerCase().endsWith('.pdf')) {
                const container = card.querySelector('.pdf-container');
                if (container) {
                    container.dataset.link = item.link; 
                    pdfObserver.observe(container);    
                }
            }

            // Handle clicking on a Folder
            if (!isFile) {
                card.addEventListener('click', () => {
                    // Save current view to history so 'Back' is instant
                    folderHistory.push(items); 
                    pathNames.push(item.name);
                    
                    // Calculate the new path and fetch it
                    const newPath = pathNames.slice(1).join('/');
                    loadDirectory(newPath);
                });
            }
        });
    }

    // --- 6. Helper: Determine which Icon/Preview to show ---
    function getIconHtml(item) {
        if (item.type === 'folder') {
            const isHome = folderHistory.length === 0;
            const iconClass = isHome ? (subjectIcons[item.name] || 'fa-solid fa-folder') : 'fa-solid fa-folder';
            return `<div class="drive-icon"><i class="${iconClass}"></i></div>`;
        }

        const ext = item.name.split('.').pop().toLowerCase();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

        if (imageExtensions.includes(ext)) {
            return `<div class="drive-icon"><img src="${item.link}" alt="${item.name}" class="file-preview-img" loading="lazy" /></div>`;
        } else if (ext === 'pdf') {
            return `
            <div class="drive-icon pdf-container">
                <div class="loader" style="border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: auto;"></div>
                <canvas class="pdf-preview-canvas" style="display:none; width: 100%; height: 100%; object-fit: cover;"></canvas>
                <i class="fa-solid fa-file-pdf fallback-icon" style="display:none; color:#e74c3c;"></i>
            </div>`;
        } else {
            return `<div class="drive-icon"><i class="fa-solid fa-file-lines"></i></div>`;
        }
    }

    // --- 7. Helper: Generate actual PDF Canvas Preview ---
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

    // --- 8. UI Helpers ---
    function showError(msg) {
        gridContainer.innerHTML = `<p style="color:red; text-align:center;">${msg}</p>`;
    }

    // Handle "Back" Button
    backBtn.addEventListener('click', () => {
        if (folderHistory.length > 0) {
            pathNames.pop(); 
            // Load instantly from history instead of fetching again!
            renderGrid(folderHistory.pop()); 
        }
    });

    // Start the app!
    init();
});