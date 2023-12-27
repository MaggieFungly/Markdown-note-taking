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