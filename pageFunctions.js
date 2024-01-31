// Sortable
const Sortable = require("sortablejs");
document.addEventListener('DOMContentLoaded', () => {
    const returnButton = document.getElementById('return');
    returnButton.addEventListener('click', function () {
        ipcRenderer.send('load-index');
    });

    var sortable = new Sortable(document.querySelector('#blocks'), {
        handle: '.dragButton',
        animation: 300,
        multiDrag: true,
    });
});

// toggle reader mode
const toggleReader = document.getElementById("toggleReader");
toggleReader.addEventListener('click', toggleReaderMode);

function toggleReaderMode() {
    const cueContainers = document.querySelectorAll('.cueContainer');
    cueContainers.forEach(container => {
        const displayDiv = container.querySelector('.cueDisplay');
        const codeMirrorWrapper = container.querySelector('.CodeMirror');
        if (displayDiv && codeMirrorWrapper) {
            // Assuming the CodeMirror instance is the first CodeMirror object found in the wrapper
            const codeMirrorEditor = codeMirrorWrapper.CodeMirror || codeMirrorWrapper.querySelector('.CodeMirror').CodeMirror;
            const textValue = codeMirrorEditor.getValue();
            showDisplay(textValue, displayDiv, codeMirrorEditor);
        }
    });

    const noteContainers = document.querySelectorAll('.noteContainer');
    noteContainers.forEach(container => {
        const displayDiv = container.querySelector('.noteDisplay');
        const codeMirrorWrapper = container.querySelector('.CodeMirror');
        if (displayDiv && codeMirrorWrapper) {
            // Assuming the CodeMirror instance is the first CodeMirror object found in the wrapper
            const codeMirrorEditor = codeMirrorWrapper.CodeMirror || codeMirrorWrapper.querySelector('.CodeMirror').CodeMirror;
            const textValue = codeMirrorEditor.getValue();
            showDisplay(textValue, displayDiv, codeMirrorEditor);
        }
    });
}

// toggle edit mode
const toggleEdit = document.getElementById('toggleEdit')
toggleEdit.addEventListener('click', toggleEditMode);

function toggleEditMode() {
    const cueContainers = document.querySelectorAll('.cueContainer');
    cueContainers.forEach(container => {
        const displayDiv = container.querySelector('.cueDisplay');
        const codeMirrorWrapper = container.querySelector('.CodeMirror');
        if (displayDiv && codeMirrorWrapper) {
            const codeMirrorEditor = codeMirrorWrapper.CodeMirror || codeMirrorWrapper.querySelector('.CodeMirror').CodeMirror;
            showEdit(displayDiv, codeMirrorEditor);
        }
    });

    const noteContainers = document.querySelectorAll('.noteContainer');
    noteContainers.forEach(container => {
        const displayDiv = container.querySelector('.noteDisplay');
        const codeMirrorWrapper = container.querySelector('.CodeMirror');
        if (displayDiv && codeMirrorWrapper) {
            const codeMirrorEditor = codeMirrorWrapper.CodeMirror || codeMirrorWrapper.querySelector('.CodeMirror').CodeMirror;
            showEdit(displayDiv, codeMirrorEditor);
        }
    });
}