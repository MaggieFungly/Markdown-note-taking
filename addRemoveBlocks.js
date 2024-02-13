function showDisplay(textValue, displayDiv, codeMirrorEditor) {
    // Process for custom highlighting syntax
    const processedText = textValue.replace(/==([^=]+)==/g, '<span class="highlight-text">$1</span>');

    // Render Markdown
    displayDiv.innerHTML = marked.parse(processedText);

    // Handle math equations
    MathJax.typesetPromise([displayDiv]).then(() => {
        // Additional actions after typesetting, if necessary
    });

    displayDiv.style.display = "block"; // Show the display div
    codeMirrorEditor.getWrapperElement().style.display = "none"; // Hide the editor
}

function showEdit(displayDiv, codeMirrorEditor) {
    codeMirrorEditor.getWrapperElement().style.display = "block";
    displayDiv.style.display = "none"; // Hide the display div
}

function addEditor(blockContainer, editorClassName, textAreaClassName, codeMirrorClassName, displayDivClassName, text) {
    var editorDiv = document.createElement('div');
    // classnames: cueContainer, noteContainer
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
        theme: "default",
        mode: "highlightCustomSyntax",
        backdrop: "markdown",
        autoCloseBrackets: {
            pairs: "()[]{}''\"\"<>**$$",
            closeBefore: ")]}'\":;>",
            triples: "",
            explode: "[]{}"
        },
        autoCloseTags: true,
        smartIndent: true,
        indentUnit: 4,
        lineWrapping: true,
        indentWithTabs: true,
        showCursorWhenSelecting: true,
        continuedList: true,
        highlightFormatting: true,
        extraKeys: {
            "Enter": "newlineAndIndentContinueMarkdownList",
        },
        override: true,
    });

    autoCloseEquals(codeMirrorEditor);
    setupCodeMirrorEditorWithImagePasteHandling(codeMirrorEditor);

    setTimeout(() => {
        codeMirrorEditor.refresh();
    }, 0);

    codeMirrorEditor.on("change", function () {
        updateBlocksData();
        // save data when there's a change
        saveBlocksData();
    });

    // default display
    codeMirrorEditor.getWrapperElement().style.display = "block";

    var displayDiv = document.createElement('div');
    editorDiv.appendChild(displayDiv);
    displayDiv.className = displayDivClassName;
    displayDiv.style.display = 'none';

    // Editor behavior
    codeMirrorEditor.on("blur", function () {
        textValue = codeMirrorEditor.getValue()
        // when editor is not focused, display the div
        showDisplay(textValue, displayDiv, codeMirrorEditor)
    });

    // double click to edit
    displayDiv.addEventListener("contextmenu", function (event) {
        event.preventDefault();
        // Show the editor when right clicked
        showEdit(displayDiv, codeMirrorEditor)
    });

    return codeMirrorEditor;
}

function removeButtonConfig(removeButton, blocksContainer) {
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
}

function insertButtonConfig(insertButton, blocksContainer) {
    insertButton.className = 'insertButton';
    insertButton.title = 'Insert block below';

    // insert icon
    var insertIcon = document.createElement('i');
    insertIcon.className = 'fas fa-plus';
    insertButton.appendChild(insertIcon);

    insertButton.onclick = function () {
        var parentBlock = this.closest('.block');
        var newIndex = Array.from(blocksContainer.children).indexOf(parentBlock) + 1;
        insertBlock(newIndex);
    };
}

function dragButtonConfig(dragButton) {
    dragButton.className = 'dragButton';
    dragButton.title = 'Move block';
    var dragIcon = document.createElement('i');
    dragIcon.className = 'fas fa-arrows-alt';
    dragButton.appendChild(dragIcon);
}

function highlightButtonConfig(highlightButton, blockContainer) {
    highlightButton.className = 'highlightButton';
    highlightButton.title = 'Highlight block';
    var highlightIcon = document.createElement('i');
    highlightIcon.className = 'fas fa-highlighter';
    highlightButton.appendChild(highlightIcon);
    highlightButton.addEventListener('click', function () {
        if (blockContainer.classList.contains('highlighted-block')) {
            blockContainer.classList.remove('highlighted-block');
        } else {
            blockContainer.classList.add('highlighted-block');
        }
    });
}

function insertBlock(index, cue = '', note = '', highlighted = false, id = '') {
    const blocksContainer = document.getElementById('blocks');
    const outlineList = document.getElementById('outlineList');

    // Create a new container for the block
    var blockContainer = document.createElement('div');
    blockContainer.style.display = 'flex';
    blockContainer.className = 'block';

    if (highlighted) {
        blockContainer.classList.add('highlighted-block');
    }

    // generate a uuid
    if (!id || id === '') {
        id = uuid.v4();
    }
    blockContainer.dataset.id = id;

    // create codemirror editors
    var cueCodeMirrorEditor = addEditor(blockContainer, "cueContainer", "cueEdit", "cueCodeMirror", "cueDisplay", cue)
    var noteCodeMirrorEditor = addEditor(blockContainer, "noteContainer", "noteEdit", "noteCodeMirror", "noteDisplay", note)

    // Create and setup buttons container
    var buttonContainer = document.createElement('div');
    buttonContainer.className = 'buttonContainer';
    buttonContainer.style.display = 'block';

    // Insert button
    var insertButton = document.createElement('button');
    insertButtonConfig(insertButton, blocksContainer);

    // Remove button
    var removeButton = document.createElement('button');
    removeButtonConfig(removeButton, blocksContainer);

    // Drag button
    var dragButton = document.createElement('button');
    dragButtonConfig(dragButton);

    // Highlight button
    var highlightButton = document.createElement('button');
    highlightButtonConfig(highlightButton, blockContainer);

    buttonContainer.appendChild(dragButton);
    buttonContainer.appendChild(highlightButton);
    buttonContainer.appendChild(insertButton);
    buttonContainer.appendChild(removeButton);

    blockContainer.appendChild(buttonContainer);

    // create corresponding outline items
    var outlineItem = document.createElement('div');
    outlineItem.dataset.id = id;
    outlineItem.className = 'outlineItem';
    outlineItem.innerText = findFirstLineOfText(note);

    noteCodeMirrorEditor.on('change', function (instance) {
        var currentValue = instance.getValue();
        var firstLine = findFirstLineOfText(currentValue);
        outlineItem.innerText = firstLine;
    });

    outlineItem.addEventListener('click', function (event) {
        event.preventDefault(); 
        event.stopPropagation();
        blockContainer.scrollIntoView({
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'start',
        })
        console.log('scrolled into view')
    })


    // Determine where to insert the new block
    if (typeof index === 'number' && index >= 0 && index < blocksContainer.children.length) {
        blocksContainer.insertBefore(blockContainer, blocksContainer.children[index]);
        outlineList.insertBefore(outlineItem, outlineList.children[index]);
    } else {
        blocksContainer.appendChild(blockContainer);
        outlineList.appendChild(outlineItem);
    }
}


function removeBlock(index) {
    const blocksContainer = document.getElementById('blocks');
    const outlineList = document.getElementById('outlineList');

    if (index >= 0 && index < blocksContainer.children.length) {
        blocksContainer.removeChild(blocksContainer.children[index]);
        outlineList.removeChild(outlineList.children[index]);
    }
}

function findFirstLineOfText(markdownText) {
    const lines = markdownText.split('\n');

    for (let line of lines) {
        if (line.trim() !== '') {
            const html = marked.parse(line);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const content = tempDiv.textContent.trim();
            const words = content.split(' ');

            if (words.length > 20) {
                return words.slice(0, 20).join(' ') + '...';
            } else {
                return content;
            }
        }
    }
    return '';
}



