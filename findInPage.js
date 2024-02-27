const searchDiv = document.getElementById("searchDiv");
const searchBox = document.getElementById("searchBox");
const stopSearchButton = document.getElementById('stopSearchButton');
const findNextButton = document.getElementById('findNextButton');
const findPreviousButton = document.getElementById('findPreviousButton');

// Function to show the search UI
function showSearch() {
    searchDiv.style.display = "flex";
    searchBox.focus();
}

// Function to hide the search UI
function hideSearch() {
    searchDiv.style.display = "none";
    ipcRenderer.send('stop-search');
}

// Function to trigger find next
function findNext() {
    ipcRenderer.send('find-next', searchBox.value.trim());
}

// Function to trigger find previous
function findPrevious() {
    ipcRenderer.send('find-previous', searchBox.value.trim()); // Ensure whitespace is trimmed
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        showSearch();
    } else if (e.key === 'Escape') {
        hideSearch();
    } else if (e.key === 'F3' || (e.ctrlKey && e.key === 'g')) {
        e.preventDefault();
        findNext();
    } else if ((e.key === 'F3' && e.shiftKey) || (e.ctrlKey && e.shiftKey && e.key === 'g')) {
        e.preventDefault();
        findPrevious();
    }
});

findNextButton.addEventListener('click', findNext);
findPreviousButton.addEventListener('click', findPrevious);
stopSearchButton.addEventListener('click', hideSearch);
