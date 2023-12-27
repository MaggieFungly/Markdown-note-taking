function showEdit(editDiv, displayDiv) {
    editDiv.style.display = 'block';
    displayDiv.style.display = 'none';
};

function showDisplay(editDiv, displayDiv) {

    MathJax.Hub.Config({
        tex2jax: { inlineMath: [["$", "$"], ["\\(", "\\)"]] }
    });
    text = editDiv.innerText;
    text = text.replace(/==([^=]*)==/g, "<mark>$1</mark>");
    displayDiv.innerHTML = marked.parse(text);
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, displayDiv]);
    hljs.highlightAll();
    editDiv.style.display = 'none';
    displayDiv.style.display = 'block';
};

function editFunction(editDiv, displayDiv) {
    // on blur
    editDiv.addEventListener('blur', function () {
        showDisplay(editDiv, displayDiv);
    });

    // paste
    editDiv.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = (e.originalEvent || e).clipboardData.getData('text/plain');
        document.execCommand('inserttext', false, text);
    });

    // prevent tab
    editDiv.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            // Insert a tab character
            document.execCommand('inserttext', false, '\t');
        }
    });

    // auto closing brackets
    editDiv.addEventListener('keydown', function (event) {
        const brackets = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "<": ">",
            "*": "*",
            "$": "$",
            "`": "`",
            '=': '=' // Handling for double equals
        };

        let key = event.key;

        if (brackets.hasOwnProperty(key)) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();

            if (key === '=' && selectedText === '') {
                // If '=' is pressed but there's no selection, do nothing special
                return;
            }

            event.preventDefault(); // Prevent the default action

            // Create the text to insert
            const openingChar = key;
            const closingChar = brackets[key];
            const newText = document.createTextNode(openingChar + selectedText + closingChar);

            // Replace the selection with the new text
            range.deleteContents();
            range.insertNode(newText);

            // Set the selection range
            if (selectedText) {
                range.setStart(newText, 1);
                range.setEnd(newText, 1 + selectedText.length);
            } else {
                // If there is no selected text, place the cursor inside the brackets
                const cursorPosition = openingChar.length;
                range.setStart(newText, cursorPosition);
                range.setEnd(newText, cursorPosition);
            }

            selection.removeAllRanges();
            selection.addRange(range);
        }
    });
};

function insertBlock(index, cue = '', note = '', highlighted = false) {
    var blocksContainer = document.getElementById('blocks');

    // Create a new container for the block
    var blockContainer = document.createElement('div');
    blockContainer.style.display = 'flex';
    blockContainer.style.backgroundColor = highlighted ? 'rgba(245, 236, 171, 0.3)' : 'transparent';
    blockContainer.className = 'block';

    // Create and setup cue editable area
    var cueEdit = document.createElement('div');
    cueEdit.className = 'cueEdit';
    cueEdit.contentEditable = 'plaintext-only';
    cueEdit.innerText = cue;
    cueEdit.style.display = 'block';

    var cueDisplay = document.createElement('div');
    cueDisplay.className = 'cueDisplay';
    cueDisplay.style.display = 'none';

    editFunction(cueEdit, cueDisplay);

    var cueButton = document.createElement('button');
    cueButton.className = 'cueButton';
    var cueDisplayIcon = document.createElement('i');
    cueDisplayIcon.className = 'fa fa-pencil-square-o';
    cueButton.appendChild(cueDisplayIcon);

    cueButton.addEventListener('click', function () {
        showEdit(cueEdit, cueDisplay);
    });

    // when right-click the cueDisplay, return to the edit mode
    cueDisplay.addEventListener('contextmenu', function (event){
        event.preventDefault();
        cueButton.click();
    })

    var cueContainer = document.createElement('div');
    cueContainer.className = 'cueContainer';
    cueContainer.appendChild(cueButton);
    cueContainer.appendChild(cueEdit);
    cueContainer.appendChild(cueDisplay);

    // Create and setup note editable area
    var noteEdit = document.createElement('div');
    noteEdit.className = 'noteEdit';
    noteEdit.contentEditable = 'plaintext-only';
    noteEdit.innerText = note;
    noteEdit.style.display = 'block';

    var noteDisplay = document.createElement('div');
    noteDisplay.className = 'noteDisplay';
    noteDisplay.style.display = 'none';

    editFunction(noteEdit, noteDisplay);

    var noteButton = document.createElement('button');
    noteButton.className = 'noteButton';
    var noteDisplayIcon = document.createElement('i');
    noteDisplayIcon.className = 'fa fa-pencil-square-o';
    noteButton.appendChild(noteDisplayIcon);

    noteButton.addEventListener('click', function () {
        showEdit(noteEdit, noteDisplay);
    });

    noteDisplay.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        noteButton.click();
    })

    var noteContainer = document.createElement('div');
    noteContainer.className = 'noteContainer';
    noteContainer.appendChild(noteButton);
    noteContainer.appendChild(noteEdit);
    noteContainer.appendChild(noteDisplay);

    // Create and setup buttons container
    var buttonContainer = document.createElement('div');
    buttonContainer.className = 'buttonContainer';
    buttonContainer.style.display = 'block';

    // Insert button
    var insertButton = document.createElement('button');
    insertButton.className = 'insertButton';
    var insertIcon = document.createElement('i');
    insertIcon.className = 'fa fa-plus';
    insertButton.appendChild(insertIcon);
    insertButton.onclick = function () {
        var parentBlock = this.closest('.block');
        var newIndex = Array.from(blocksContainer.children).indexOf(parentBlock) + 1;
        insertBlock(newIndex);
    };

    // Remove button
    var removeButton = document.createElement('button');
    removeButton.className = 'removeButton';
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
    dragButton.className = 'dragButton'
    var dragIcon = document.createElement('i');
    dragIcon.className = 'fa fa-arrows';
    dragButton.appendChild(dragIcon);

    // Highlight button
    var highlightButton = document.createElement('button');
    highlightButton.className = 'highlightButton'
    var highlightIcon = document.createElement('i');
    highlightIcon.className = 'fa fa-bookmark';
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

    blockContainer.appendChild(cueContainer);
    blockContainer.appendChild(noteContainer);
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
