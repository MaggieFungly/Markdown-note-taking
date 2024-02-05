const menuButton = document.getElementById('menuButton');
// Event listener for the menu button click
menuButton.addEventListener('click', toggleMenu);

const menuDiv = document.getElementById('menu');

const createNewFileButton = document.getElementById('createNewFileButton');
createNewFileButton.addEventListener('click', createNewFile);


function updateUIWithDirectoryContents(items, parentElement) {
    items.forEach(item => {
        const fileItemDiv = document.createElement('div');
        fileItemDiv.className = 'fileItem';
        fileItemDiv.setAttribute('data-path', item.path);
        fileItemDiv.setAttribute('data-is-directory', item.isDirectory.toString());

        fileItemDiv.textContent = item.name;
        fileItemDiv.title = item.path;

        // Append fileItem directly to the parentElement
        parentElement.appendChild(fileItemDiv);

        if (item.isDirectory) {
            handleDirectory(item, fileItemDiv);
        } else {
            handleFile(item, fileItemDiv);
        }
    });
}

function handleDirectory(item, fileItemDiv) {
    // Initially set the isToggled attribute as a string 'false'
    fileItemDiv.setAttribute('isToggled', 'false');

    const directoryChildrenDiv = document.createElement('div');
    directoryChildrenDiv.style.display = 'none';
    fileItemDiv.appendChild(directoryChildrenDiv);

    fileItemDiv.addEventListener('click', function (event) {
        // Prevent event from propagating to avoid triggering parent element's click handlers
        event.stopPropagation();

        if (fileItemDiv.getAttribute('isToggled') === 'true') {
            directoryChildrenDiv.style.display = 'none';
            fileItemDiv.setAttribute('isToggled', 'false');
            console.log('Directory toggled to hidden');
        } else {
            directoryChildrenDiv.style.display = 'block';
            fileItemDiv.setAttribute('isToggled', 'true');
            fetchDirectoryContents(item.path, directoryChildrenDiv);
        }
    });

    fileItemDiv.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        event.stopPropagation();

        fileItemDiv.addEventListener('contextmenu', function (event) {
            DirectoryDropDownMenu(item, event);
        })
    })
}

function fetchDirectoryContents(path, itemDiv) {
    ipcRenderer.send('get-directory-contents', path);
    ipcRenderer.once('get-directory-contents-response', (event, { error, items }) => {
        if (error) {
            console.error('Error fetching directory contents:', error.message);
            return;
        } else {
            itemDiv.innerHTML = '';
            updateUIWithDirectoryContents(items, itemDiv);
        }
    });
}

function handleFile(item, fileItemDiv) {
    fileItemDiv.addEventListener('click', function (event) {
        event.stopPropagation(); // Prevent the directory click handler from being triggered
        ipcRenderer.send('load-blocks', item.path);
    });

    fileItemDiv.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        event.stopPropagation(); // Prevent triggering parent directory's context menu
        fileDropdownMenu(item, event);
    });
}

// Function to toggle the menu visibility
function toggleMenu() {
    const isMenuVisible = menuDiv.style.display === 'block';
    menuDiv.style.display = isMenuVisible ? 'none' : 'block';
}

function createNewFile() {
    ipcRenderer.send('create-new-file', '');
}

let currentContextMenu = null;
function fileDropdownMenu(item, event) {
    // Prevent the default context menu
    event.preventDefault();

    // Remove any existing context menu
    if (currentContextMenu) {
        currentContextMenu.remove();
        currentContextMenu = null;
    }

    // Create the dropdown menu
    const listItemDropDownMenu = document.createElement('div');
    listItemDropDownMenu.className = 'dropdown-menu';
    listItemDropDownMenu.style.position = 'absolute';
    listItemDropDownMenu.style.left = '150px';
    listItemDropDownMenu.style.top = `${event.pageY}px`;

    // Add buttons or options to the dropdown menu
    // open file button
    const openButton = document.createElement('button');
    openButton.textContent = 'Open Note';
    openButton.onclick = function () {
        console.log(`Open clicked: ${item.path}`);
        ipcRenderer.send('load-blocks', item.path);
        listItemDropDownMenu.remove(); // Remove menu after action
        currentContextMenu = null; // Reset current context menu reference
    };
    listItemDropDownMenu.appendChild(openButton);

    // delete file button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete Note';
    deleteButton.onclick = function () {
        console.log('File moved to trashcan.');
        ipcRenderer.send('delete-file', item.path);
        listItemDropDownMenu.remove();
        currentContextMenu = null;
    }
    listItemDropDownMenu.appendChild(deleteButton);

    const createNoteButton = document.createElement('button');
    createNoteButton.textContent = 'Create Note';
    createNoteButton.onclick = function () {
        ipcRenderer.send('create-new-file', item.path);
    }

    // Append the dropdown menu to the body to display it
    document.body.appendChild(listItemDropDownMenu);

    // Update the current context menu reference
    currentContextMenu = listItemDropDownMenu;

    // Setup to hide the dropdown menu when clicking elsewhere
    document.addEventListener('click', function onClickOutside() {
        if (currentContextMenu) {
            currentContextMenu.remove();
            currentContextMenu = null;
            document.removeEventListener('click', onClickOutside);
        }
    });
}

function DirectoryDropDownMenu(item, event) {
    // Prevent the default context menu
    event.preventDefault();

    // Remove any existing context menu
    if (currentContextMenu) {
        currentContextMenu.remove();
        currentContextMenu = null;
    }

    // Create the dropdown menu
    const listItemDropDownMenu = document.createElement('div');
    listItemDropDownMenu.className = 'dropdown-menu';
    listItemDropDownMenu.style.position = 'absolute';
    listItemDropDownMenu.style.left = '150px';
    listItemDropDownMenu.style.top = `${event.pageY}px`;

    // Add buttons or options to the dropdown menu
    // open file button
    const createFileButton = document.createElement('button');
    createFileButton.textContent = 'Create Note';
    createFileButton.onclick = function () {
        ipcRenderer.send('create-new-file', item.path);
        listItemDropDownMenu.remove(); // Remove menu after action
        currentContextMenu = null; // Reset current context menu reference
    };
    listItemDropDownMenu.appendChild(createFileButton);


    // Append the dropdown menu to the body to display it
    document.body.appendChild(listItemDropDownMenu);

    // Update the current context menu reference
    currentContextMenu = listItemDropDownMenu;

    // Setup to hide the dropdown menu when clicking elsewhere
    document.addEventListener('click', function onClickOutside() {
        if (currentContextMenu) {
            currentContextMenu.remove();
            currentContextMenu = null;
            document.removeEventListener('click', onClickOutside);
        }
    });
}

// when there's a change in the directory, update UI
ipcRenderer.on('directory-changed', (event) => {
    fetchDirectoryContents('', document.getElementById('directory-contents-list'));
    console.log('directory changed')
});

// empty page
ipcRenderer.on('empty-page', (event, args) => {
    clearContents();
    document.getElementById('title').value = '';
});

ipcRenderer.setMaxListeners(1000)

ipcRenderer.on('get-current-file-path', function (event, currentFilePath) {
    // Ensure the directory-contents-list element exists in your renderer's HTML
    const directoryContentsList = document.getElementById('directory-contents-list');

    if (!directoryContentsList) {
        console.error('Directory contents list element not found');
        return;
    }

    // Use a template literal or string concatenation to construct the selector
    const selector = `[data-path="${currentFilePath}"]`;
    const matchingElement = directoryContentsList.querySelector(selector);

    if (matchingElement) {
        matchingElement.style.backgroundColor = 'red';
    } else {
        console.log('No matching element found for the path:', currentFilePath);
    }
});
