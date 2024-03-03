const { default: hljs } = require("highlight.js");
const { ipcRenderer } = require("electron/renderer");
const { renderText, handleDisplayDiv } = require("./addRemoveBlocks");
const { viewer } = require('./imageViewer');

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
            cueDisplay.innerHTML = renderText(block.cue);
            noteDisplay.innerHTML = renderText(block.note);
            id = block.id;

            handleDisplayDiv(noteDisplay);
            handleDisplayDiv(cueDisplay);

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