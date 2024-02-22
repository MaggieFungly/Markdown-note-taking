const pathManagement = require('path')

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
    safePath = currentFilePath.replace(/\//g, '\\');
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
            directoryNodeDiv.title = node.path;
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
            fileNodeDiv.title = node.path;
            fileNodeDiv.setAttribute('data-path', node.path);

            // Create a label for the file node
            const fileLabel = document.createElement('div');
            fileLabel.textContent = node.name;
            fileLabel.className = 'fileLabel';

            if (pathManagement.normalize(node.path) === pathManagement.normalize(currentFilePath)) {
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
        CreatedirectoryDropDownMenu(node, directoryNodeDiv, event);
    })
}

function handleFile(node, fileNodeDiv) {
    fileNodeDiv.addEventListener('click', function (event) {
        event.stopPropagation();
        ipcRenderer.send('load-blocks', node.path);
    });

    fileNodeDiv.addEventListener('contextmenu', function (event) {
        createFileDropDownMenu(fileNodeDiv, node, event);
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
function createFileDropDownMenu(fileNodeDiv, node, event) {
    // Create the dropdown menu
    const fileDropDownMenu = document.createElement('div');
    createDropDownMenu(event, fileDropDownMenu, fileNodeDiv);

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
}

function CreatedirectoryDropDownMenu(node, directoryNodeDiv, event) {
    // Create the dropdown menu
    const directoryDropDownMenu = document.createElement('div');
    createDropDownMenu(event, directoryDropDownMenu, directoryNodeDiv);

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
    renameFolderButton.textContent = 'Rename Folder';
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
    deleteFolderButton.addEventListener('click', function (event) {
        event.stopPropagation();
        ipcRenderer.send('delete-folder', node.path);
        currentContextMenu.remove();
        currentContextMenu = null;
    })
    directoryDropDownMenu.appendChild(deleteFolderButton);

    const showInExplorerButton = document.createElement('button');
    showInExplorerButton.textContent = 'Show in File Explorer';
    showInExplorerButton.addEventListener('click', function (event) {
        event.stopPropagation();
        ipcRenderer.send('show-file-explorer', node.path);
    })
    directoryDropDownMenu.appendChild(showInExplorerButton);

    const createFolderButton = document.createElement('button');
    createFolderButton.textContent = 'Create Folder';
    createFolderButton.addEventListener('click', function (event) {
        ipcRenderer.send('create-folder', node.path);
    })
    directoryDropDownMenu.appendChild(createFolderButton);
}

function createDropDownMenu(event, dropDownMenu, nodeDiv) {

    event.preventDefault();
    event.stopPropagation();
    nodeDiv.classList.add('active-context-menu');

    // Remove any existing context menu
    if (currentContextMenu) {
        currentContextMenu.remove();
        currentContextMenu = null;
    }

    dropDownMenu.className = 'dropdown-menu';
    dropDownMenu.style.position = 'absolute';
    dropDownMenu.style.left = '150px';
    dropDownMenu.style.top = `${event.pageY}px`;

    document.body.appendChild(dropDownMenu);
    currentContextMenu = dropDownMenu;

    document.addEventListener('click', onClickOutside);
    document.addEventListener('contextmenu', onClickOutside);

    function onClickOutside(event) {
        if (currentContextMenu) {
            currentContextMenu.remove();
            currentContextMenu = null;
            nodeDiv.classList.remove('active-context-menu');
        }
    }
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

ipcRenderer.on('get-current-dir', (event, path) => {
    document.getElementById('directory-contents-list').setAttribute('data-path', path);
});