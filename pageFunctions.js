// Sortable
const Sortable = require("sortablejs");

function syncSortable() {
    const outlineList = document.getElementById('outlineList')
    const blocks = document.getElementById('blocks');

    // Function to synchronize the other list based on the sorted list
    const synchronizeLists = function (sortedEl, otherEl) {
        const sortedItems = Array.from(sortedEl.children).map(function (el) {
            return el.getAttribute('data-id');
        });

        sortedItems.forEach(function (id, index) {
            const itemToMove = otherEl.querySelector('[data-id="' + id + '"]');
            if (otherEl.children[index] !== itemToMove) {
                otherEl.insertBefore(itemToMove, otherEl.children[index]);
            }
        });
    };

    const outlineSortable = new Sortable(outlineList, {
        animation: 300,
        onSort: function () {
            synchronizeLists(outlineList, blocks);
        }
    });

    const blocksSortable = new Sortable(blocks, {
        animation: 300,
        handle: '.dragButton',
        onSort: function () {
            synchronizeLists(blocks, outlineList);
        }
    });
}


function setUpReaderEditMode() {
    const toggleReader = document.getElementById("toggleReader");
    toggleReader.addEventListener('click', toggleReaderMode);

    // toggle edit mode
    const toggleEdit = document.getElementById('toggleEdit')
    toggleEdit.addEventListener('click', toggleEditMode);
}


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

function exportToMarkdown() {
    document.getElementById('exportMarkdown').addEventListener('click', function () {
        ipcRenderer.send('export-to-markdown');
    })
}

function updateVisibility() {
    let cueCheckbox = document.getElementById('cueCheckbox');
    let noteCheckbox = document.getElementById('noteCheckbox');
    let cueElements = document.querySelectorAll('.cueContainer');
    let noteElements = document.querySelectorAll('.noteContainer');

    // Function to add or remove a class from elements
    function toggleClass(elements, className, shouldAdd) {
        elements.forEach(element => {
            if (shouldAdd) {
                element.classList.add(className);
            } else {
                element.classList.remove(className);
            }
        });
    }

    // Determine visibility and exclusive visibility
    let cueVisible = cueCheckbox.checked;
    let noteVisible = noteCheckbox.checked;

    // Update class based on visibility
    toggleClass(cueElements, 'hideContainer', !cueVisible);
    toggleClass(noteElements, 'hideContainer', !noteVisible);

    // Handle exclusive visibility
    if (cueVisible !== noteVisible) { // Only one is visible
        if (cueVisible) {
            toggleClass(cueElements, 'onlyContainer', true);
            toggleClass(noteElements, 'onlyContainer', false);
        } else {
            toggleClass(noteElements, 'onlyContainer', true);
            toggleClass(cueElements, 'onlyContainer', false);
        }
    } else { // Both are visible or both are hidden
        toggleClass(cueElements, 'onlyContainer', false);
        toggleClass(noteElements, 'onlyContainer', false);
    }
}

function setUpNoteCueVisibility() {
    document.getElementById('cueCheckbox').addEventListener('change', updateVisibility);
    document.getElementById('noteCheckbox').addEventListener('change', updateVisibility);

    // Initial update
    updateVisibility();
}

function setUpNavigation() {

    ipcRenderer.on('navigate-state', (event, { previousStackLength, forwardStackLength }) => {

        console.log(previousStackLength)
        manageNavigationButtonColor(navigateBackButton, previousStackLength);
        manageNavigationButtonColor(navigateForwardButton, forwardStackLength);
    });

    const navigateBackButton = document.getElementById('navigate-back')
    navigateBackButton.addEventListener('click', function () {
        ipcRenderer.send('navigate-back')
    });

    const navigateForwardButton = document.getElementById('navigate-forward')
    navigateForwardButton.addEventListener('click', function () {
        ipcRenderer.send('navigate-forward')
    })

    document.getElementById('return').addEventListener('click', function () {
        ipcRenderer.send('load-index')
    })
}

function manageNavigationButtonColor(button, stackLength) {
    const icon = button.querySelector('i');

    if (stackLength > 0) {
        icon.classList.remove('no-navigate');
    } else {
        icon.classList.add('no-navigate');
    }
}

function setUpToolBarFunctions() {
    setUpReaderEditMode();
    setUpNoteCueVisibility();
    exportToMarkdown();
}

syncSortable();
setUpNavigation();
setUpToolBarFunctions();