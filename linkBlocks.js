const suggestionInput = document.getElementById('suggestion-input');
const suggestionOptions = document.getElementById('suggestion-options');
const suggestions = document.getElementById('suggestions')

const pageFunctions = require('./pageFunctions.js')

suggestionInput.addEventListener('input', function (event) {
    searchContent = suggestionInput.value.trim();
    getSearchResults(searchContent);
    updateSuggestions();
});

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
        MathJax.typesetPromise([note]).then(() => {
        });

        suggestionOptions.appendChild(item);

        item.addEventListener('click', function (event) {
            insertBlockLink(activeCodeMirrorEditor, result.id);
            closeSuggestion();
        })
    })
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
}

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


document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (event) => {
        const link = event.target
        // Check if the clicked element is an internal link
        if (link.classList.contains('internal-block')) {
            event.preventDefault();
            ipcRenderer.send('open-internal-link', link.dataset.id, link.textContent.trim());
        }
    });
});
