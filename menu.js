const menuButton = document.getElementById('menuButton');
const menuDiv = document.getElementById('menu');

// Function to fetch and update directory contents
function fetchAndUpdateDirectoryContents() {
    ipcRenderer.send('get-directory-contents');
}

// Function to update the UI with directory contents
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

// Function to toggle the menu visibility
function toggleMenu() {
    const isMenuVisible = menuDiv.style.display === 'block';
    menuDiv.style.display = isMenuVisible ? 'none' : 'block';

    // Fetch and display directory contents only if the menu is becoming visible
    if (!isMenuVisible) {
        fetchAndUpdateDirectoryContents();
    }
}

// Event listener for the menu button click
menuButton.addEventListener('click', toggleMenu);
// Event listener for the directory contents response
ipcRenderer.on('get-directory-contents-response', (event, data) => {
    if (data.error) {
        console.error('Error fetching directory contents:', data.message);
        return;
    }
    updateUIWithDirectoryContents(data.items);
});