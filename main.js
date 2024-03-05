const { app, BrowserWindow, ipcMain, dialog, shell, webContents, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const fse = require('fs-extra');
const glob = require('glob');
const fsPromise = require('fs/promises');
const shortid = require('shortid');

let win;
let currentFilePath = '';
let currentDir = '';
let documents = '';
let noteBlocks;
let networkWin = null;

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
    ipcMain.on('save-blocks-data', (event, blocksData) => {
        saveBlocksData(currentFilePath, blocksData);
    });
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
        createNewFile(newPath);
    });
    ipcMain.on('delete-file', (event, path) => {
        deleteFile(path);
    });
    ipcMain.on('create-folder', (event, path) => {
        createFolder(path);
    });
    ipcMain.on('rename-folder', (event, name, path) => {
        renameFolder(name, path);
    })
    ipcMain.on('rename-selected-file', (event, oldPath, Newname) => {
        renameSelectedFile(oldPath, Newname);
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
    ipcMain.on('open-internal-link', (event, id, name) => {
        openInternalLink(id, name);
    });
    ipcMain.on('open-linked-note', (event, id) => {
        openLinkedNote(id);
    });
    ipcMain.on('navigate-forward', navigateForward);
    ipcMain.on('navigate-back', navigateBack);
    ipcMain.on('move-item', (event, args) => moveFile(event, args));
    ipcMain.on('get-linked-graph', (event, id) => {
        openNetwork(id);
    })
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

function updateDocument(targetPath, newContents) {
    const documentIndex = documents.findIndex(doc => {
        return path.normalize(doc.path) === path.normalize(targetPath);
    });

    if (documentIndex !== -1) {
        documents[documentIndex].contents = newContents;
    }
}

async function saveBlocksData(filePath, blocksData) {
    if (filePath === '') {
        console.error('No file path specified for saving data');
        return;
    }

    try {
        await fsPromise.writeFile(filePath, JSON.stringify(blocksData, null, 4));
        updateDocument(filePath, blocksData);
    } catch (err) {
        console.error('Error writing file:', err);
        dialog.showErrorBox('File Write Error', `An error occurred writing the file: ${err.message}`);
    }
}

async function renameFile(event, newTitle) {
    if (!currentFilePath || currentFilePath === '') {
        win.webContents.send('log-message', 'No file is currently open for renaming');
        return;
    }

    const directory = path.dirname(currentFilePath);
    const fileExtension = path.extname(currentFilePath);
    let newFilePath = generatePath(path.join(directory, newTitle + fileExtension));

    try {
        await fsPromise.rename(currentFilePath, newFilePath);
        currentFilePath = newFilePath; // Update the global current file path

        // Notify the renderer process about the change
        win.webContents.send('get-current-file-path', currentFilePath);
        win.webContents.send('directory-changed');
        win.webContents.send('set-title', path.basename(newFileName, fileExtension));

    } catch (err) {
        win.webContents.send('log-message:', err);
    }
}

async function moveFileAcrossDevices(source, destination) {
    try {
        await fsPromise.copyFile(source, destination); // Step 1: Copy the file
        await fsPromise.unlink(source); // Step 2: Delete the original file
        console.log(`Successfully moved ${source} to ${destination}`);
    } catch (err) {
        console.error(`Error moving ${source} to ${destination}: ${err}`);
        throw err; // Rethrow or handle as needed
    }
}

async function moveFile(event, { itemPath, targetPath }) {
    itemPath = path.normalize(itemPath);
    const originalTargetPath = path.normalize(targetPath); // Store original target path
    targetPath = path.join(originalTargetPath, path.basename(itemPath));
    targetPath = generatePath(targetPath);

    try {
        await fsPromise.rename(itemPath, targetPath);
        win.webContents.send('log-message', `Successfully moved ${itemPath} to ${targetPath}`);
    } catch (error) {
        if (error.code === 'EXDEV') {
            // If moving across devices, use the fallback to copy and then delete
            try {
                await moveFileAcrossDevices(itemPath, targetPath); // Ensure this function is defined to handle cross-device move
                event.sender.send('log-message', `Successfully moved ${itemPath} to ${targetPath} (across devices)`);
            } catch (crossDeviceError) {
                event.sender.send('log-message', `Error moving ${itemPath} across devices: ${crossDeviceError}`);
            }
        } else {
            event.sender.send('log-message', `Error moving ${itemPath} to ${targetPath}: ${error}`);
        }
    } finally {
        if (currentFilePath === itemPath) {
            loadBlocks(targetPath);
        } else if (currentFilePath.startsWith(itemPath)) {
            const relativePath = path.relative(itemPath, currentFilePath);
            const newPath = path.join(targetPath, relativePath)
            loadBlocks(newPath);
        } else {
            event.sender.send('directory-changed'); // Notify that a directory change occurred, if relevant        
        }
    }
}

// Event handler to open a JSON file
function showOpenFileDialog(event) {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            const directoryPath = result.filePaths[0];
            currentDir = directoryPath; // Update your current directory path
            loadNotePage(directoryPath); // Call loadNotePage with the directory path
        }
    }).catch(err => {
        console.error('Error opening directory dialog:', err);
    });
}

function loadNotePage(filePath) {
    currentDir = path.normalize(filePath);
    updateMergedDocuments();

    currentFilePath = '';
    forwardStack = [];
    previousStack = [];

    win.loadFile('page.html').then(() => {
        console.log(currentDir);
        win.webContents.send('get-current-dir', currentDir);
        win.webContents.send('directory-changed');
        win.webContents.send('forward-stack-length', forwardStack.length);
        win.webContents.send('previous-stack-length', previousStack.length);
    });
}

function loadBlocks(filePath, isNavigate = false) {

    if ((filePath) && (path.normalize(filePath) !== path.normalize(currentFilePath))) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                win.webContents.send('log-message', err)
            } else {

                if (!isNavigate && currentFilePath !== '') {
                    previousStack.push(currentFilePath);
                    forwardStack = [];
                }

                // change current file path
                currentFilePath = filePath;
                win.webContents.send('directory-changed');
                win.webContents.send('get-current-file-path', currentFilePath);

                win.webContents.send('navigate-state', { previousStackLength: previousStack.length, forwardStackLength: forwardStack.length });

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
function createNewFile(folderPath) {

    let fileName = 'Untitled.json';
    let filePath = path.join(folderPath, fileName);
    filePath = generatePath(filePath);

    // Create a new empty file
    // In createNewFile function
    fs.writeFile(filePath, JSON.stringify([], null, 4), (err) => {
        if (err) {
            console.error('Error creating file:', err);
            dialog.showErrorBox('File Creation Error', `An error occurred creating the file: ${err.message}`);
        } else {
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
        updateMergedDocuments();
    }).on('unlink', path => {
        win.webContents.send('directory-changed');
        updateMergedDocuments();
    }).on('unlinkDir', path => {
        win.webContents.send('directory-changed');
        updateMergedDocuments();
    }).on('addDir', path => {
        win.webContents.send('directory-changed');
        updateMergedDocuments();
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


function generatePath(filePath) {
    try {
        let baseName = path.basename(filePath, path.extname(filePath));
        let extension = path.extname(filePath);
        let directory = path.dirname(filePath);
        let finalPath = filePath;
        let counter = 1;

        // Use finalPath in the condition to correctly increment the counter if the path exists
        while (fs.existsSync(finalPath)) {
            // This constructs a new path with an incremented counter if finalPath exists
            finalPath = path.join(directory, `${baseName} ${counter}${extension}`);
            counter++;
        }

        return finalPath;
    }
    catch (error) {
        win.webContents.send('log-message', `An error occurred: ${error}`);
        return null; // Return null or similar to indicate failure
    }
}

function createFolder(directoryPath, folderName = 'Untitled') {
    // Create the full path for the new folder
    let folderPath = path.join(directoryPath, folderName);
    folderPath = generatePath(folderPath);

    try {
        // Create the folder
        fs.mkdirSync(folderPath);
        win.webContents.send('folder-created', folderPath);
        win.webContents.send('log-message', `Folder '${folderName}' created successfully in '${directoryPath}'.`)
    } catch (error) {
        win.webContents.send('log-message', `Error creating folder '${folderName}' in '${directoryPath}': ${error.message}`);
    }
}

async function renameFolder(newName, folderPath) {
    const parentDir = path.dirname(folderPath);
    let newFolderPath = generatePath(path.join(parentDir, newName));

    try {
        // Perform the folder rename operation
        await fsPromise.rename(folderPath, newFolderPath)
        win.webContents.send('log-message', `Folder renamed to '${path.basename(newFolderPath)}'.`);

        // If the currently opened file path is within the renamed folder, update it
        if (currentFilePath && currentFilePath.startsWith(folderPath)) {
            const relativePath = path.relative(folderPath, currentFilePath);
            const newCurrentFilePath = path.join(newFolderPath, relativePath);
            win.webContents.send('get-current-file-path', newCurrentFilePath);
            loadBlocks(newCurrentFilePath);
        }

        // Notify about directory changes after all operations are complete
        win.webContents.send('directory-changed');
    } catch (err) {
        console.error('Failed to rename folder:', err);
        // Notify the renderer process about the error
        win.webContents.send('log-message', `Failed to rename folder: ${err.message}`);
    }
}

async function renameSelectedFile(oldPath, newName) {
    const directory = path.dirname(oldPath);
    const originalExtension = path.extname(oldPath);
    let newFilePath = path.join(directory, newName + originalExtension)

    try {
        await fsPromise.rename(oldPath, newFilePath);
        // Inform the renderer process of success
        win.webContents.send('log-message', `Successfully renamed file to '${path.basename(newFilePath)}'`);
        win.webContents.send('rename-file-response', 'success', path.basename(newFilePath, originalExtension));

        if (oldPath === currentFilePath) {
            currentFilePath = newFilePath; // Update if the renamed file was the current file
            win.webContents.send('set-title', path.basename(newFilePath, originalExtension));
        }
        win.webContents.send('directory-changed'); // Notify of directory change if needed
    } catch (err) {
        console.error('Error renaming file:', err);
        win.webContents.send('log-message', `Error renaming file: ${err.message}`);
        // Provide a way to handle errors in the renderer process
        win.webContents.send('rename-file-response', 'error', err.message);
    }
}

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
                win.webContents.send('log-message', 'File explorer opened successfully.');
            }
        })
        .catch((err) => {
            win.webContents.send('log-message', `'Failed to open file explorer: ${err}`);
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

async function mergeJsonFilesInDirectory(dirPath) {
    const files = glob.sync(`${dirPath}/**/*.json`);

    const merged = await Promise.all(files.map(async (file) => {
        try {
            const content = await fse.readJson(file);
            return {
                fileName: path.basename(file, '.json'),
                path: file,
                contents: content,
                relativePath: path.join(path.relative(currentDir, path.parse(file).dir), path.parse(file).name)
            };
        } catch (error) {
            console.error(`Failed to read JSON from ${file}:`, error);
            return null; // Skip this file by returning null
        }
    })).then(results => results.filter(result => result !== null)); // Filter out the nulls

    return merged;
}

async function checkAndRegenerateIds(mergedDocuments) {
    let idMap = new Map();

    for (const document of mergedDocuments) {
        let documentUpdated = false;

        for (let i = 0; i < document.contents.length; i++) {
            let block = document.contents[i];
            if (idMap.has(block.id)) {
                let newId;
                do {
                    newId = shortid.generate();
                } while (idMap.has(newId));
                block.id = newId; // Update the block's id with the new one
                documentUpdated = true;
            } else {
                idMap.set(block.id, true); // Set the block id in the map if not already present
            }
        }

        // Only write back if this document had duplicated IDs and was updated
        if (documentUpdated) {
            saveBlocksData(document.path, document.contents);
            win.webContents.send('log-message', `Updated IDs and wrote changes to ${document.path}`);
        }
    }
}

function updateMergedDocuments() {
    mergeJsonFilesInDirectory(currentDir)
        .then((merged) => {
            documents = merged;
            checkAndRegenerateIds(documents) // Pass the correct parameter
                .then()
                .catch((error) => console.error(error));

            noteBlocks = flattenDocuments(documents);
        })
        .catch((error) => console.error('Failed to load documents:', error));
}

function flattenDocuments(docs) {
    let blocks;
    blocks = docs.flatMap(doc =>
        doc.contents.map(content => ({
            id: content.id,
            note: content.note || '',
            cue: content.cue || '',
            fileName: doc.fileName,
            path: doc.path,
            relativePath: doc.relativePath,
        }))
    );
    return blocks
}

function getDocumentContents() {
    updateMergedDocuments()
    noteBlocks = flattenDocuments(documents)
    win.webContents.send('get-note-blocks', noteBlocks);
    win.webContents.send('log-message', 'Documents fetched.');
}


let blockWin = null;
let currentContext = null;
function openInternalLink(id, name) {

    // Store id and name in currentContext
    currentContext = { id, name };

    if (blockWin === null || blockWin.isDestroyed()) {
        blockWin = new BrowserWindow({
            width: 600,
            height: 300,
            webPreferences: {
                nodeIntegration: true,
                // Consider using contextIsolation and a preload script for better security
                contextIsolation: false,
            },
        });

        blockWin.loadFile('./blockWindow.html').then(() => {
            const result = findBlockById(currentContext.id);

            if (result) { // Corrected from `if (block)` to `if (result)`
                blockWin.webContents.send('block-data', result.block);
                blockWin.webContents.send('block-name', currentContext.name);
            } else {
                console.error('Block not found.');
                win.webContents.send('log-message', 'Block not found.')
            }
        });

        blockWin.on('closed', () => {
            blockWin = null;
            currentContext = null; // Clear context when window is closed
        });
    } else {
        blockWin.focus();
        blockWin.setAlwaysOnTop(true, "floating");
    }
}


function findBlockById(targetId) {

    for (let document of documents) {
        // Use .filter() to find blocks with the matching id within the document's contents
        let matchingBlocks = document.contents.filter(block => block.id === targetId);

        // If matching blocks are found, return the first one along with the document's path
        if (matchingBlocks.length > 0) {
            return { block: matchingBlocks[0], path: document.path };
        }
    }
    // Return null if no matching block is found
    return null;
}

function openLinkedNote(id) {
    const result = findBlockById(id);
    loadBlocks(result.path);
}

let previousStack = [];
let forwardStack = [];

function navigateBack() {
    let previousPath = previousStack.pop(); // Attempt to pop the next path
    while (previousPath !== undefined && !fs.existsSync(previousPath)) {
        // If nextPath doesn't exist, try the next one
        previousPath = previousStack.pop();
    }

    if (previousPath !== undefined) {
        // If we found a valid nextPath
        forwardStack.push(currentFilePath); // Push the current path to forwardStack
        loadBlocks(previousPath, true); // Load the blocks for previousPath, indicating this is a navigation action
    } else {
        // If no valid nextPath was found
        win.webContents.send('log-message', "No more pages to navigate back.");
    }
}

function navigateForward() {
    let nextPath = forwardStack.pop();
    while (nextPath !== undefined && !fs.existsSync(nextPath)) {
        nextPath = forwardStack.pop();
    }

    if (nextPath !== undefined) {
        // If we found a valid nextPath
        previousStack.push(currentFilePath);
        loadBlocks(nextPath, true);
    } else {
        win.webContents.send('log-message', "No more pages to navigate forward.");
    }
}

function openNetwork(id) {

    noteBlocks = flattenDocuments(documents)

    const { findAllLinkedBlocks } = require('./connectedBlocks');
    let { connectedBlocks, relevantConnections } = findAllLinkedBlocks(noteBlocks, id);

    if (networkWin === null || networkWin.isDestroyed()) {
        networkWin = new BrowserWindow({
            width: 600,
            height: 300,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });
    }

    networkWin.loadFile('./network.html');
    ipcMain.on('graph-window-ready', (event) => {
        networkWin.webContents.send('linked-graph', { blockId: id, blocks: connectedBlocks, connections: relevantConnections });
    })
}

// Start the application when ready
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})