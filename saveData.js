let blocksData = [];

function getBlockData(block) {
    // Attempt to find the CodeMirror instances. 
    // Assuming CodeMirror is directly attached to a specific child element of the block.
    let noteCodeMirrorInstance = block.querySelector('.noteContainer .CodeMirror').CodeMirror;
    let cueCodeMirrorInstance = block.querySelector('.cueContainer .CodeMirror').CodeMirror;

    // Get the text from the CodeMirror instances
    let noteText = noteCodeMirrorInstance ? noteCodeMirrorInstance.getValue() : '';
    let cueText = cueCodeMirrorInstance ? cueCodeMirrorInstance.getValue() : '';

    let isHighlighted = block.classList.contains('highlighted-block');
    let id = block.dataset.id;

    const data = { note: noteText, cue: cueText, highlighted: isHighlighted, id: id }

    return data
}

// Function to update blocksData based on the current state of #blocks
function updateBlocksData() {
    blocksData = [];
    document.querySelectorAll('#blocks .block').forEach(block => {
        let data = getBlockData(block);
        blocksData.push(data);
    });
}

// Function to save the current state of blocksData
function saveBlocksData() {
    const { ipcRenderer } = require('electron');
    updateBlocksData();
    ipcRenderer.send('save-blocks-data', blocksData);
}