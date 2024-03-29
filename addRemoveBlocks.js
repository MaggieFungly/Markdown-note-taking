const { default: hljs } = require("highlight.js");
const { marked } = require("marked");
const shortid = require("shortid");
const { viewer } = require('./imageViewer');
const Split = require('split.js');

// Renders markdown to HTML with custom processing for highlights and internal links.
function renderText(textValue) {
    const highlightRegex = /==([^=]+)==/g;
    const linkBlockRegex = /\[\[([^\[\]]+)@([^\[\]]+)\]\]/g;

    // Process the textValue to handle custom syntax before markdown conversion.
    const processedText = textValue
        .replace(highlightRegex, '<span class="highlight-text">$1</span>')
        .replace(linkBlockRegex, (match, title, id) => {
            // Replace the custom syntax with an HTML link.
            return `<a class="internal-block" data-id="${id}">${title}</a>`;
        });

    // handle mermaid diagrams
    const renderer = new marked.Renderer();
    renderer.code = (code, language) => {
        if (language === "mermaid") {
            return `<div class="mermaid">${code}</div>`;
        } else {
            const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
            // Ensure the correct API call for syntax highlighting
            const highlighted = validLanguage !== 'plaintext'
                ? hljs.highlight(code, { language: validLanguage, ignoreIllegals: true }).value
                : hljs.highlightAuto(code).value; // Fallback to auto-highlighting if plaintext or unsupported language

            return `<pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>`;
        }
    };

    marked.setOptions({
        renderer,
    });

    // Convert the processed text to HTML.
    const html = marked(processedText);
    return html;
}

function handleDisplayDiv(displayDiv) {
    if (window.mermaid) {
        window.mermaid.init(undefined, displayDiv.querySelectorAll('.mermaid'));
    } else {
        console.error('Mermaid library is not loaded.');
    }

    // Handle math equations
    MathJax.typesetPromise([displayDiv]).then(() => {
        // Additional actions after typesetting, if necessary
    });
    viewer(displayDiv)
}


function showDisplay(textValue, displayDiv, codeMirrorEditor) {
    displayDiv.innerHTML = renderText(textValue);
    handleDisplayDiv(displayDiv)

    displayDiv.style.display = "block"; // Show the display div
    codeMirrorEditor.getWrapperElement().style.display = "none"; // Hide the editor
}


function showEdit(displayDiv, codeMirrorEditor) {
    codeMirrorEditor.getWrapperElement().style.display = "block";
    displayDiv.style.display = "none"; // Hide the display div

    codeMirrorEditor.focus();
}


function addEditor(blockContainer, editorDiv, textAreaClassName, displayDivClassName, text) {

    var editTextArea = document.createElement('textarea');
    editTextArea.className = textAreaClassName;
    editTextArea.style.display = 'block';
    editTextArea.style.whiteSpace = 'pre-wrap'; //important!
    editTextArea.textContent = text;
    editorDiv.appendChild(editTextArea);

    // codemirror config
    var codeMirrorEditor = setUpCodeMirrorFromTextarea(editTextArea);

    setTimeout(() => {
        codeMirrorEditor.refresh();
    }, 10);

    // default display
    codeMirrorEditor.getWrapperElement().style.display = "block";

    var displayDiv = document.createElement('div');
    editorDiv.appendChild(displayDiv);
    displayDiv.className = displayDivClassName;
    displayDiv.classList.add('displayDiv')
    displayDiv.style.display = 'none';


    // save data when there's a change
    codeMirrorEditor.on("change", function () {
        updateBlockData(blockContainer);
    });

    // Editor behavior
    codeMirrorEditor.on("blur", function () {
        const textValue = codeMirrorEditor.getValue();
        // when editor is not focused, display the div
        showDisplay(textValue, displayDiv, codeMirrorEditor);
    });

    // double click to edit
    displayDiv.addEventListener("contextmenu", function (event) {
        event.preventDefault();
        // Show the editor when right clicked
        showEdit(displayDiv, codeMirrorEditor);
    });

    return codeMirrorEditor;
}


function removeButtonConfig(removeButton, blocksContainer) {
    removeButton.className = 'removeButton';
    removeButton.title = 'Remove block';
    removeButton.classList.add('fa', 'fa-trash');

    removeButton.addEventListener('click', function () {
        var parentBlock = this.closest('.block');
        var index = Array.from(blocksContainer.children).indexOf(parentBlock);

        executeRemoveBlock(index);
    });
}


function insertButtonConfig(insertButton, blocksContainer) {
    insertButton.className = 'insertButton';
    insertButton.classList.add('fas', 'fa-plus');
    insertButton.title = 'Insert block below';

    insertButton.onclick = function () {
        var parentBlock = this.closest('.block');
        var newIndex = Array.from(blocksContainer.children).indexOf(parentBlock) + 1;

        executeInsertBlock(newIndex, { cue: '', note: '', highlighted: false, id: '' });
    };
}


function dragButtonConfig(dragButton) {
    dragButton.className = 'dragButton';
    dragButton.title = 'Move block';
    dragButton.classList.add('fa-solid', 'fa-ellipsis');
}


function highlightButtonConfig(highlightButton, blockContainer) {
    highlightButton.className = 'highlightButton';
    highlightButton.title = 'Highlight block';
    highlightButton.classList.add('fas', 'fa-highlighter');

    highlightButton.addEventListener('click', function () {
        if (blockContainer.classList.contains('highlighted-block')) {
            blockContainer.classList.remove('highlighted-block');
        } else {
            blockContainer.classList.add('highlighted-block');
        }
        // save data when highlighted
        updateBlockData(blockContainer);
    });
}


function linkGraphButtonConfig(button, id) {
    button.className = "linkGraphButton";
    button.classList.add('fa-solid', 'fa-diagram-project')
    button.title = 'Show linked graph'

    button.addEventListener('click', function () {
        ipcRenderer.send('get-linked-graph', id);
    })
}

function checkboxConfig(blockContainer, checkbox) {

    checkbox.className = 'to-do';

    checkbox.addEventListener('change', function () {
        if (checkbox.checked) {
            blockContainer.dataset.checked = true;
        } else {
            blockContainer.dataset.checked = false;
        }
        updateBlockData(blockContainer)
    })
}

function resizeHandleConfig(cueContainer, noteContainer) {

    let cues;
    let notes;

    const colSplit = Split([cueContainer, noteContainer], {
        // sizes: [cueRatio, noteRatio], // Initial size ratios (in percentages) of the two containers
        minSize: [0, 0], // Minimum size in pixels for each container
        gutterSize: 3, // Size of the gutter (handle) in pixels
        cursor: 'ew-resize', // Cursor type on hover over the gutter
        onDragStart: function () {
            cues = document.querySelectorAll('.cueContainer');
            notes = document.querySelectorAll('.noteContainer');
        },
        onDrag: function () {
            cues.forEach(cue => {
                cue.style.width = cueContainer.style.width;
            })
            notes.forEach(note => {
                note.style.width = noteContainer.style.width;
            })
        }
    });

    const cueDiv = document.querySelector('.cueContainer');
    const noteDiv = document.querySelector('noteContainer');

    if (cueDiv && noteDiv) {
        cueContainer.style.width = cueDiv.style.width;
        noteContainer.style.width = noteDiv.style.width;
    } else {
        colSplit.setSizes([20, 80])
    }
}

function buttonContainerHover(buttonContainer, blockContainer) {
    buttonContainer.addEventListener('mouseover', function () {
        blockContainer.classList.add('selected-block');
    })
    buttonContainer.addEventListener('mouseout', function () {
        blockContainer.classList.remove('selected-block');
    })
}


function insertBlock(index, block = { type: '', cue: '', note: '', highlighted: '', id: '' }) {
    const blocksContainer = document.getElementById('blocks');
    const outlineList = document.getElementById('outlineList');

    // Create a new container for the block
    var blockContainer = document.createElement('div');
    blockContainer.className = 'block';

    // hightlight block
    if (block.highlighted) {
        blockContainer.classList.add('highlighted-block');
    }

    // generate a uuid
    if (!block.id || block.id === '') {
        block.id = shortid.generate();
    }
    blockContainer.dataset.id = block.id;

    // block type
    if (!block.type || block.type === '') {
        block.type = 'note';
    }
    blockContainer.dataset.type = block.type;

    // create editors
    var cueContainer = document.createElement('cueContainer');
    cueContainer.classList.add('cueContainer');


    var noteContainer = document.createElement('noteContainer');
    noteContainer.classList.add('noteContainer');

    // create codemirror editors
    var cueCodeMirrorEditor = addEditor(blockContainer, cueContainer, "cueEdit", "cueDisplay", block.cue)
    var noteCodeMirrorEditor = addEditor(blockContainer, noteContainer, "noteEdit", "noteDisplay", block.note)

    // Create and setup buttons container
    var buttonContainer = document.createElement('div');
    buttonContainer.className = 'buttonContainer';
    buttonContainerHover(buttonContainer, blockContainer);

    // Insert button
    var insertButton = document.createElement('i');
    insertButtonConfig(insertButton, blocksContainer);

    // Remove button
    var removeButton = document.createElement('i');
    removeButtonConfig(removeButton, blocksContainer);

    // Drag button
    var dragButton = document.createElement('i');
    dragButtonConfig(dragButton);

    // Highlight button
    var highlightButton = document.createElement('i');
    highlightButtonConfig(highlightButton, blockContainer);

    var linkedGraphButton = document.createElement('i');
    linkGraphButtonConfig(linkedGraphButton, block.id);

    var followingButtonDiv = document.createElement('div');
    followingButtonDiv.className = 'following-button-div';

    followingButtonDiv.appendChild(linkedGraphButton);
    followingButtonDiv.appendChild(highlightButton);
    followingButtonDiv.appendChild(insertButton);
    followingButtonDiv.appendChild(removeButton);

    buttonContainer.appendChild(dragButton);
    buttonContainer.appendChild(followingButtonDiv)

    blockContainer.appendChild(cueContainer);
    blockContainer.appendChild(noteContainer);
    blockContainer.appendChild(buttonContainer);


    if (block.type === 'todo') {
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        blockContainer.dataset.checked = block.checked;

        if (block.checked === 'true') {
            checkbox.checked = true;
        }
        blockContainer.appendChild(checkbox);
        checkboxConfig(blockContainer, checkbox);
    }

    resizeHandleConfig(cueContainer, noteContainer);

    // ctrl + enter to insert new block below
    noteCodeMirrorEditor.on('keydown', function (instance, event) {
        // Check if Ctrl+Enter or Cmd+Enter is pressed
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault(); // Prevent default action of Enter key
            insertButton.click(); // Programmatically click the insertButton
            goToNextBlock(noteCodeMirrorEditor);
        }
    });
    cueCodeMirrorEditor.on('keydown', function (instance, event) {
        // Check if Ctrl+Enter or Cmd+Enter is pressed
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            insertButton.click();
            goToNextBlock(cueCodeMirrorEditor);
        }
    });

    var outlineItem = outlineConfig(noteCodeMirrorEditor, blockContainer, block);


    // Determine where to insert the new block
    if (typeof index === 'number' && index >= 0 && index < blocksContainer.children.length) {
        blocksContainer.insertBefore(blockContainer, blocksContainer.children[index]);
        outlineList.insertBefore(outlineItem, outlineList.children[index]);
    } else {
        blocksContainer.appendChild(blockContainer);
        outlineList.appendChild(outlineItem);
    }

    return blockContainer;
}


function removeBlock(index) {
    const blocksContainer = document.getElementById('blocks');
    const outlineList = document.getElementById('outlineList');

    if (index >= 0 && index < blocksContainer.children.length) {

        const removedBlockData = getBlockData(blocksContainer.children[index]);

        blocksContainer.removeChild(blocksContainer.children[index]);
        outlineList.removeChild(outlineList.children[index]);

        return removedBlockData;
    }
}


function outlineConfig(noteCodeMirrorEditor, blockContainer, block) {
    // create corresponding outline items
    var outlineItem = document.createElement('div');
    outlineItem.dataset.id = block.id;
    outlineItem.className = 'outlineItem';
    outlineItem.innerHTML = getOutlineContents(block.note);

    noteCodeMirrorEditor.on('change', function (instance) {
        var currentValue = instance.getValue();
        outlineItem.innerHTML = getOutlineContents(currentValue);
    });

    scrollToBlock(outlineItem, blockContainer)

    return outlineItem;
}

function getOutlineContents(markdownText) {
    const fragment = document.createElement('div');
    fragment.innerHTML = renderText(markdownText); // Transform Markdown into HTML

    // Select all heading elements within the fragment
    const headings = fragment.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let htmlOutput = document.createElement('div');

    headings.forEach(heading => {
        // Extract the heading level from the tag name
        const level = parseInt(heading.tagName.substring(1));

        const headingDiv = document.createElement('div');
        headingDiv.textContent = heading.textContent
        headingDiv.className = `heading-level-${level}`
        htmlOutput.appendChild(headingDiv);
    });
    return htmlOutput.innerHTML;
}

function scrollToBlock(outlineItem, blockContainer) {
    outlineItem.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        document.getElementById('editorContainer').scroll({
            top: blockContainer?.offsetTop - 5,
            behavior: 'smooth',
            block: 'start',
        })
    })
}

function executeInsertBlock(index, block) {
    // Perform the insertion
    insertBlock(index, block);
    saveBlocksData();
}

function executeRemoveBlock(index) {
    // Perform the removal
    const block = removeBlock(index);
    saveBlocksData();

    history.push({ type: 'remove', index: index, block: block });
    redoStack = []; // Clear redo stack on new action
    updateUndoRedoStates();
}

function setUpBlockInsertion() {
    const start = document.getElementById('startButton');
    start.addEventListener('click', function () {
        executeInsertBlock(0, { cue: '', note: '', highlighted: '', id: '' })
    })
}

function goToNextBlock(codeMirrorEditor) {
    var nextBlock = codeMirrorEditor.getWrapperElement().closest('.block').nextElementSibling;
    if (nextBlock) {
        var nextNoteContainer = nextBlock.querySelector('.noteContainer');
        if (nextNoteContainer) {
            var nextCodeMirror = nextNoteContainer.querySelector('.CodeMirror');
            if (nextCodeMirror) {
                var cmInstance = nextCodeMirror.CodeMirror;
                cmInstance.focus(); // Focus on the next CodeMirror instance
                cmInstance.setCursor({ line: 0, ch: 0 }); // Set cursor at the beginning
            }
        }
    }
}

module.exports.renderText = renderText;
module.exports.handleDisplayDiv = handleDisplayDiv;