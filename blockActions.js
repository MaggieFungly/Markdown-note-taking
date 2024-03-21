
function setUpCommandPalette() {

    const actions = document.getElementById('actions');
    const actionInput = document.getElementById('action-input');

    document.addEventListener('keydown', function (event) {
        // Check if 'Ctrl' is pressed and the 'P' key is pressed
        if (event.ctrlKey && event.key === 'p') {
            event.preventDefault();

            openFloatingWindow(actions);

            document.querySelectorAll('.action').forEach(action => {
                action.style.display = '';
            })

            actionInput.value = '';
            actionInput.focus();
        }
    })

    setUpActionEventListeners();
    setUpActionInput();
}

function setUpActionInput() {
    const MiniSearch = require('minisearch');

    const actionOptions = document.querySelectorAll('.action');
    let actionsToSearch = []; // This will hold objects with id and text for searching

    // Populate actionsToSearch with objects
    actionOptions.forEach(option => {
        actionsToSearch.push({
            id: option.id,
            text: option.querySelector('.action-name').textContent.trim()
        });
    });

    let actionSearch = new MiniSearch({
        fields: ['id', 'text'], // Specify the fields to index
        storeFields: ['id'], // Specify which fields to store
        searchOptions: {
            fuzzy: 0.2
        },
    });

    // Add the structured data to MiniSearch
    actionSearch.addAll(actionsToSearch);

    const actionInput = document.getElementById('action-input');
    let debounceTimeout; // For debouncing the search

    actionInput.addEventListener('keydown', function () {
        clearTimeout(debounceTimeout); // Clear existing timeout on each key press
        debounceTimeout = setTimeout(() => { // Set a new timeout
            let searchValue = actionInput.value.trim();

            if (searchValue !== '') {
                let actionSearchResults = actionSearch.search(searchValue, { prefix: true });
                let searchedIds = actionSearchResults.map(result => result.id);
                actionOptions.forEach(option => {
                    if (!searchedIds.includes(option.id)) {
                        option.style.display = 'none';
                    } else {
                        option.style.display = '';
                    }
                });
            } else {
                actionOptions.forEach(option => {
                    option.style.display = '';
                });
            }
        }, 20); // Debounce delay in milliseconds
    });
}


function showBlockDisplay(blockDiv) {
    const cueCodeMirrorEditor = blockDiv.querySelector('.cueContainer').querySelector('.CodeMirror').CodeMirror;
    const noteCodeMirrorEditor = blockDiv.querySelector('.noteContainer').querySelector('.CodeMirror').CodeMirror;

    const cueDisplay = blockDiv.querySelector('.cueDisplay');
    const noteDisplay = blockDiv.querySelector('.noteDisplay');

    showDisplay(cueCodeMirrorEditor.getValue(), cueDisplay, cueCodeMirrorEditor);
    showDisplay(noteCodeMirrorEditor.getValue(), noteDisplay, noteCodeMirrorEditor);
}


function switchToToDo() {
    if (activeCodeMirrorEditor) {
        const blockDiv = activeCodeMirrorEditor.getWrapperElement().closest('.block');

        blockDiv.dataset.type = 'todo';

        if (!blockDiv.querySelector('.to-do')) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'to-do'

            blockDiv.appendChild(checkbox);
        }

        updateBlockData(blockDiv);
    }
    closeFloatingWindow(actions);
}


function switchToNote() {
    if (activeCodeMirrorEditor) {
        const blockDiv = activeCodeMirrorEditor.getWrapperElement().closest('.block');
        blockDiv.dataset.type = 'note';

        const checkbox = blockDiv.querySelector('.to-do');
        if (checkbox) {
            blockDiv.removeChild(checkbox);
        }

        // let blockData = getBlockData(blockDiv);
        updateBlockData(blockDiv);
    }
    closeFloatingWindow(actions);
}


function toggleBulletListFromCommandPalette() {
    toggleBulletList(activeCodeMirrorEditor);
    closeFloatingWindow(actions);

    const displayDiv = activeCodeMirrorEditor.getWrapperElement().parentNode.querySelector('.displayDiv');

    setTimeout(() => {
        activeCodeMirrorEditor.refresh();
    }, 100);

    showEdit(displayDiv, activeCodeMirrorEditor);
}


function insertBlockQuoteFromCommandPalette() {
    insertBlockQuote(activeCodeMirrorEditor);
    closeFloatingWindow(actions);

    const displayDiv = activeCodeMirrorEditor.getWrapperElement().parentNode.querySelector('.displayDiv');

    setTimeout(() => {
        activeCodeMirrorEditor.refresh();
    }, 100);

    showEdit(displayDiv, activeCodeMirrorEditor);
}


function removeBlockQuoteFromCommandPalette() {
    removeBlockQuote(activeCodeMirrorEditor);
    closeFloatingWindow(actions);

    const displayDiv = activeCodeMirrorEditor.getWrapperElement().parentNode.querySelector('.displayDiv');

    setTimeout(() => {
        activeCodeMirrorEditor.refresh();
    }, 100);

    showEdit(displayDiv, activeCodeMirrorEditor);
}


function displayHighlight() {
    const blocks = document.querySelectorAll('.block');
    const hihglightedBlocks = document.querySelectorAll('.highlighted-block');

    blocks.forEach(b => {
        b.style.display = 'none';
    })

    hihglightedBlocks.forEach(hb => {
        hb.style.display = 'flex';
    })

    closeFloatingWindow(actions);
}

function displayToDoItems() {
    const blocks = document.querySelectorAll('.block');
    blocks.forEach(b => {
        if (b.dataset.type !== "todo") {
            b.style.display = 'none';
        }
    })
    closeFloatingWindow(actions);
}


function displayAllBlocks() {
    const blocks = document.querySelectorAll('.block');
    blocks.forEach(b => {
        b.style.display = 'flex';
    })
    closeFloatingWindow(actions);
}

function returnToNavigator() {
    displayNavigator();
    closeFloatingWindow(actions);
}

function setUpActionEventListeners() {
    const actions = document.getElementById('actions')

    document.getElementById('todo').addEventListener('click', switchToToDo);
    document.getElementById('note').addEventListener('click', switchToNote);

    document.getElementById('bullet-list').addEventListener('click', toggleBulletListFromCommandPalette);
    document.getElementById('insert-block-quote').addEventListener('click', insertBlockQuoteFromCommandPalette);
    document.getElementById('remove-block-quote').addEventListener('click', removeBlockQuoteFromCommandPalette);

    document.getElementById('return-to-navigator').addEventListener('click', returnToNavigator);
    document.getElementById('display-highlight').addEventListener('click', displayHighlight);
    document.getElementById('display-to-do').addEventListener('click', displayToDoItems);
    document.getElementById('display-all-blocks').addEventListener('click', displayAllBlocks);

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeFloatingWindow(actions);
        }
    })

    document.addEventListener('click', function (event) {
        // Check if the click happened outside the suggestions div
        if (!actions.contains(event.target)) {
            closeFloatingWindow(actions);
        }
    });
}