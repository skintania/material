const allDropdowns = document.querySelectorAll('.custom-dropdown');

allDropdowns.forEach(dropdown => {
    const displayBox = dropdown.querySelector('.selected-option');
    const gradeOptions = dropdown.querySelectorAll('.options-list li');
    const optionsList = dropdown.querySelector('.options-list');

    let hideTimer;

    const showOptions = () => {
        clearTimeout(hideTimer);
        optionsList.style.display = 'block';
    };

    const hideOptionsDelayed = () => {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            optionsList.style.display = 'none';
        }, 200);
    };

    dropdown.addEventListener('mouseenter', showOptions);
    dropdown.addEventListener('mouseleave', hideOptionsDelayed);

    gradeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const selectedGradeText = this.innerText;
            // support both `data-value` and `value` to make the dropdown reusable
            const selectedGradeValue = this.getAttribute('data-value') ?? this.getAttribute('value');
            displayBox.innerText = selectedGradeText;
            displayBox.setAttribute('data-value', selectedGradeValue);
            
            optionsList.style.display = 'none';
        });
    });
});

// Function to update the circle's fill and text
function updateChance(newPercentage) {
    const circle = document.querySelector('.chance-circle');
    const textBox = document.querySelector('.chance-text');

    // 1. Update the visible text (e.g., "90%")
    textBox.innerText = `${newPercentage}%`;

    // 2. Update the CSS variable to fill the circle
    circle.style.setProperty('--percentage', `${newPercentage}%`);
}

// Example: Test it by setting the chance to 42%
// updateChance(42);