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
    editDiv.style.display = 'none';
    displayDiv.style.display = 'block';
};

function editFunction(editDiv, displayDiv) {
    editDiv.addEventListener('blur', function () {
        showDisplay(editDiv, displayDiv);
    });

    editDiv.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = (e.originalEvent || e).clipboardData.getData('text/plain');
        document.execCommand('inserttext', false, text);
    });
    editDiv.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            // Insert a tab character
            document.execCommand('inserttext', false, '\t');
        }
    });
};

function insertBlock(button) {
    // Create a new container for the block
    var blockContainer = document.createElement('div');
    blockContainer.style.display = 'flex';
    blockContainer.className = 'block';

    // cue
    var cueEdit = document.createElement('div');
    cueEdit.className = 'cueEdit';
    cueEdit.contentEditable = 'true';
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

    var cueContainer = document.createElement('div');
    cueContainer.className = 'cueContainer';
    cueContainer.appendChild(cueButton);
    cueContainer.appendChild(cueEdit);
    cueContainer.appendChild(cueDisplay);

    // note
    var noteEdit = document.createElement('div');
    noteEdit.className = 'noteEdit';
    noteEdit.contentEditable = 'true';
    noteEdit.style.display = 'block';

    var noteDisplay = document.createElement('div');
    noteDisplay.className = 'noteDisplay';
    noteDisplay.style.display = 'none';

    editFunction(noteEdit, noteDisplay);

    var noteButton = document.createElement('button');
    noteButton.className = 'noteButton';

    var noteDisplayIcon = document.createElement('i');
    noteDisplayIcon.className = 'fa fa-pencil-square-o';
    noteButton.appendChild(noteDisplayIcon)

    noteButton.addEventListener('click', function (){ 
        showEdit(noteEdit, noteDisplay);
    })

    var noteContainer = document.createElement('div');
    noteContainer.className = 'noteContainer';
    noteContainer.appendChild(noteButton);
    noteContainer.appendChild(noteEdit);
    noteContainer.appendChild(noteDisplay);

    var buttonContainer = document.createElement('div');
    buttonContainer.className = 'buttonContainer';
    buttonContainer.style.display = 'block';

    var insertButton = document.createElement('button');
    insertButton.className = 'insertButton' ;
    insertIcon = document.createElement('i');
    insertIcon.className = 'fa fa-plus';
    insertButton.appendChild(insertIcon);
    insertButton.onclick = function () {
        insertBlock(this);
    };

    var removeButton = document.createElement('button');
    removeButton.className = 'removeButton';
    removeIcon = document.createElement('i');
    removeIcon.className = 'fa fa-trash';
    removeButton.appendChild(removeIcon);
    removeButton.onclick = function () {
        removeBlock(this);
    };

    var dragButton = document.createElement('button');
    dragButton.className = 'dragButton'
    dragIcon = document.createElement('i');
    dragIcon.className = 'fa fa-arrows';
    dragButton.appendChild(dragIcon);

    buttonContainer.appendChild(insertButton);
    buttonContainer.appendChild(removeButton);
    buttonContainer.appendChild(dragButton);
    
    blockContainer.appendChild(cueContainer);
    blockContainer.appendChild(noteContainer);
    blockContainer.appendChild(buttonContainer);

    var isInBlocksContainer = button.closest('#blocks') !== null;

    if (isInBlocksContainer) {
        button.parentNode.parentNode.parentNode.insertBefore(blockContainer, button.parentNode.parentNode.nextSibling);
    } else {
        // Insert as the first one in the #blocks container
        insertIndex = 0;
        document.getElementById('blocks').insertBefore(blockContainer, document.getElementById('blocks').children[insertIndex]);
    }

};

function removeBlock(button) {
    button.parentNode.parentNode.remove();
};
