// Sortable
const Sortable = require("sortablejs");

document.addEventListener('DOMContentLoaded', function () {
    var outlineList = document.getElementById('outlineList')
    var blocks = document.getElementById('blocks');

    // Function to synchronize the other list based on the sorted list
    var synchronizeLists = function (sortedEl, otherEl) {
        var sortedItems = Array.from(sortedEl.children).map(function (el) {
            return el.getAttribute('data-id');
        });

        sortedItems.forEach(function (id, index) {
            var itemToMove = otherEl.querySelector('[data-id="' + id + '"]');
            if (otherEl.children[index] !== itemToMove) {
                otherEl.insertBefore(itemToMove, otherEl.children[index]);
            }
        });
    };

    var outlineSortable = new Sortable(outlineList, {
        animation: 300,
        onSort: function () {
            synchronizeLists(outlineList, blocks);
        }
    });

    var blocksSortable = new Sortable(blocks, {
        animation: 300,
        handle: '.dragButton',
        onSort: function () {
            synchronizeLists(blocks, outlineList);
        }
    });
});


// synchronize focus
// Function to handle click event for an item
function handleClickEvent(item, otherEl) {
    item.addEventListener('click', function () {
        var id = item.getAttribute('data-id');
        var correspondingItem = otherEl.querySelector('[data-id="' + id + '"]');

        // Reset styles for all items in otherEl
        Array.from(otherEl.children).forEach(function (el) {
            el.style.outline = 'none';
        });

        // Apply blue outline to the corresponding item
        if (correspondingItem) {
            correspondingItem.style.border = '2px solid blue';
        }
    });
}

// Function to add click event to list items
function addClickEvent(items, otherEl) {
    items.forEach(function (item) {
        handleClickEvent(item, otherEl);
    });
}

// Usage example (assuming you have two elements outlineList and blocks)
const outlineList = document.getElementById('outlineList')
addClickEvent(Array.from(outlineList.children), blocks);
addClickEvent(Array.from(blocks.children), outlineList);



// toggle reader mode
const toggleReader = document.getElementById("toggleReader");
toggleReader.addEventListener('click', toggleReaderMode);

function toggleReaderMode() {
    const cueContainers = document.querySelectorAll('.cueContainer');
    cueContainers.forEach(container => {
        const displayDiv = container.querySelector('.cueDisplay');
        const codeMirrorWrapper = container.querySelector('.CodeMirror');
        if (displayDiv && codeMirrorWrapper) {
            // Assuming the CodeMirror instance is the first CodeMirror object found in the wrapper
            const codeMirrorEditor = codeMirrorWrapper.CodeMirror || codeMirrorWrapper.querySelector('.CodeMirror').CodeMirror;
            const textValue = codeMirrorEditor.getValue();
            showDisplay(textValue, displayDiv, codeMirrorEditor);
        }
    });

    const noteContainers = document.querySelectorAll('.noteContainer');
    noteContainers.forEach(container => {
        const displayDiv = container.querySelector('.noteDisplay');
        const codeMirrorWrapper = container.querySelector('.CodeMirror');
        if (displayDiv && codeMirrorWrapper) {
            // Assuming the CodeMirror instance is the first CodeMirror object found in the wrapper
            const codeMirrorEditor = codeMirrorWrapper.CodeMirror || codeMirrorWrapper.querySelector('.CodeMirror').CodeMirror;
            const textValue = codeMirrorEditor.getValue();
            showDisplay(textValue, displayDiv, codeMirrorEditor);
        }
    });
}

// toggle edit mode
const toggleEdit = document.getElementById('toggleEdit')
toggleEdit.addEventListener('click', toggleEditMode);

function toggleEditMode() {
    const cueContainers = document.querySelectorAll('.cueContainer');
    cueContainers.forEach(container => {
        const displayDiv = container.querySelector('.cueDisplay');
        const codeMirrorWrapper = container.querySelector('.CodeMirror');
        if (displayDiv && codeMirrorWrapper) {
            const codeMirrorEditor = codeMirrorWrapper.CodeMirror || codeMirrorWrapper.querySelector('.CodeMirror').CodeMirror;
            showEdit(displayDiv, codeMirrorEditor);
        }
    });

    const noteContainers = document.querySelectorAll('.noteContainer');
    noteContainers.forEach(container => {
        const displayDiv = container.querySelector('.noteDisplay');
        const codeMirrorWrapper = container.querySelector('.CodeMirror');
        if (displayDiv && codeMirrorWrapper) {
            const codeMirrorEditor = codeMirrorWrapper.CodeMirror || codeMirrorWrapper.querySelector('.CodeMirror').CodeMirror;
            showEdit(displayDiv, codeMirrorEditor);
        }
    });
}