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

let currentFilePath = '';
let safePath = '';
ipcRenderer.on('get-current-file-path', (event, path) => {
    currentFilePath = path;
    safePath = currentFilePath.replace(/\\/g, '\\\\');
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
            const directoryLabel = document.createElement('div');
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
                    event.stopPropagation();
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
            const fileLabel = document.createElement('div');
            fileLabel.textContent = node.name;
            fileLabel.className = 'fileLabel';

            if (node.path === currentFilePath){
                fileNodeDiv.classList.add('active');
            }

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
        fileDropdownMenu(fileNodeDiv, node, event);
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
function fileDropdownMenu(fileNodeDiv, node, event) {
    // Prevent the default context menu
    event.preventDefault();

    // Remove any existing context menu
    if (currentContextMenu) {
        currentContextMenu.remove();
        currentContextMenu = null;
    }

    // Create the dropdown menu
    const fileDropDownMenu = document.createElement('div');
    fileDropDownMenu.className = 'dropdown-menu';
    fileDropDownMenu.style.position = 'absolute';
    fileDropDownMenu.style.left = '150px';
    fileDropDownMenu.style.top = `${event.pageY}px`;

    // Add buttons or options to the dropdown menu
    // open file button
    const openButton = document.createElement('button');
    openButton.textContent = 'Open Note';
    openButton.onclick = function () {
        console.log(`Open clicked: ${node.path}`);
        ipcRenderer.send('load-blocks', node.path);
        fileDropDownMenu.remove(); // Remove menu after action
        currentContextMenu = null; // Reset current context menu reference
    };
    fileDropDownMenu.appendChild(openButton);

    // delete file button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete Note';
    deleteButton.onclick = function () {
        console.log('File moved to trashcan.');
        ipcRenderer.send('delete-file', node.path);
        fileDropDownMenu.remove();
        currentContextMenu = null;
    }
    fileDropDownMenu.appendChild(deleteButton);

    const renameNoteButton = document.createElement('button');
    renameNoteButton.textContent = 'Rename Note';
    renameNoteButton.addEventListener('click', function (event) {
        const fileLabel = fileNodeDiv.querySelector('.fileLabel');
        fileLabel.contentEditable = 'true';
        fileLabel.focus();
        fileLabel.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                fileLabel.contentEditable = 'false';
                fileNodeDiv.focus();
                ipcRenderer.send('rename-selected-file', node.path, fileLabel.textContent);
            }
        })
    })
    fileDropDownMenu.appendChild(renameNoteButton);

    const showInExplorerButton = document.createElement('button');
    showInExplorerButton.textContent = 'Show in File Explorer';
    showInExplorerButton.addEventListener('click', function (event) {
        event.stopPropagation();
        ipcRenderer.send('show-file-explorer', node.path);
    })
    fileDropDownMenu.appendChild(showInExplorerButton);

    // Append the dropdown menu to the body to display it
    document.body.appendChild(fileDropDownMenu);

    // Update the current context menu reference
    currentContextMenu = fileDropDownMenu;

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
    const directoryDropDownMenu = document.createElement('div');
    directoryDropDownMenu.className = 'dropdown-menu';
    directoryDropDownMenu.style.position = 'absolute';
    directoryDropDownMenu.style.left = '150px';
    directoryDropDownMenu.style.top = `${event.pageY}px`;

    // Add buttons or options to the dropdown menu
    // open file button
    const createFileButton = document.createElement('button');
    createFileButton.textContent = 'Create Note';
    createFileButton.onclick = function () {
        ipcRenderer.send('create-new-file', node.path);
        directoryDropDownMenu.remove(); // Remove menu after action
        currentContextMenu = null; // Reset current context menu reference
    };
    directoryDropDownMenu.appendChild(createFileButton);


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
    directoryDropDownMenu.appendChild(renameFolderButton);


    const deleteFolderButton = document.createElement('button');
    deleteFolderButton.textContent = 'Delete Folder';
    deleteFolderButton.addEventListener('click', function(event){
        event.stopPropagation();
        ipcRenderer.send('delete-folder', node.path);
    })
    directoryDropDownMenu.appendChild(deleteFolderButton);


    const showInExplorerButton = document.createElement('button');
    showInExplorerButton.textContent = 'Show in File Explorer';
    showInExplorerButton.addEventListener('click', function(event){
        event.stopPropagation();
        ipcRenderer.send('show-file-explorer', node.path);
    })
    directoryDropDownMenu.appendChild(showInExplorerButton);

    // Append the dropdown menu to the body to display it
    document.body.appendChild(directoryDropDownMenu);

    // Update the current context menu reference
    currentContextMenu = directoryDropDownMenu;

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