const { app, BrowserWindow, ipcMain, dialog, shell, webContents, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

let win;
let currentFilePath = '';
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
    });
    ipcMain.on('create-folder', (event, path) => {
        createFolder(path);
    });
    ipcMain.on('rename-folder', (event, name, path) => {
        renameFolder(event, name, path);
    })
    ipcMain.on('rename-selected-file', (event, oldPath, Newname) => {
        renameSelectedFile(event, oldPath, Newname);
    });
    ipcMain.on('delete-folder', (event, path) => {
        deleteDirectory(path);
    });
    ipcMain.on('show-file-explorer', (event, path) => {
        showFileExplorer(path);
    });
    ipcMain.on('export-to-markdown', exportToMarkdown);
    ipcMain.on('save-image', (event, image) => {
        saveImage(event, image);
    });
    ipcMain.on('document-search', getDocumentContents);
}

// Event handler to open file dialog
function openFileDialog(event) {
    dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            createNewFile(result.filePaths[0], 1, event);
            currentDir = result.filePaths[0];
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
            // Update the current file path
            currentFilePath = newFilePath;
            const newTitleWithoutExtension = path.basename(newFilePath, '.json');
            // set the new title to the the page
            win.webContents.send('set-title', newTitleWithoutExtension);
            win.webContents.send('get-current-file-path', currentFilePath);
            win.webContents.send('directory-changed');
        }
    });
}

// Event handler to open a JSON file
function showOpenFileDialog(event) {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            const directoryPath = result.filePaths[0];
            currentDir = directoryPath; // Update your current directory path
            console.log(currentDir);
            loadNotePage(directoryPath); // Call loadNotePage with the directory path
        }
    }).catch(err => {
        console.error('Error opening directory dialog:', err);
    });
}

function loadNotePage(filePath) {
    win.loadFile('page.html').then(() => {
        // loadBlocks(filePath);
        console.log(currentDir);
        win.webContents.send('get-current-dir', currentDir);
        win.webContents.send('directory-changed');
    });
}

function loadBlocks(filePath) {

    if (filePath !== currentFilePath) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
            } else {
                // change current file path
                currentFilePath = filePath;
                win.webContents.send('directory-changed');
                win.webContents.send('get-current-file-path', currentFilePath);

                const fileNameWithoutExtension = path.basename(filePath, '.json');
                win.webContents.send('set-title', fileNameWithoutExtension);
                win.webContents.send('json-file-data', { error: false, data: JSON.parse(data) });

                win.webContents.send('log-message', `Note ${fileNameWithoutExtension} loaded.`)

                // watchDirectory when the file is loaded
                watchDirectory();
            }
        });
    }
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
                // loadBlocks(currentFilePath);
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

let watcher = null; // Keep a reference to the watcher to avoid multiple instances
function watchDirectory() {
    if (watcher) {
        watcher.close(); // Close any existing watcher
    }

    watcher = chokidar.watch(currentDir, {
        ignored: /node_modules|\.git/,
        persistent: true,
        ignoreInitial: true,
        // watch all subdirectories
        depth: Infinity,
        usePolling: true
    });

    // Listen for add and unlink events only to detect new files, deletions, and renames
    watcher.on('add', path => {
        win.webContents.send('directory-changed');
    }).on('unlink', path => {
        win.webContents.send('directory-changed');
    }).on('unlinkDir', path => {
        win.webContents.send('directory-changed');
    }).on('addDir', path => {
        win.webContents.send('directory-changed');
    })
    // No need to explicitly handle 'change' events as you don't want to monitor changes inside the files
}


function getDirectoryContents(event) {
    const targetDirPath = currentDir;
    // Ensure currentDir is correctly initialized and accessible

    function readDirRecursive(dir, callback) {
        fs.readdir(dir, { withFileTypes: true }, (err, dirents) => {
            if (err) return callback(err);

            let pending = dirents.length;
            if (!pending) return callback(null, []);

            const tree = [];

            dirents.forEach(dirent => {
                const resPath = path.join(dir, dirent.name);

                if (dirent.isDirectory()) {
                    // Include directories as nodes in the tree
                    const directoryNode = {
                        name: dirent.name,
                        isDirectory: true,
                        path: resPath,
                        children: [] // Initialize an empty array for children
                    };
                    // Recursively read subdirectory
                    readDirRecursive(resPath, (err, children) => {
                        if (err) return callback(err);

                        directoryNode.children.push(...children); // Add children to the parent directory
                        tree.push(directoryNode); // Add the directory node to the tree
                        pending -= 1;
                        if (!pending) callback(null, tree);
                    });
                } else {
                    // Include .json files as leaf nodes in the tree
                    if (path.extname(dirent.name).toLowerCase() === '.json') {
                        tree.push({
                            name: path.basename(dirent.name, '.json'),
                            isDirectory: false,
                            path: resPath,
                            directory: dir
                        });
                    }
                    pending -= 1;
                    if (!pending) callback(null, tree);
                }
            });
        });
    }

    readDirRecursive(targetDirPath, (err, tree) => {
        if (err) {
            event.reply('get-directory-contents-response', { error: true, message: err.message });
        } else {
            // Reply with the tree structure
            event.reply('get-directory-contents-response', { error: false, tree });
        }
    });
}

async function moveToTrash(filePath) {
    try {
        await shell.trashItem(filePath);
        console.log(`File moved to trash: ${filePath}`);
        win.webContents.send('log-message', `File moved to trash: ${filePath}`);
    } catch (error) {
        console.error(`Failed to move file to trash: ${error}`);
        win.webContents.send('log-message', `Failed to move file to trash: ${error}`);
    }
}

function deleteFile(filePath) {
    if (filePath === currentFilePath) {
        win.webContents.send('empty-page');
    }
    moveToTrash(filePath);
}

function createFolder(directoryPath, folderName = 'Untitled') {
    // Create the full path for the new folder
    let folderPath = path.join(directoryPath, folderName);

    // Check if the folder already exists
    let folderExists = fs.existsSync(folderPath);

    // If the folder exists, add a number to the folder name
    let count = 1;
    while (folderExists) {
        folderName = `Untitled ${count}`;
        folderPath = path.join(directoryPath, folderName);
        folderExists = fs.existsSync(folderPath);
        count++;
    }

    try {
        // Create the folder
        fs.mkdirSync(folderPath);
        win.webContents.send('folder-created', folderPath);
        win.webContents.send('log-message', `Folder '${folderName}' created successfully in '${directoryPath}'.`)
    } catch (error) {
        console.error(`Error creating folder '${folderName}' in '${directoryPath}': ${error.message}`);
    }
}


function renameFolder(event, newName, folderPath) {
    const parentDir = path.dirname(folderPath);
    const newFolderPath = path.join(parentDir, newName);

    // check if currentFilePath is within the renamed folder
    if (currentFilePath && currentFilePath.startsWith(folderPath)) {
        // Calculate the new path for the current file
        const relativePath = path.relative(folderPath, currentFilePath);
        var newCurrentFilePath = path.join(newFolderPath, relativePath);
    }

    // Rename the folder
    fs.rename(folderPath, newFolderPath, (err) => {
        if (err) {
            console.error('Failed to rename folder:', err);
            win.webContents.send('directory-changed');
            win.webContents.send('log-message', 'Failed to rename folder');
            return;
        } else {
            console.log('Folder renamed successfully');
            win.webContents.send('directory-changed');
            win.webContents.send('log-message', `Folder renamed to '${newName}'.`)

            if (newCurrentFilePath) {
                currentFilePath = newCurrentFilePath;
                loadBlocks(currentFilePath);
            }

        }
    });

}

function renameSelectedFile(event, oldPath, newName) {
    const directory = path.dirname(oldPath);

    // Ensure newName ends with .json extension
    const newNameWithExtension = newName.endsWith('.json') ? newName : `${newName}.json`;

    const newFilePath = path.join(directory, newNameWithExtension);

    fs.rename(oldPath, newFilePath, (err) => {
        if (err) {
            console.error('Error renaming file:', err);
            win.webContents.send('log-message', `Error renaming file: '${err}$'`)
            win.webContents.send('directory-changed');
        } else {
            if (oldPath === currentFilePath) {
                currentFilePath = newFilePath; // Update currentFilePath to the new path
                loadBlocks(newFilePath); // Reload blocks from the new file path
            }
        }
    });
}

const fsPromise = require('fs/promises');
const { eventNames } = require('process');
const { event } = require('quasar');
function deleteDirectory(directoryPath) {
    fsPromise.rm(directoryPath, { recursive: true, force: true })
        .then(() => {
            console.log(`Directory deleted successfully: ${directoryPath}`);
            win.webContents.send('log-message', `Directory deleted successfully: ${directoryPath}`)
        })
        .catch((err) => {
            console.error(`Error deleting directory: ${err}`);
            win.webContents.send('log-message', `Error deleting directory: ${err}`)
        });
}

function showFileExplorer(filePath) {

    directoryPath = path.dirname(filePath);

    shell.openPath(directoryPath)
        .then((error) => {
            if (error) {
                console.error('Error opening file explorer:', error);
            } else {
                console.log('File explorer opened successfully.');
            }
        })
        .catch((err) => {
            console.error('Failed to open file explorer:', err);
        });
}

function exportToMarkdown() {
    fs.readFile(currentFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }

        // Assuming the file content is a JSON array of notes
        try {
            const notesData = JSON.parse(data);
            const directoryPath = path.dirname(currentFilePath);
            const baseFilename = path.basename(currentFilePath, path.extname(currentFilePath));

            // Prepare content for note and cue markdown files
            let noteContent = '';
            let cueContent = '';

            notesData.forEach(entry => {
                noteContent += `${entry.note}\n\n`;
                cueContent += `${entry.cue}\n\n`;
            });

            // File paths for note and cue markdown files
            const noteFilePath = path.join(directoryPath, `${baseFilename}-note.md`);
            const cueFilePath = path.join(directoryPath, `${baseFilename}-cue.md`);

            // Write note content to its markdown file
            fs.writeFile(noteFilePath, noteContent, (err) => {
                if (err) {
                    console.error('Error writing note markdown file:', err);
                } else {
                    console.log(`Note Markdown file has been saved: ${noteFilePath}`);
                    win.webContents.send('log-message', `Note Markdown file has been saved: ${noteFilePath}`)
                }
            });

            // Write cue content to its markdown file
            fs.writeFile(cueFilePath, cueContent, (err) => {
                if (err) {
                    console.error('Error writing cue markdown file:', err);
                    win.webContents.send(`Error writing cue markdown file: ${err}`)
                } else {
                    console.log(`Cue Markdown file has been saved: ${cueFilePath}`);
                    win.webContents.send('log-message', `Cue Markdown file has been saved: ${cueFilePath}`)
                }
            });

        } catch (parseErr) {
            console.error('Error parsing JSON from file:', parseErr);
        }
    });
}

function saveImage(event, base64Image) {
    const imagesPath = path.join(currentDir, 'Attachments');
    if (!fs.existsSync(imagesPath)) {
        fs.mkdirSync(imagesPath, { recursive: true });
    }
    const imagePath = path.join(imagesPath, `image-${Date.now()}.png`);

    // Convert base64 string to binary data
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const dataBuffer = Buffer.from(base64Data, 'base64');

    // Save the image to disk
    fs.writeFile(imagePath, dataBuffer, (err) => {
        if (err) {
            console.error('Failed to save image:', err);
            win.webContents.send('log-message', `Failed to save image: ${err}`);
        } else {
            console.log('Image saved successfully:', imagePath);
            win.webContents.send('log-message', `Image saved successfully: ${imagePath}`);
            event.reply('image-saved', imagePath);
        }
    });
}


const fse = require('fs-extra');
const glob = require('glob');

async function mergeJsonFilesInDirectory(dirPath) {
    const files = glob.sync(`${dirPath}/**/*.json`);
    const merged = await Promise.all(files.map(async (file) => {
        const content = await fse.readJson(file);
        return { fileName: path.basename(file, '.json'), path: file, contents: content };
    }));
    return merged;
}

function getDocumentContents() {
    mergeJsonFilesInDirectory(currentDir)
        .then(mergedContents => win.webContents.send('get-merged-contents', mergedContents))
        .catch(error => win.webContents.send('log-message', error.toString()));
}


// Start the application when ready
app.whenReady().then(createWindow);

