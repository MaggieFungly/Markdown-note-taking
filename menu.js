const menuButton = document.getElementById('menuButton');
const menuDiv = document.getElementById('menu');
let menuLoaded = false; // To track if menu contents are loaded

menuButton.addEventListener('click', function () {
    const isMenuVisible = menuDiv.style.display === 'block';
    menuDiv.style.display = isMenuVisible ? 'none' : 'block';

    // Fetch and display directory contents only if not already loaded
    if (!menuLoaded && !isMenuVisible) {
        ipcRenderer.send('get-directory-contents');
        menuLoaded = true;
    }
});

ipcRenderer.on('get-directory-contents-response', (event, data) => {
    if (data.error) {
        console.error('Error fetching directory contents:', data.message);
        return;
    }

    updateUIWithDirectoryContents(data.items);
});

function updateUIWithDirectoryContents(items) {
    const list = document.getElementById('directory-contents-list');
    list.innerHTML = ''; // Clear existing list

    items.forEach(item => {
        const listItem = document.createElement('div');
        listItem.className = 'fileItem';
        listItem.textContent = item;
        list.appendChild(listItem);
    });
}