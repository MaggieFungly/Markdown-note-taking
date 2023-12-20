function dragStart(event) {
    event.dataTransfer.setData("text/plain", event.target.id);
    event.target.classList.add('dragging');
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    var data = event.dataTransfer.getData("text/plain");
    var draggedElement = document.getElementById(data);
    var dropTarget = event.target.closest('.block');

    // Ensure that the drop target is a valid block
    if (dropTarget && dropTarget !== draggedElement) {
        dropTarget.parentNode.insertBefore(draggedElement, dropTarget.nextSibling);
    }
}

window.onload = function () {
    var blocks = document.querySelectorAll('.block');
    blocks.forEach(function (block, index) {
        block.id = 'block' + (index + 1);
    });
}