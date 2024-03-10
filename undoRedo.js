let history = []; // Tracks past operations
let redoStack = []; // Tracks operations that can be redone

document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);


function undo() {
    if (history.length === 0) {
        // Already added 'no-navigate' in the condition, so just return
        return;
    }

    const operation = history.pop();
    redoStack.push(operation); // Save for redo

    if (operation.type === 'remove') {
        // To undo remove, reinsert the block
        executeInsertBlock(operation.index, operation.block);
    }

    saveBlocksData();
    updateUndoRedoStates(); // Call the function to update the button states
}


function redo() {
    if (redoStack.length === 0) return;

    const operation = redoStack.pop();
    history.push(operation); // Re-log the operation for potential future undos

    if (operation.type === 'remove') {
        // To redo remove, remove the block again
        removeBlock(operation.index);
    }

    saveBlocksData();
    updateUndoRedoStates(); // Call the function to update the button states
}

function updateUndoRedoStates() {
    const undoIcon = document.getElementById('undo').querySelector('i');
    const redoIcon = document.getElementById('redo').querySelector('i');

    // Update the undo button state based on history length
    if (history.length === 0) {
        undoIcon.classList.add('no-navigate');
    } else {
        undoIcon.classList.remove('no-navigate');
    }

    // Update the redo button state based on redoStack length
    if (redoStack.length === 0) {
        redoIcon.classList.add('no-navigate');
    } else {
        redoIcon.classList.remove('no-navigate');
    }
}
