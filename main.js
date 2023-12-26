const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let win;
let currentFilePath = ''; // This will hold the path of the current file

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

    ipcMain.on('open-file-dialog', (event) => {
        dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        }).then(result => {
            if (!result.canceled && result.filePaths.length > 0) {
                createNewFile(result.filePaths[0], event);
            }
        }).catch(err => {
            console.log('Error opening dialog:', err);
        });
    });

    ipcMain.on('save-blocks-data', (event, blocksData) => {
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
    });

    ipcMain.on('rename-file', (event, newTitle) => {
        if (currentFilePath === '') {
            console.error('No file is currently open for renaming');
            return;
        }

        const newFilePath = path.join(path.dirname(currentFilePath), `${newTitle}.json`);
        fs.rename(currentFilePath, newFilePath, (err) => {
            if (err) {
                console.error('Error renaming file:', err);
                dialog.showErrorBox('File Rename Error', `An error occurred renaming the file: ${err.message}`);
                event.reply('rename-file-response', 'error');
            } else {
                currentFilePath = newFilePath; // Update the current file path
                event.reply('rename-file-response', 'success', newTitle);
            }
        });
    });

    ipcMain.on('load-index', (event) => {
        win.loadFile('index.html');
    });

}

function createNewFile(folderPath, event) {
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

app.whenReady().then(createWindow);
