const suggestionInput = document.getElementById('suggestion-input');
const suggestionOptions = document.getElementById('suggestion-options');
const suggestions = document.getElementById('suggestions')

BlockLinkEventListeners();

function BlockLinkEventListeners() {
    suggestionInput.addEventListener('input', function (event) {
        searchContent = suggestionInput.value.trim();
        getSearchResults(searchContent);
        updateSuggestions();
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeSuggestion();
        }
    })

    document.addEventListener('click', function (event) {
        // Check if the click happened outside the suggestions div
        if (!suggestions.contains(event.target)) {
            closeSuggestion();
        }
    });
}

function updateSuggestions() {
    suggestionOptions.innerHTML = ''; // Clear existing options

    const fragment = document.createDocumentFragment(); // Create a document fragment

    searchResults.forEach(result => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.dataset.id = result.id;
        item.dataset.path = result.path;

        const relativePath = document.createElement('div');
        relativePath.textContent = result.relativePath;
        relativePath.className = 'suggestion-item-file-path';
        item.appendChild(relativePath);

        const id = document.createElement('div');
        id.textContent = result.id;
        id.className = 'suggestion-item-id';
        item.appendChild(id);

        const note = document.createElement('div');
        note.innerHTML = renderText(result.note);
        note.className = 'suggestion-item-note';
        item.appendChild(note);

        fragment.appendChild(item); // Add to the fragment
    });

    suggestionOptions.appendChild(fragment); // Append the fragment to the DOM

    // Batch typeset for performance
    MathJax.typesetPromise().then(() => { });

    // Event delegation for item clicks
    suggestionOptions.addEventListener('click', function (event) {
        const item = event.target.closest('.suggestion-item');
        if (item) {
            insertBlockLink(activeCodeMirrorEditor, item.dataset.id);
            closeSuggestion();
        }
    });
}



function setUpLinkBlocks(codeMirrorEditor) {
    codeMirrorEditor.on("inputRead", function (instance, event) {
        // Check if the '@' key was pressed
        if (event.text[0] === '@') {
            suggestions.style.display = 'block';
            suggestionInput.value = '';
            suggestionInput.focus();
            suggestionOptions.innerHTML = '';

            // get document contents
            ipcRenderer.send('document-search');
        }
    });
}

function closeSuggestion() {
    if ((suggestions.style.display === 'block')) {
        suggestions.style.display = 'none'
    }
}

function insertBlockLink(codeMirrorEditor, blockLink) {
    const doc = codeMirrorEditor.getDoc();
    doc.replaceSelection(blockLink);

    const endCursor = doc.getCursor();
    doc.setCursor({ line: endCursor.line, ch: endCursor.ch });

    setTimeout(() => {
        codeMirrorEditor.refresh();
    }, 100);

    showDisplay(codeMirrorEditor.getValue(), codeMirrorEditor.getWrapperElement().parentNode.querySelector('.displayDiv'), codeMirrorEditor)
}

