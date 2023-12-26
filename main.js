const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let win;
let selectedFolderPath = '';

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
                selectedFolderPath = result.filePaths[0];
                win.loadFile('page.html');
            }
        }).catch(err => {
            console.log('Error opening dialog:', err);
        });
    });

    ipcMain.on('save-blocks-data', (event, blocksData) => {
        const filePath = path.join('D:', 'test.json');
        fs.writeFile(filePath, JSON.stringify(blocksData, null, 4), (err) => {
            if (err) {
                console.error('Error writing file:', err);
                dialog.showErrorBox('File Write Error', `An error occurred writing the fil  e: ${err.message}`);
                event.reply('save-blocks-data-response', 'error');
            } else {
                event.reply('save-blocks-data-response', 'success');
            }
        });
    });

}

app.whenReady().then(createWindow);
