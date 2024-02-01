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
        listItem.textContent = item.name;
        listItem.title = item.path; // Tooltip showing the full path

        // Optionally set a data attribute for the path if needed for handling clicks
        listItem.setAttribute('data-path', item.path);
        listItem.setAttribute('data-is-directory', item.isDirectory);

        // Handle clicks on each item
        listItem.addEventListener('click', () => {
            if (item.isDirectory) {
                console.log(`Directory clicked: ${item.path}`);
                // Here you can send an IPC message back to the main process to change the current directory
            } else {
                console.log(`File clicked: ${item.path}`);
                // Handle file opening here
                ipcRenderer.send('load-blocks', item.path);
            }
        });

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

// when there's a change in the directory, update UI
ipcRenderer.on('directory-changed', (event, dirPath) => {
    console.log('directory changed from ipcRenderer')
    fetchAndUpdateDirectoryContents(); // Fetch and update the UI
});