const toggleOutlineBtn = document.getElementById("toggleOutline");
var outline = document.getElementById("outline");
var blocks = document.getElementById('blocks');

toggleOutlineBtn.addEventListener('click', toggleOutline);

function toggleOutline() {
    outline.classList.toggle('default-width');
    outline.classList.toggle('zero-width');
}

document.addEventListener('DOMContentLoaded', function () {
    // Select all elements with the class '.outlineItem'
    const outlineItems = document.querySelectorAll('.outlineItem');

    // Loop through each '.outlineItem'
    outlineItems.forEach(item => {
        // Add a click event listener to each item
        item.addEventListener('click', function () {
            // Get the 'data-id' attribute of the clicked item
            const dataId = this.getAttribute('data-id');

            // Find the corresponding '.block' element with the same 'data-id'
            const targetBlock = document.querySelector(`.block[data-id="${dataId}"]`);

            // If the target block is found, scroll it into view
            if (targetBlock) {
                targetBlock.scrollIntoView({
                    behavior: 'smooth', // Optional: defines the transition animation
                    block: 'start', // Optional: defines vertical alignment
                    inline: 'nearest' // Optional: defines horizontal alignment
                });
                console.log(targetBlock);
            }
        });
    });
});
