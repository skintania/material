const allDropdowns = document.querySelectorAll('.custom-dropdown');

allDropdowns.forEach(dropdown => {
    const displayBox = dropdown.querySelector('.selected-option');
    const gradeOptions = dropdown.querySelectorAll('.options-list li');
    const optionsList = dropdown.querySelector('.options-list');

    let hideTimer;

    const parentCard = dropdown.closest('.card');

    const showOptions = () => {
        clearTimeout(hideTimer);
        optionsList.style.display = 'block';
        if (parentCard) parentCard.classList.add('dropdown-active');
        document.addEventListener('click', closeOnOutsideClick);
    };

    const hideOptions = () => {
        optionsList.style.display = 'none';
        if (parentCard) parentCard.classList.remove('dropdown-active');
        document.removeEventListener('click', closeOnOutsideClick);
    };

    const hideOptionsDelayed = () => {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            hideOptions();
        }, 200);
    };

    const closeOnOutsideClick = (event) => {
        if (!dropdown.contains(event.target)) {
            hideOptions();
        }
    };

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Desktop: hover behavior
    if (!isTouchDevice) {
        dropdown.addEventListener('mouseenter', showOptions);
        dropdown.addEventListener('mouseleave', hideOptionsDelayed);
    }

    // Mobile / touch: toggle on click
    displayBox.addEventListener('click', (event) => {
        event.stopPropagation();
        if (optionsList.style.display === 'block') {
            hideOptions();
        } else {
            showOptions();
        }
    });

    gradeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const selectedGradeText = this.innerText;
            // support both `data-value` and `value` to make the dropdown reusable
            const selectedGradeValue = this.getAttribute('data-value') ?? this.getAttribute('value');
            displayBox.innerText = selectedGradeText;
            displayBox.setAttribute('data-value', selectedGradeValue);
            
            hideOptions();
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

