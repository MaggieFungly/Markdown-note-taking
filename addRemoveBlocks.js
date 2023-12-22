function insertBlock(button) {

    // Create a new container for the block
    var blockContainer = document.createElement('div');
    blockContainer.style.display = 'flex';
    blockContainer.className = 'block';

    var cue = document.createElement('div');
    cue.className = 'cueEdit';
    cue.contentEditable = 'true';

    var cueContainer = document.createElement('div');
    cueContainer.className = 'cueContainer';
    cueContainer.appendChild(cue)

    var note = document.createElement('div');
    note.className = 'noteEdit';
    note.contentEditable = 'true';

    var noteContainer = document.createElement('div');
    noteContainer.className = 'noteContainer';
    noteContainer.appendChild(note)

    var buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'block';

    var insertButton = document.createElement('button');
    insertButton.className = 'insertButton';
    insertButton.textContent = 'Insert';
    insertButton.onclick = function () {
        insertBlock(this);
    };

    var removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.onclick = function () {
        removeBlock(this);
    };

    blockContainer.appendChild(cueContainer);
    blockContainer.appendChild(noteContainer);

    blockContainer.appendChild(buttonContainer);
    buttonContainer.appendChild(insertButton);
    buttonContainer.appendChild(removeButton);

    // Insert the new block container below the clicked block container
    button.parentNode.parentNode.parentNode.insertBefore(blockContainer, button.parentNode.parentNode.nextSibling);
};

function removeBlock(button){
    button.parentNode.parentNode.remove();
};
