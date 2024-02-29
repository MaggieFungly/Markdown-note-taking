const pathManagement = require('path')
const { clearContents } = require('./importData');

let currentFilePath = '';
let currentContextMenu = null;
let directoryToggleStates = {};

main();

function main() {
    initializeMenuUI();
    setUpIpcRenderers();
}

function initializeDragAndDrop() {
    // Find all draggable nodes
    const nodes = document.querySelectorAll('.node');
    // Find the target container
    const directoryChildren = document.querySelector('.directoryChildren');

    // Apply drag start event to all nodes
    nodes.forEach(node => {
        node.addEventListener('dragstart', handleDragStart);
    });

    // Enable the directoryChildren to be a drop target
    directoryChildren.addEventListener('dragover', handleDragOver);
    directoryChildren.addEventListener('drop', handleDrop);

    let draggedItem = null; // To hold the reference to the currently dragged item

    function handleDragStart(e) {
        draggedItem = this; // 'this' refers to the dragged node
        e.dataTransfer.effectAllowed = 'move'; // Specifies the allowed drag operation
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move'; // Specifies the visual feedback for the drag operation
    }

    function handleDrop(e) {
        e.preventDefault(); // Prevent default action (opening as link for some elements)
        if (draggedItem && e.target === directoryChildren) {
            // Append the dragged node to the directoryChildren container
            directoryChildren.appendChild(draggedItem);
            draggedItem = null; // Reset the draggedItem reference after drop
        }
    }
}

function initializeMenuUI() {
    document.getElementById('menuButton').addEventListener('click', toggleMenu);

    document.getElementById('createNewFileButton').addEventListener('click', function () {
        createNewFile(document.getElementById('directory-contents-list').getAttribute('data-path'));
    });

    document.getElementById('createFolderButton').addEventListener('click', function (event) {
        createFolder(document.getElementById('directory-contents-list').getAttribute('data-path'));
    });
}

function createFolder(path) {
    ipcRenderer.send('create-folder', path)
}

function createNewFile(path) {
    ipcRenderer.send('create-new-file', path);
}

function storeDirectoryToggleStates() {
    const directoryChildren = document.querySelectorAll('.directoryChildren');
    directoryChildren.forEach(directoryChildrenDiv => {
        const path = directoryChildrenDiv.getAttribute('data-path');
        const isExpanded = !directoryChildrenDiv.classList.contains('hide-children-node');
        directoryToggleStates[path] = isExpanded;
    });
}

function restoreDirectoryToggleStates() {
    Object.keys(directoryToggleStates).forEach(path => {
        const directoryChildren = document.querySelector(`.directoryChildren[data-path="${path}"]`);
        console.log(directoryChildren);
        if (directoryChildren) {
            if (directoryToggleStates[path]) {
                directoryChildren.classList.remove('hide-children-node');
            } else {
                directoryChildren.classList.add('hide-children-node');
            }
        }
    });
}


function updateUIWithDirectoryTree(tree, parentElement) {

    tree.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    tree.forEach(node => {
        if (node.isDirectory) {
            // Create a directory node element
            const directoryNodeDiv = setUpDirectoryNode(node);
            parentElement.appendChild(directoryNodeDiv);

            // Recursively update the UI for children
        } else {
            const fileNodeDiv = setUpFileNode(node);
            parentElement.appendChild(fileNodeDiv);
        }
    });
    initializeDragAndDrop();
}

function setUpDirectoryNode(node) {
    const directoryNodeDiv = document.createElement('div');
    directoryNodeDiv.className = 'directoryNode';
    directoryNodeDiv.classList.add('node');

    directoryNodeDiv.title = node.path;
    directoryNodeDiv.setAttribute('data-path', node.path);

    // Create a label for the directory node
    const directoryLabel = document.createElement('div');
    directoryLabel.textContent = node.name;
    directoryLabel.className = 'directoryLabel';
    directoryNodeDiv.appendChild(directoryLabel);

    const directoryChildrenDiv = document.createElement('div');
    directoryNodeDiv.appendChild(directoryChildrenDiv);
    directoryChildrenDiv.className = 'directoryChildren';
    directoryChildrenDiv.setAttribute('data-path', node.path);

    if (directoryToggleStates[node.path]) {
        directoryChildrenDiv.classList.remove('hide-children-node')
    } else {
        directoryChildrenDiv.classList.add('hide-children-node')
    }

    // directory children visibility
    directoryNodeDiv.addEventListener('click', function (event) {
        event.stopPropagation();
        directoryChildrenDiv.classList.toggle('hide-children-node');
    })

    directoryNodeDiv.addEventListener('contextmenu', function (event) {
        CreatedirectoryDropDownMenu(node, directoryNodeDiv, event);
    })

    if (node.children && node.children.length > 0) {
        updateUIWithDirectoryTree(node.children, directoryChildrenDiv);
    }

    return directoryNodeDiv;
}


function setUpFileNode(node) {
    // Create a file node element
    const fileNodeDiv = document.createElement('div');
    fileNodeDiv.className = 'fileNode';
    fileNodeDiv.classList.add('node')
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
    handleFile(node, fileNodeDiv);

    return fileNodeDiv;
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

function toggleMenu() {
    const menuDiv = document.getElementById('menu');
    const isMenuVisible = menuDiv.style.display === 'block';
    menuDiv.style.display = isMenuVisible ? 'none' : 'block';
}

function createFileDropDownMenu(fileNodeDiv, node, event) {
    // Create the dropdown menu
    const fileDropDownMenu = document.createElement('div');
    createDropDownMenu(event, fileDropDownMenu, fileNodeDiv);

    // Add buttons or options to the dropdown menu
    // open file button
    const openButton = document.createElement('button');
    openButton.textContent = 'Open Note';
    openButton.onclick = function () {
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

    // create file
    const createFileButton = document.createElement('button');
    createFileButton.textContent = 'Create Note';
    createFileButton.onclick = function () {
        createNewFile(node.path);
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
    dropDownMenu.style.left = `${event.pageX}px`;
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

function setUpIpcRenderers() {
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
        storeDirectoryToggleStates();
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

    ipcRenderer.on('get-current-file-path', (event, path) => {
        currentFilePath = path;
    });
}