
// Function to load and render courses from JSON
async function loadCourses() {
    console.log('Starting to load courses...');
try {
    const response = await fetch('/Course/Course.json'); // Adjust path if you put it in Assest/
    console.log('Fetch response:', response);
    const courses = await response.json();
    console.log('Courses loaded:', courses);
    const grid = document.getElementById('coursesGrid');
    console.log('Grid element:', grid);
    
    // Clear any existing content (in case of re-runs)
    grid.innerHTML = '';
    
    // Generate and append each article
    courses.forEach(course => {
    const article = document.createElement('article');
    article.className = 'card';
    article.innerHTML = `
        <h2>${course.title}</h2>
        <p>${course.description}</p>
        <a class="btn" href="${course.link}">${course.linkText}</a>
    `;
    grid.appendChild(article);
    });
    console.log('Courses rendered.');
} catch (error) {
    console.error('Error loading courses:', error);
    // Fallback: show a message if JSON fails to load
    document.getElementById('coursesGrid').innerHTML = '<p>Unable to load courses. Please try again later.</p>';
}
}

// Load courses when the page loads
window.addEventListener('DOMContentLoaded', loadCourses);
