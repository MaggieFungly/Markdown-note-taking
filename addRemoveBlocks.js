function showDisplay(textValue, displayDiv, codeMirrorEditor){
    // render Markdown
    displayDiv.innerHTML = marked.parse(textValue);
    // handle math equations
    MathJax.typesetPromise([displayDiv]).then(() => {
    });
    displayDiv.style.display = "block"; // Show the display div
    codeMirrorEditor.getWrapperElement().style.display = "none"; // Hide the editor
}

function addEditor(blockContainer, editorClassName, textAreaClassName, codeMirrorClassName, displayDivClassName, text) {
    var editorDiv = document.createElement('div');
    editorDiv.className = editorClassName;
    blockContainer.appendChild(editorDiv);

    var editTextArea = document.createElement('textarea');
    editTextArea.className = textAreaClassName;
    editTextArea.style.display = 'block';
    editTextArea.style.whiteSpace = 'pre-wrap';
    editTextArea.textContent = text;
    editorDiv.appendChild(editTextArea);

    var codeMirrorEditor = CodeMirror.fromTextArea(editTextArea, {
        lineNumbers: false,
        mode: "markdown",
        theme: "monokai",
        autoCloseBrackets: true,
        lineWrapping: true,
        indentWithTabs: true,
        showCursorWhenSelecting: true,
    });

    codeMirrorEditor.on("change", function () {
        updateBlocksData();
        saveBlocksData(); // Call saveBlocksData whenever there is a change in the editor
    });

    var displayDiv = document.createElement('div');
    editorDiv.appendChild(displayDiv);
    displayDiv.className = displayDivClassName;
    displayDiv.style.display = 'none';

    codeMirrorEditor.on("blur", function () {
        textValue = codeMirrorEditor.getValue()
        showDisplay(textValue, displayDiv, codeMirrorEditor)
    });

    displayDiv.addEventListener("contextmenu", function (event) {
        // Prevent the default context menu
        event.preventDefault(); 
        // Show the editor
        codeMirrorEditor.getWrapperElement().style.display = "block"; 
        displayDiv.style.display = "none"; // Hide the display div
    });
}

function insertBlock(index, cue = '', note = '', highlighted = false, id = '') {
    var blocksContainer = document.getElementById('blocks');

    // Create a new container for the block
    var blockContainer = document.createElement('div');
    blockContainer.style.display = 'flex';
    blockContainer.style.backgroundColor = highlighted ? 'rgba(245, 236, 171, 0.3)' : 'transparent';
    blockContainer.className = 'block';

    // generate a uuid
    if (!id || id === '') {
        blockContainer.dataset.id = uuid.v4();
    } else {
        blockContainer.dataset.id = id;
    }

    addEditor(blockContainer, "cueContainer", "cueEdit", "cueCodeMirror", "cueDisplay", cue)
    addEditor(blockContainer, "noteContainer", "noteEdit", "noteCodeMirror", "noteDisplay", note)


    // Create and setup buttons container
    var buttonContainer = document.createElement('div');
    buttonContainer.className = 'buttonContainer';
    buttonContainer.style.display = 'block';

    // Insert button
    var insertButton = document.createElement('button');
    insertButton.className = 'insertButton';
    insertButton.title = 'Insert block below';
    var insertIcon = document.createElement('i');
    insertIcon.className = 'fas fa-plus';
    insertButton.appendChild(insertIcon);
    insertButton.onclick = function () {
        var parentBlock = this.closest('.block');
        var newIndex = Array.from(blocksContainer.children).indexOf(parentBlock) + 1;
        insertBlock(newIndex);
    };

    // Remove button
    var removeButton = document.createElement('button');
    removeButton.className = 'removeButton';
    removeButton.title = 'Remove block';
    var removeIcon = document.createElement('i');
    removeIcon.className = 'fa fa-trash';
    removeButton.appendChild(removeIcon);
    removeButton.addEventListener('click', function () {
        var parentBlock = this.closest('.block');
        var index = Array.from(blocksContainer.children).indexOf(parentBlock);
        removeBlock(index);
    });

    // Drag button
    var dragButton = document.createElement('button');
    dragButton.className = 'dragButton';
    dragButton.title = 'Move block';
    var dragIcon = document.createElement('i');
    dragIcon.className = 'fas fa-arrows-alt';
    dragButton.appendChild(dragIcon);

    // Highlight button
    var highlightButton = document.createElement('button');
    highlightButton.className = 'highlightButton';
    highlightButton.title = 'Highlight block';
    var highlightIcon = document.createElement('i');
    highlightIcon.className = 'fas fa-highlighter';
    highlightButton.appendChild(highlightIcon);
    highlightButton.addEventListener('click', function () {
        if (blockContainer.style.backgroundColor === 'transparent') {
            blockContainer.style.backgroundColor = 'rgba(245, 236, 171, 0.3)';
        } else {
            blockContainer.style.backgroundColor = 'transparent';
        }
    });

    buttonContainer.appendChild(dragButton);
    buttonContainer.appendChild(highlightButton);
    buttonContainer.appendChild(insertButton);
    buttonContainer.appendChild(removeButton);

    blockContainer.appendChild(buttonContainer);

    // Determine where to insert the new block
    if (typeof index === 'number' && index >= 0 && index < blocksContainer.children.length) {
        blocksContainer.insertBefore(blockContainer, blocksContainer.children[index]);
    } else {
        blocksContainer.appendChild(blockContainer);
    }
}


function removeBlock(index) {
    const blocksContainer = document.getElementById('blocks');

    if (index >= 0 && index < blocksContainer.children.length) {
        blocksContainer.removeChild(blocksContainer.children[index]);
    }
}
