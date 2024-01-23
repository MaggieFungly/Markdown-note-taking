let blocksData = [];

// Function to update blocksData based on the current state of #blocks
function updateBlocksData() {
    blocksData = [];
    document.querySelectorAll('#blocks .block').forEach(block => {
        // Attempt to find the CodeMirror instances. 
        // Assuming CodeMirror is directly attached to a specific child element of the block.
        let noteCodeMirrorInstance = block.querySelector('.noteContainer .CodeMirror').CodeMirror;
        let cueCodeMirrorInstance = block.querySelector('.cueContainer .CodeMirror').CodeMirror;

        // Get the text from the CodeMirror instances
        let noteText = noteCodeMirrorInstance ? noteCodeMirrorInstance.getValue() : '';
        let cueText = cueCodeMirrorInstance ? cueCodeMirrorInstance.getValue() : '';

        let isHighlighted = block.style.backgroundColor !== 'transparent';
        let id = block.dataset.id;

        blocksData.push({ note: noteText, cue: cueText, highlighted: isHighlighted, id: id });
    });
}

// Function to save the current state of blocksData
function saveBlocksData() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('save-blocks-data', blocksData);
}

// MutationObserver callback to be executed when mutations are observed
const observerCallback = (mutationsList, observer) => {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList' || mutation.type === 'attributes' || mutation.type === 'characterData') {
            // On any mutation, update and save blocksData
            updateBlocksData();
            saveBlocksData();
        }
    }
};

// Create an instance of MutationObserver with the callback
const observer = new MutationObserver(observerCallback);

// Start observing the #blocks div for child list changes, attribute changes, and character data changes
document.addEventListener('DOMContentLoaded', () => {
    const targetNode = document.getElementById('blocks');
    observer.observe(targetNode, { childList: true, attributes: true, characterData: true, subtree: true });

    // Initialize the blocksData for the first time
    updateBlocksData();
});
