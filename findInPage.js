const searchDiv = document.getElementById("searchDiv");
const searchBox = document.getElementById("searchBox");
const stopSearchButton = document.getElementById('stopSearchButton');
const findNextButton = document.getElementById('findNextButton');
const findPreviousButton = document.getElementById('findPreviousButton');


document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchDiv.style.display = "flex";
        searchBox.focus();
    } else if (e.key === 'Escape') {
        if (searchDiv.style.display !== "none") {
            searchDiv.style.display = "none";
            ipcRenderer.send('stop-search');
        }
    } else if (e.key === 'F3' || (e.ctrlKey && e.key === 'g')) {
        e.preventDefault();
        // Trigger find next
        ipcRenderer.send('find-next', searchBox.value);
    } else if ((e.key === 'F3' && e.shiftKey) || (e.ctrlKey && e.shiftKey && e.key === 'g')) {
        e.preventDefault();
        // Trigger find previous
        ipcRenderer.send('find-previous', searchBox.value);
    }
});

searchBox.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent the default action to stop form submission
        findNextButton.click(); // Trigger the click on searchButton
    }
});

findNextButton.addEventListener('click', () => {
    ipcRenderer.send('find-next', searchBox.value);
});

findPreviousButton.addEventListener('click', () => {
    ipcRenderer.send('find-previous', searchBox.value);
});

stopSearchButton.addEventListener('click', () => {
    ipcRenderer.send('stop-search');
    searchDiv.style.display = "none";
});
