let blocksData = [];

// Function to update blocksData based on the current state of #blocks
function updateBlocksData() {
    blocksData = [];
    document.querySelectorAll('#blocks .block').forEach(block => {
        let noteText = block.querySelector('.noteEdit').innerText;
        let cueText = block.querySelector('.cueEdit').innerText;
        let isHighlighted = block.style.backgroundColor !== 'transparent';

        blocksData.push({ note: noteText, cue: cueText, highlighted: isHighlighted });
    });
}

// Function to save the current state of blocksData
function saveBlocksData() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('save-blocks-data', blocksData);
}

// MutationObserver callback to be executed when mutations are observed
const observerCallback = (mutationsList, observer) => {
    // On any mutation, update and save blocksData
    updateBlocksData();
    saveBlocksData();
};

// Create an instance of MutationObserver with the callback
const observer = new MutationObserver(observerCallback);

// Start observing the #blocks div for child list changes
document.addEventListener('DOMContentLoaded', () => {
    const targetNode = document.getElementById('blocks');
    observer.observe(targetNode, { childList: true, subtree: true });

    // Initialize the blocksData for the first time
    updateBlocksData();
});
