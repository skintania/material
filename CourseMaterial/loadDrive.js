// script.js
document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('coursesGrid');
    const breadcrumbContainer = document.getElementById('breadcrumbContainer');
    const backBtn = document.getElementById('backBtn');
    const currentPathText = document.getElementById('currentPathText');

    let rootData = [];
    let folderHistory = []; // Stack to remember previous folders when we hit "Back"
    let pathNames = ["Home"]; // Stack to remember the names of the folders we are in

    // 1. Fetch JSON data
    fetch('/CourseMaterial/MaterialLink.json')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load data.json');
            return response.json();
        })
        .then(data => {
            rootData = data;
            renderGrid(rootData); // Render the main page
        })
        .catch(error => {
            console.error(error);
            gridContainer.innerHTML = '<p style="color: red;">Error loading data.</p>';
        });

    // 2. Function to draw the grid icons
    function renderGrid(items) {
        gridContainer.innerHTML = ''; // Clear the current grid

        // Show or hide the Back button based on our history length
        if (folderHistory.length > 0) {
            breadcrumbContainer.style.display = 'flex';
            currentPathText.textContent = pathNames.join(' > '); // e.g. "Home > General Physics 1"
        } else {
            breadcrumbContainer.style.display = 'none';
        }

        // Loop through whatever array we are currently looking at
        items.forEach(item => {
            if (item.type === 'folder') {
                // Generate a Folder Icon
                const card = createCard(item.name, '📁');
                
                // When clicked, dive into this folder
                card.addEventListener('click', () => {
                    folderHistory.push(items); // Save current view to history
                    pathNames.push(item.name); // Save folder name to path
                    renderGrid(item.contents); // Draw the new contents inside
                });
                
                gridContainer.appendChild(card);
            } 
            else if (item.type === 'file') {
                // Generate a File Icon
                const cardLink = document.createElement('a');
                cardLink.className = 'drive-card';
                cardLink.href = item.link;
                cardLink.target = '_blank'; // Opens in new tab
                cardLink.innerHTML = `
                    <div class="drive-icon">📄</div>
                    <div class="drive-name">${item.name}</div>
                `;
                
                gridContainer.appendChild(cardLink);
            }
        });
    }

    // Helper function to build the folder HTML
    function createCard(name, iconChar) {
        const div = document.createElement('div');
        div.className = 'drive-card';
        div.innerHTML = `
            <div class="drive-icon">${iconChar}</div>
            <div class="drive-name">${name}</div>
        `;
        return div;
    }

    // 3. Setup the Back Button
    backBtn.addEventListener('click', () => {
        if (folderHistory.length > 0) {
            const previousItems = folderHistory.pop(); // Pull out the last saved array
            pathNames.pop(); // Remove the last folder name from path
            renderGrid(previousItems); // Redraw it
        }
    });
});