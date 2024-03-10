const CodeMirror = require('codemirror/lib/codemirror');
require('codemirror/addon/mode/overlay');
require('codemirror/mode/markdown/markdown');
require('codemirror/addon/edit/closebrackets');
require('codemirror/addon/edit/continuelist');

CodeMirror.defineMode("highlightCustomSyntax", function (config, parserConfig) {
    var customSyntaxOverlay = {
        token: function (stream, state) {
            if (stream.match("==")) {
                while ((ch = stream.next()) != null) {
                    if (ch == "=" && stream.peek() == "=") {
                        stream.next(); // Consume the second =
                        // After highlighting, return to look for more pairs in the same line
                        break; // Exit the current highlighting loop to allow looking for the next ==
                    }
                }
                return "highlight-text"; // Return the CSS class to apply for highlighted text
            }
            // If no == is found at the current stream position, skip to the next space or end of line
            while (stream.next() != null && !stream.eol()) {
                if (stream.match("==", false)) {
                    // Found another ==, break to allow the token function to handle it
                    break;
                }
            }
            return null; // Return null if no highlighting is to be applied
        }
    };
    return CodeMirror.overlayMode(CodeMirror.getMode(config, parserConfig.backdrop || "markdown"), customSyntaxOverlay);
});


function autoCloseEquals(cm) {
    cm.on("beforeChange", function (instance, change) {
        var selection = instance.getSelection();
        // Check if "=" is typed and there is a text selection
        if (change.text[0] === "=" && selection.length > 0) {

            change.cancel();
            // Calculate new selection positions
            var from = instance.getCursor("start");
            var to = instance.getCursor("end");

            // Wrap the selected text with "=" and replace the selection
            var wrappedText = "=" + selection + "=";
            instance.replaceSelection(wrappedText, "around");

            // Adjust selection to include the new "=" signs
            instance.setSelection(from, { line: to.line, ch: to.ch + 2 });
        }
    });
}

let activeCodeMirrorEditor = null;

function setupCodeMirrorEditorWithImagePasteHandling(codeMirrorEditor) {
    codeMirrorEditor.on('focus', () => {
        activeCodeMirrorEditor = codeMirrorEditor;
    });

    codeMirrorEditor.on('paste', handlePasteEvent);
}

// Adjust the ipcRenderer listener to respond within the context of this setup function
ipcRenderer.on('image-saved', (event, imagePath) => {
    insertImagePathIntoEditor(activeCodeMirrorEditor, imagePath);
});


function handlePasteEvent(codeMirrorInstance, event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            const reader = new FileReader();

            reader.onload = function (loadEvent) {
                const base64Image = loadEvent.target.result;
                ipcRenderer.send('save-image', base64Image);
            };

            reader.readAsDataURL(file);
            break;
        }
    }
}

function insertImagePathIntoEditor(codeMirrorEditor, imagePath) {
    // Replace backslashes with forward slashes in the imagePath
    const normalizedImagePath = imagePath.replace(/\\/g, '/');
    const doc = codeMirrorEditor.getDoc();
    const imageMarkdown = `![Image](${normalizedImagePath})`; // Use the normalized path
    doc.replaceSelection(imageMarkdown);

    const endCursor = doc.getCursor(); // Get the new cursor position after insertion
    doc.setCursor({ line: endCursor.line, ch: endCursor.ch });
}

function setUpCodeMirrorFromTextarea(editTextArea) {
    const codeMirrorEditor = CodeMirror.fromTextArea(editTextArea, {
        lineNumbers: false,
        theme: "default",
        mode: "highlightCustomSyntax",
        backdrop: "markdown",
        // mode:"markdown",
        autoCloseBrackets: {
            pairs: "()[]{}''\"\"<>**$$``",
            closeBefore: ")]}'\":;>",
            triples: "``",
            explode: "[]{}",
            override: true,
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
    });
    autoCloseEquals(codeMirrorEditor);
    setupCodeMirrorEditorWithImagePasteHandling(codeMirrorEditor);
    setUpLinkBlocks(codeMirrorEditor);

    return codeMirrorEditor;
}