const blockFunctions = require('./addRemoveBlocks');
const { ipcRenderer } = require('electron');
const { marked } = require("marked");
const { default: hljs } = require("highlight.js");

const cueDisplay = document.getElementsByClassName('cueDisplay')[0];
const noteDisplay = document.getElementsByClassName('noteDisplay')[0];


let id = '';

ipcRenderer.on('block-data', (event, block) => {
    if (block.error) {
        console.error('Error loading JSON file:', block.message);
    } else {
        cueDisplay.innerHTML = '';
        noteDisplay.innerHTML = '';

        if (cueDisplay && noteDisplay) {
            cueDisplay.innerHTML = blockFunctions.renderText(block.cue);
            noteDisplay.innerHTML = blockFunctions.renderText(block.note);
            id = block.id;

            MathJax.typesetPromise([noteDisplay, cueDisplay]).then(() => {
                // Additional actions after typesetting, if necessary
            });

        } else {
            console.error('Elements with class cueDisplay or noteDisplay were not found.');
        }
    }
});

ipcRenderer.on('block-name', (event, name) => {
    document.title = name;
})

document.getElementById('load-note').addEventListener('click', () => {
    ipcRenderer.send('open-linked-note', id);
})