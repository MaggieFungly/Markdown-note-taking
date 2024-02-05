const menuButton = document.getElementById('menuButton');
// Event listener for the menu button click
menuButton.addEventListener('click', toggleMenu);

const menuDiv = document.getElementById('menu');

const createNewFileButton = document.getElementById('createNewFileButton');
createNewFileButton.addEventListener('click', createNewFile);

const createFolderButton = document.getElementById('createFolderButton');
createFolderButton.addEventListener('click', function (event) {
    const path = document.getElementById('directory-contents-list').getAttribute('data-path')
    ipcRenderer.send('create-folder', path)
});

// keep track of the toggling states
const directoryToggleStates = {};
function updateUIWithDirectoryTree(tree, parentElement) {

    tree.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    tree.forEach(node => {
        if (node.isDirectory) {
            // Create a directory node element

            const directoryNodeDiv = document.createElement('div');
            directoryNodeDiv.className = 'directoryNode';
            directoryNodeDiv.setAttribute('data-path', node.path);

            // Create a label for the directory node
            const directoryLabel = document.createElement('span');
            directoryLabel.textContent = node.name;
            directoryLabel.className = 'directoryLabel';

            directoryNodeDiv.appendChild(directoryLabel);

            parentElement.appendChild(directoryNodeDiv);

            handleDirectory(node, directoryNodeDiv);

            // Recursively update the UI for children
            if (node.children && node.children.length > 0) {
                const directoryChildrenDiv = document.createElement('div');
                directoryChildrenDiv.style.display = directoryToggleStates[node.path] ? 'block' : 'none';
                directoryChildrenDiv.className = 'directoryChildren';

                directoryNodeDiv.addEventListener('click', function (event) {
                    if (directoryChildrenDiv.style.display === 'none') {
                        directoryChildrenDiv.style.display = 'block';
                        directoryToggleStates[node.path] = true;
                    } else {
                        directoryChildrenDiv.style.display = 'none';
                        directoryToggleStates[node.path] = false;
                    }
                });

                // Recursively update UI for children
                updateUIWithDirectoryTree(node.children, directoryChildrenDiv);

                // Append directoryChildrenDiv to directoryNodeDiv
                directoryNodeDiv.appendChild(directoryChildrenDiv);
            }
        } else {
            // Create a file node element
            const fileNodeDiv = document.createElement('div');
            fileNodeDiv.className = 'fileNode';
            fileNodeDiv.setAttribute('data-path', node.path);

            // Create a label for the file node
            const fileLabel = document.createElement('span');
            fileLabel.textContent = node.name;
            fileLabel.className = 'fileLabel';

            fileNodeDiv.appendChild(fileLabel);
            parentElement.appendChild(fileNodeDiv);

            handleFile(node, fileNodeDiv);
        }
    });
}

function handleDirectory(node, directoryNodeDiv) {
    directoryNodeDiv.addEventListener('contextmenu', function (event) {
        event.stopPropagation();
        DirectoryDropDownMenu(node, directoryNodeDiv, event);
    })
}

function handleFile(node, fileNodeDiv) {
    fileNodeDiv.addEventListener('click', function (event) {
        event.stopPropagation(); // Prevent the directory click handler from being triggered
        ipcRenderer.send('load-blocks', node.path);
    });

    fileNodeDiv.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        event.stopPropagation(); // Prevent triggering parent directory's context menu
        fileDropdownMenu(node, event);
    });
}

// Function to toggle the menu visibility
function toggleMenu() {
    const isMenuVisible = menuDiv.style.display === 'block';
    menuDiv.style.display = isMenuVisible ? 'none' : 'block';
}

function createNewFile() {
    ipcRenderer.send('create-new-file', document.getElementById('directory-contents-list').getAttribute('data-path'));
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

function DirectoryDropDownMenu(node, directoryNodeDiv, event) {
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
        ipcRenderer.send('create-new-file', node.path);
        listItemDropDownMenu.remove(); // Remove menu after action
        currentContextMenu = null; // Reset current context menu reference
    };
    listItemDropDownMenu.appendChild(createFileButton);


    const renameFolderButton = document.createElement('button');
    renameFolderButton.textContent = 'Rename';
    renameFolderButton.onclick = function () {
        const directoryLabel = directoryNodeDiv.querySelector('.directoryLabel')

        directoryLabel.contentEditable = 'true';
        directoryLabel.focus();

        directoryLabel.addEventListener("keypress", function (event) {
            if (event.key === 'Enter') {
                directoryLabel.contentEditable = 'false'
                directoryNodeDiv.focus()
                ipcRenderer.send('rename-folder', directoryLabel.textContent, node.path);
            }
        }
        );
    }
    listItemDropDownMenu.appendChild(renameFolderButton);


    const deleteFolderButton = document.createElement('button');
    deleteFolderButton.textContent('Delete Folder');
    listItemDropDownMenu.appendChild(deleteFolderButton);

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


ipcRenderer.on('get-directory-contents-response', (event, { error, tree }) => {
    if (error) {
        console.error('Error fetching directory contents:', error.message);
        return;
    } else {
        // Clear the existing content
        const directoryContentsList = document.getElementById('directory-contents-list');
        directoryContentsList.innerHTML = '';

        // Call a function to update the UI with the tree structure
        updateUIWithDirectoryTree(tree, directoryContentsList);
    }
});

// when there's a change in the directory, update UI
ipcRenderer.on('directory-changed', (event) => {
    ipcRenderer.send('get-directory-contents')
});

// empty page
ipcRenderer.on('empty-page', (event, args) => {
    clearContents();
    document.getElementById('title').value = '';
});

ipcRenderer.on('folder-created', (event, folderPath) => {
    let newCreatedFolderPath = folderPath;
});
