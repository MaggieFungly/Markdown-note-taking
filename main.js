const { app, BrowserWindow, ipcMain, dialog, shell, webContents, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');

let win;
let currentFilePath = ''; // Holds the path of the current file

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
    ipcMain.on('open-json-file', openJsonFile);
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
    ipcMain.on('get-directory-contents', getDirectoryContents);
    ipcMain.on('load-note-page', (event, path) => {
        loadNotePage(path)
    });
    ipcMain.on('load-blocks', (event, path) => {
        loadBlocks(path)
    })
}

// Event handler to open file dialog
function openFileDialog(event) {
    dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            createNewFile(result.filePaths[0], event);
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
            event.reply('rename-file-response', 'success', newTitleWithoutExtension);
            // set the new title to the the page
            win.webContents.send('set-title', newTitleWithoutExtension);
        }
    });
}

// Event handler to open a JSON file
function openJsonFile(event) {
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            loadNotePage(filePath);
        }
    }).catch(err => {
        console.error('Error opening file dialog:', err);
    });
}

function loadNotePage(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
        } else {
            // store current file path
            currentFilePath = filePath; // Update the current file path
            win.loadFile('page.html').then(() => {
                const fileNameWithoutExtension = path.basename(filePath, '.json');
                win.webContents.send('set-title', fileNameWithoutExtension);
                win.webContents.send('json-file-data', { error: false, data: JSON.parse(data) });

                // watchDirectory when the file is loaded
                watchDirectory();
            });
        }
    });
}

function loadBlocks(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
        } else {
            // store current file path
            currentFilePath = filePath; // Update the current file path
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
function createNewFile(folderPath, event) {
    // Logic for creating a new file
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
            win.loadFile('page.html').then(() => {
                // Send the file name to the renderer after loading page.html
                const fileNameWithoutExtension = path.basename(filePath, '.json');
                win.webContents.send('set-title', fileNameWithoutExtension);
            });
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
    const dirPath = currentFilePath ? path.dirname(currentFilePath) : app.getPath('documents');

    if (directoryWatcher) {
        directoryWatcher.close();
    }

    directoryWatcher = fs.watch(dirPath, (eventType, filename) => {
        if (filename) {
            win.webContents.send('directory-changed', dirPath); // Notify the renderer process
        }
    });
}


// This function needs to be adjusted to use IPC to communicate with the renderer process
function getDirectoryContents() {
    if (!currentFilePath) {
        win.webContents.send('get-directory-contents-response', { error: true, message: 'No directory path set' });
        return;
    }

    const dirPath = path.dirname(currentFilePath);

    fs.readdir(dirPath, { withFileTypes: true }, (err, dirents) => {
        if (err) {
            win.webContents.send('get-directory-contents-response', { error: true, message: err.message });
            return;
        }
        
        // each item contains name, filetype (.json or directory), and absolute path
        const items = dirents
            .filter(dirent => dirent.isDirectory() || path.extname(dirent.name).toLowerCase() === '.json')
            .map(dirent => ({
                name: dirent.name,
                isDirectory: dirent.isDirectory(),
                // Provide the full path for each item
                path: path.join(dirPath, dirent.name)
            }));

        win.webContents.send('get-directory-contents-response', { error: false, items });
    });
}


// Start the application when ready
app.whenReady().then(createWindow);

