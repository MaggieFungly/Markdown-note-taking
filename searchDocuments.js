const nlp = require('compromise');

const MiniSearch = require('minisearch');
let miniSearch = new MiniSearch({
    fields: ['note', 'cue', 'fileName', 'relativePath', 'path'],
    storeFields: ['note', 'cue', 'fileName', 'relativePath', 'path'],
    searchOptions: {
        fuzzy: 0.2
    },
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
            id: content.id,
            note: content.note || '',
            cue: content.cue || '',
            fileName: doc.fileName,
            path: doc.path,
            relativePath: doc.relativePath,
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
    if (searchDocumentInput.textContent === '') {
        document.getElementById('directory-contents-list').style.display = 'block';
        searchDocumentsList.style.display = 'none';
    }
})

searchDocumentInput.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
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
        matchedText: getMatchedFieldContent(result, searchContent),
    }));
}

function getMatchedFieldContent(result, searchTerm) {
    const fieldsToCheck = ['note', 'cue', 'fileName']; // Define fields to check for the match
    const normalizedSearchTerm = searchTerm.toLowerCase(); // Normalize search term for case-insensitive comparison

    // Iterate over the fields to find where the searchTerm is contained
    for (let field of fieldsToCheck) {
        if (result[field] && result[field].toLowerCase().includes(normalizedSearchTerm)) {
            return result[field]; // Return the content of the first matching field
        }
    }
    return ''; // Return an empty string if no match is found in any field
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
        matchedContent.innerHTML = findSentenceWithTerm(result.matchedText, searchContent);
        item.appendChild(matchedContent);

        searchDocumentsList.appendChild(item);

        item.addEventListener('click', (event) => {
            ipcRenderer.send('load-blocks', result.path);
        })
    });
}

function findSentenceWithTerm(text, term) {
    // Normalize the term for case-insensitive search
    const normalizedTerm = term.toLowerCase();

    // Use compromise to split the text into sentences
    const sentences = nlp(text).sentences().out('array');

    // Initialize a variable to store the first matching highlighted sentence
    let highlightedSentence = "";

    // Loop through sentences to find and highlight the first one containing the term
    for (let sentence of sentences) {
        if (sentence.toLowerCase().includes(normalizedTerm)) {
            // Escape special characters in 'term' for use in regex
            const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            // Create a RegExp for the search term, 'gi' for global and case-insensitive
            const regex = new RegExp(`(${escapedTerm})`, 'gi');

            // Replace the term in the sentence with a highlighted version
            highlightedSentence = sentence.replace(regex, `<span class="matched-term">$1</span>`);

            // Break after finding the first match
            break;
        }
    }

    // Return the first matching highlighted sentence or a default message if not found
    return highlightedSentence || "No match found.";
}


