const toggleOutlineBtn = document.getElementById("toggleOutline");
const outline = document.getElementById("outline");

toggleOutlineBtn.addEventListener('click', toggleOutline);

function toggleOutline() {
    const isOutlineVisible = outline.style.display === 'block';
    outline.style.display = isOutlineVisible ? 'none' : 'block';
}
