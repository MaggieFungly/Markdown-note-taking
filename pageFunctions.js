// sortable
document.addEventListener('DOMContentLoaded', () => {
    const returnButton = document.getElementById('return');
    returnButton.addEventListener('click', function () {
        ipcRenderer.send('load-index');
    });

    var sortable = new Sortable(document.querySelector('#blocks'), {
        handle: '.dragButton',
        animation: 300,
    });
});

// toolbar functions
// toggle display
function toggleDisplay() {
    const blocks = document.querySelectorAll('.block');
    blocks.forEach(block => {
        const noteEdit = block.querySelector('.noteEdit');
        const noteDisplay = block.querySelector('.noteDisplay');
        const cueEdit = block.querySelector('.cueEdit');
        const cueDisplay = block.querySelector('.cueDisplay');
        if (noteEdit && noteDisplay) {
            const style = window.getComputedStyle(noteEdit);
            if (style.display !== 'none') {
                showDisplay(noteEdit, noteDisplay);
            }
        }
        if (cueEdit && cueDisplay) {
            const style = window.getComputedStyle(cueEdit);
            if (style.display !== 'none') {
                showDisplay(cueEdit, cueDisplay);
            }
        }
    });
}

// toggle edit
function toggleEdit() {
    const blocks = document.querySelectorAll('.block');
    blocks.forEach(block => {
        const noteEdit = block.querySelector('.noteEdit');
        const noteDisplay = block.querySelector('.noteDisplay');
        const cueEdit = block.querySelector('.cueEdit');
        const cueDisplay = block.querySelector('.cueDisplay');
        if (noteEdit && noteDisplay) {
            const style = window.getComputedStyle(noteEdit);
            if (style.display !== 'block') {
                showEdit(noteEdit, noteDisplay);
            }
        }
        if (cueEdit && cueDisplay) {
            const style = window.getComputedStyle(cueEdit);
            if (style.display !== 'block') {
                showEdit(cueEdit, cueDisplay);
            }
        }
    });
}

// larger fonts
document.addEventListener('DOMContentLoaded', () => {
    const fontLargerButton = document.getElementById('fontLarger');

    fontLargerButton.addEventListener('click', () => {
        // Select all elements with the specified classes
        const elements = document.querySelectorAll('.cueEdit, .noteEdit, .cueDisplay, .noteDisplay, .cueDisplay pre>code, .noteDisplay pre > code');

        elements.forEach(element => {
            // Get the current font size
            const currentFontSize = window.getComputedStyle(element, null).getPropertyValue('font-size');
            // Calculate the new font size
            const newFontSize = parseFloat(currentFontSize) + 1 + 'px';
            // Apply the new font size
            element.style.fontSize = newFontSize;
        });
    });
});

// smaller fonts
document.addEventListener('DOMContentLoaded', () => {
    const fontLargerButton = document.getElementById('fontSmaller');

    fontLargerButton.addEventListener('click', () => {
        // Select all elements with the specified classes
        const elements = document.querySelectorAll('.cueEdit, .noteEdit, .cueDisplay, .noteDisplay, .cueDisplay pre>code, .noteDisplay pre > code');

        elements.forEach(element => {
            // Get the current font size
            const currentFontSize = window.getComputedStyle(element, null).getPropertyValue('font-size');
            // Calculate the new font size
            const newFontSize = parseFloat(currentFontSize) - 1 + 'px';
            // Apply the new font size
            element.style.fontSize = newFontSize;
        });
    });
});