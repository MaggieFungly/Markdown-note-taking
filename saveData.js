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
    let type = block.dataset.type;

    if (type === 'note') {
        return { note: noteText, cue: cueText, highlighted: isHighlighted, id: id, type: type }
    }
    else if (type === 'todo') {
        let checked = block.dataset.checked;
        return { note: noteText, cue: cueText, highlighted: isHighlighted, id: id, type: type, checked: checked }
    }
}

// Function to update blocksData based on the current state of #blocks
function updateBlocksData() {
    blocksData = [];
    document.querySelectorAll('#blocks .block').forEach(block => {
        let data = getBlockData(block);
        blocksData.push(data);
    });
}

function updateBlockData(blockContainer) {
    const data = getBlockData(blockContainer); // Assume this gets the updated data for a block
    const idToFind = data.id;

    // Find the index of the block with the matching id
    const index = blocksData.findIndex(block => block.id === idToFind);

    // Check if the block was found
    if (index !== -1) {
        blocksData[index] = data; // Update the block in the array
        ipcRenderer.send('save-blocks-data', blocksData); // Send the updated array for saving
    } else {
        console.log('Block with id', idToFind, 'not found.');
    }
}

// Function to save the current state of blocksData
function saveBlocksData() {
    const { ipcRenderer } = require('electron');
    updateBlocksData();
    ipcRenderer.send('save-blocks-data', blocksData);
}