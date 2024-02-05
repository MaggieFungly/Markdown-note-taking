const { app, BrowserWindow, ipcMain, dialog, shell, webContents, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');

let win;
let currentFilePath = ''; // Holds the path of the current file
let currentDir = '';

// Create the main window
function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            spellcheck: false
        }
    });

    win.loadFile('index.html');

    // Setup IPC event listeners
    setupIpcEventListeners();

    const undoShortcut = process.platform === 'darwin' ? 'Cmd+Z' : 'Ctrl+Z';
    globalShortcut.register(undoShortcut, () => {
        win.webContents.undo();
    });

}

// Set up IPC event listeners
function setupIpcEventListeners() {
    ipcMain.on('open-file-dialog', openFileDialog);
    ipcMain.on('save-blocks-data', saveBlocksData);
    ipcMain.on('rename-file', renameFile);
    ipcMain.on('open-json-file', showOpenFileDialog);
    ipcMain.on('load-index', loadIndex);
    ipcMain.on('open-link-externally', openLinkExternally);
    ipcMain.on('open-new-window', openNewWindow);
    ipcMain.on('find-json-files', findJsonFiles);
    ipcMain.on('find-next', (event, searchText) => {
        findNextInPage(searchText);
    });
    ipcMain.on('find-previous', (event, searchText) => {
        findPreviousInPage(searchText);
    });
    ipcMain.on('stop-search', (event) => {
        stopFindInPage();
    });
    ipcMain.on('get-directory-contents', (event, dirPath) => {
        getDirectoryContents(event, dirPath);
    });
    ipcMain.on('load-note-page', (event, path) => {
        loadNotePage(path)
    });
    ipcMain.on('load-blocks', (event, path) => {
        loadBlocks(path)
    });
    ipcMain.on('create-new-file', (event, newPath) => {
        createNewFile(newPath, 0);
    });
    ipcMain.on('delete-file', (event, path) => {
        deleteFile(path);
    })
}

// Event handler to open file dialog
function openFileDialog(event) {
    dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            createNewFile(result.filePaths[0], 1, event);
        }
    }).catch(err => {
        console.log('Error opening dialog:', err);
    });
}

// Event handler to save blocks data
function saveBlocksData(event, blocksData) {
    if (currentFilePath === '') {
        console.error('No file path specified for saving data');
        return;
    }

    fs.writeFile(currentFilePath, JSON.stringify(blocksData, null, 4), (err) => {
        if (err) {
            console.error('Error writing file:', err);
            dialog.showErrorBox('File Write Error', `An error occurred writing the file: ${err.message}`);
            event.reply('save-blocks-data-response', 'error');
        } else {
            event.reply('save-blocks-data-response', 'success');
        }
    });
}

// Event handler to rename a file
function renameFile(event, newTitle) {
    if (currentFilePath === '') {
        console.error('No file is currently open for renaming');
        return;
    }

    const directory = path.dirname(currentFilePath);
    let newFileName = `${newTitle}.json`;
    let newFilePath = path.join(directory, newFileName);
    let counter = 1;

    // Function to check if file exists and generate a new file name
    function generateNewFilePath() {
        while (fs.existsSync(newFilePath)) {
            newFileName = `${newTitle} ${counter}.json`;
            newFilePath = path.join(directory, newFileName);
            counter++;
        }
    }

    // Generate unique file path
    generateNewFilePath();

    // Rename the file
    fs.rename(currentFilePath, newFilePath, (err) => {
        if (err) {
            console.error('Error renaming file:', err);
            dialog.showErrorBox('File Rename Error', `An error occurred renaming the file: ${err.message}`);
            event.reply('rename-file-response', 'error');
        } else {
            currentFilePath = newFilePath; // Update the current file path
            const newTitleWithoutExtension = path.basename(newFilePath, '.json');
            // set the new title to the the page
            win.webContents.send('set-title', newTitleWithoutExtension);
        }
    });
}

// Event handler to open a JSON file
function showOpenFileDialog(event) {
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            currentDir = path.dirname(filePath);
            console.log(currentDir);
            loadNotePage(filePath);
        }
    }).catch(err => {
        console.error('Error opening file dialog:', err);
    });
}

function loadNotePage(filePath) {
    win.loadFile('page.html').then(() => {
        loadBlocks(filePath);
    });
}

function loadBlocks(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
        } else {
            currentFilePath = filePath;
            console.log(currentFilePath);
            win.webContents.send('get-current-file-path', currentFilePath);

            const fileNameWithoutExtension = path.basename(filePath, '.json');
            win.webContents.send('set-title', fileNameWithoutExtension);
            win.webContents.send('json-file-data', { error: false, data: JSON.parse(data) });

            // watchDirectory when the file is loaded
            watchDirectory();
        }
    });
}

// Event handler to load the index page
function loadIndex(event) {
    win.loadFile('index.html');
}

// Event handler to open a link externally
function openLinkExternally(event, url) {
    shell.openExternal(url);
}

// Event handler to open a new window
function openNewWindow(event) {
    let newWin = new BrowserWindow({ width: 400, height: 300 });
    newWin.loadFile("page.html");
}

// Function to create a new file
function createNewFile(folderPath, isLoadPage, event) {

    if (folderPath === '') {
        folderPath = currentDir;
    }

    let fileName = 'Untitled.json';
    let filePath = path.join(folderPath, fileName);
    let fileNumber = 1;

    while (fs.existsSync(filePath)) {
        fileName = `Untitled ${fileNumber}.json`;
        filePath = path.join(folderPath, fileName);
        fileNumber++;
    }

    // Create a new empty file
    // In createNewFile function
    fs.writeFile(filePath, JSON.stringify([], null, 4), (err) => {
        if (err) {
            console.error('Error creating file:', err);
            dialog.showErrorBox('File Creation Error', `An error occurred creating the file: ${err.message}`);
        } else {
            currentFilePath = filePath; // Store the new file path

            if (isLoadPage) {
                loadNotePage(currentFilePath);
            } else {
                win.webContents.send('clear-contents');
                loadBlocks(currentFilePath);
            }
        }
    });
}

function findJsonFiles(event, dir) {
    fs.readdir(dir, (err, files) => {
        if (err) {
            event.reply('find-json-files-response', 'error', err.message);
            return;
        }

        let jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
        event.reply('find-json-files-response', 'success', jsonFiles);
    });
}

// search
// Find next in page
function findNextInPage(searchText) {
    if (win && searchText) {
        win.webContents.findInPage(searchText, { forward: true, findNext: true });
    }
}

// Find previous in page
function findPreviousInPage(searchText) {
    if (win && searchText) {
        win.webContents.findInPage(searchText, { forward: false, findNext: true });
    }
}

// stop searching in page
function stopFindInPage(action = 'clearSelection') {
    if (win) {
        win.webContents.stopFindInPage(action);
    }
}

let directoryWatcher = null; // Keep a reference to the watcher to avoid multiple instances
function watchDirectory() {
    if (directoryWatcher) {
        directoryWatcher.close();
    }

    directoryWatcher = fs.watch(currentDir, (eventType, filename) => {
        if (filename) {
            win.webContents.send('directory-changed');
        }
    });
}


function getDirectoryContents(event, dirPath = '') {

    const targetDirPath = dirPath || currentDir;

    fs.readdir(targetDirPath, { withFileTypes: true }, (err, dirents) => {
        if (err) {
            event.reply('get-directory-contents-response', { error: true, message: err.message });
            return;
        }

        const items = dirents
            .filter(dirent => dirent.isDirectory() || path.extname(dirent.name).toLowerCase() === '.json')
            .map(dirent => ({
                name: dirent.name,
                isDirectory: dirent.isDirectory(),
                path: path.join(targetDirPath, dirent.name)
            }));

        event.reply('get-directory-contents-response', { error: false, items });
    });
}

async function moveToTrash(filePath) {
    try {
        await shell.trashItem(filePath);
        console.log(`File moved to trash: ${filePath}`);
    } catch (error) {
        console.error(`Failed to move file to trash: ${error}`);
    }
}

function deleteFile(filePath) {

    if (filePath === currentFilePath) {
        win.webContents.send('empty-page');
    }
    moveToTrash(filePath);
}



// Start the application when ready
app.whenReady().then(createWindow);

