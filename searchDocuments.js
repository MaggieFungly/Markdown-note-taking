const MiniSearch = require('minisearch');
let miniSearch = new MiniSearch({
    fields: ['note', 'cue', 'fileName', 'path'],
    storeFields: ['fileName', 'path', 'note', 'cue']
});

let allDocumentContents = [];
let tempFlattenedDocuments = [];
let matchedResults = [];
let searchContent = '';
let searchResults = [];

const searchDocumentInput = document.getElementById('search-documents-input');
const searchDocumentsList = document.getElementById('search-documents-list');

ipcRenderer.on('get-merged-contents', (event, mergedContents) => {
    allDocumentContents = mergedContents;
    tempFlattenedDocuments = allDocumentContents.flatMap(doc =>
        doc.contents.map(content => ({
            id: `${doc.fileName}-${content.id}`,
            note: content.note || '',
            cue: content.cue || '', // Ensure cue is a string even if missing
            fileName: doc.fileName,
            path: doc.path
        }))
    );
});


searchDocumentInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        ipcRenderer.send('document-search');
        searchContent = searchDocumentInput.textContent.trim(); // Use value for input elements
        getSearchResults(searchContent);
        displaySearchResults();
    }
});

searchDocumentInput.addEventListener('blur', function (event) {
    if(searchDocumentInput.textContent === ''){
        document.getElementById('directory-contents-list').style.display = 'block';
        searchDocumentsList.style.display = 'none';
    }
})

function getSearchResults(searchContent) {
    // Ensure the index is fresh
    miniSearch.removeAll();
    miniSearch.addAll(tempFlattenedDocuments);

    // Perform the search
    searchResults = miniSearch.search(searchContent);

    // Map search results to include matchedText
    matchedResults = searchResults.map(result => ({
        fileName: result.fileName,
        path: result.path,
        matchedText: `${result.note}`
    }));
}

function displaySearchResults() {
    document.getElementById('directory-contents-list').style.display = 'none';
    searchDocumentsList.style.display = 'block';

    // Clear previous results
    searchDocumentsList.innerHTML = '';
    matchedResults.forEach(result => {
        let item = document.createElement('div');
        item.className = 'searched-item';
        item.title = result.path;

        let fileName = document.createElement('div');
        fileName.textContent = `${result.fileName}`;
        fileName.className = 'searched-file-name';
        item.appendChild(fileName);

        matchedContent = document.createElement('div')
        matchedContent.className = 'matched-content'
        matchedContent.textContent = truncateText(result.matchedText);
        item.appendChild(matchedContent);

        searchDocumentsList.appendChild(item);

        item.addEventListener('click', (event) => {
            ipcRenderer.send('load-blocks', result.path);
        })
    });
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

