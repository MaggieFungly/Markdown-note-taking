const toggleOutlineBtn = document.getElementById("toggleOutline");
var outline = document.getElementById("outline");
var blocks = document.getElementById('blocks');

toggleOutlineBtn.addEventListener('click', toggleOutline);

function toggleOutline() {
    const isOutlineVisible = outline.style.display === 'block';
    outline.style.display = isOutlineVisible ? 'none' : 'block';
}
