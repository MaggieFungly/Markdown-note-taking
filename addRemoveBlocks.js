const { default: hljs } = require("highlight.js");
const { marked } = require("marked");
const shortid = require("shortid");
const { viewer } = require('./imageViewer');

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

    // codemirror config
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
    setUpLinkBlocks(codeMirrorEditor);

    setTimeout(() => {
        codeMirrorEditor.refresh();
    }, 0);

    // default display
    codeMirrorEditor.getWrapperElement().style.display = "block";

    var displayDiv = document.createElement('div');
    editorDiv.appendChild(displayDiv);
    displayDiv.className = displayDivClassName;
    displayDiv.classList.add('displayDiv')
    displayDiv.style.display = 'none';


    // save data when there's a change
    codeMirrorEditor.on("change", function () {
        updateBlocksData();
        saveBlocksData();
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
        id = shortid.generate();
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
    outlineItem.innerHTML = getOutlineContents(note);

    noteCodeMirrorEditor.on('change', function (instance) {
        var currentValue = instance.getValue();
        outlineItem.innerHTML = getOutlineContents(currentValue);
    });


    scrollToBlock(outlineItem, blockContainer)

    // ctrl + enter to insert new block below
    noteCodeMirrorEditor.on('keydown', function (instance, event) {
        // Check if Ctrl+Enter or Cmd+Enter is pressed
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault(); // Prevent default action of Enter key
            insertButton.click(); // Programmatically click the insertButton
        }
    });
    cueCodeMirrorEditor.on('keydown', function (instance, event) {
        // Check if Ctrl+Enter or Cmd+Enter is pressed
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault(); // Prevent default action of Enter key
            insertButton.click(); // Programmatically click the insertButton
        }
    });


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
        blockContainer.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start',
        })
    })
}

function setUpBlockInsertion() {
    const start = document.getElementById('startButton');
    start.addEventListener('click', function () {
        insertBlock(0);
    })
}

module.exports.renderText = renderText;
module.exports.handleDisplayDiv = handleDisplayDiv;