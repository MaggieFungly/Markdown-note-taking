const suggestionInput = document.getElementById('suggestion-input');
const suggestionOptions = document.getElementById('suggestion-options');
const suggestions = document.getElementById('suggestions')

BlockLinkEventListeners();

function BlockLinkEventListeners() {
    let debounceTimer;
    suggestionInput.addEventListener('keydown', function (event) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchContent = suggestionInput.value.trim();
            getSearchResults(searchContent);
            updateSuggestions();
        }, 200); // Adjust the delay as needed
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeFloatingWindow(suggestions);

            setTimeout(() => {
                activeCodeMirrorEditor.refresh();
            }, 20);
            showEdit(activeCodeMirrorEditor.getWrapperElement().parentNode.querySelector('.displayDiv'), activeCodeMirrorEditor);

            activeCodeMirrorEditor.focus();
        }
    })

    document.addEventListener('click', function (event) {
        // Check if the click happened outside the suggestions div
        if (!suggestions.contains(event.target)) {
            closeFloatingWindow(suggestions);
        }
    });
}

function updateSuggestions() {
    suggestionOptions.innerHTML = '';
    searchResults.forEach(result => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.dataset.id = result.id;
        item.dataset.path = result.path;

        const relativePath = document.createElement('div');
        relativePath.textContent = result.relativePath;
        relativePath.className = 'suggestion-item-file-path';
        item.appendChild(relativePath)

        const id = document.createElement('div');
        id.textContent = result.id;
        id.className = 'suggestion-item-id';
        item.appendChild(id);

        const note = document.createElement('div');
        note.innerHTML = renderText(result.note);
        note.className = 'suggestion-item-note';
        item.appendChild(note);

        suggestionOptions.appendChild(item);

        item.addEventListener('click', function (event) {
            insertBlockLink(activeCodeMirrorEditor, result.id);
            closeFloatingWindow(suggestions);
        })
    })

    MathJax.typesetPromise([suggestionOptions]).then(() => {
    });
}


function setUpLinkBlocks(codeMirrorEditor) {
    codeMirrorEditor.on("inputRead", function (instance, event) {
        // Check if the '@' key was pressed
        if (event.text[0] === '@') {

            openFloatingWindow(suggestions);

            suggestionInput.value = '';
            suggestionInput.focus();
            suggestionOptions.innerHTML = '';

            // get document contents
            ipcRenderer.send('document-search');
        }
    });
}

function openFloatingWindow(div) {
    div.style.display = 'block';
    setTimeout(() => div.style.opacity = 1, 10);
}

function closeFloatingWindow(div) {
    if ((div.style.display === 'block')) {
        div.style.display = 'none';
        setTimeout(() => div.style.opacity = 0, 10);
    }
}

function insertBlockLink(codeMirrorEditor, blockLink) {
    const doc = codeMirrorEditor.getDoc();
    doc.replaceSelection(blockLink);

    const endCursor = doc.getCursor();
    doc.setCursor({ line: endCursor.line, ch: endCursor.ch });

    setTimeout(() => {
        codeMirrorEditor.refresh();
    }, 80);

    // showDisplay(codeMirrorEditor.getValue(), codeMirrorEditor.getWrapperElement().parentNode.querySelector('.displayDiv'), codeMirrorEditor)
    showEdit(codeMirrorEditor.getWrapperElement().parentNode.querySelector('.displayDiv'), codeMirrorEditor);
}

