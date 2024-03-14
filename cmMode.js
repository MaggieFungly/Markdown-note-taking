const CodeMirror = require('codemirror/lib/codemirror');
require('codemirror/addon/mode/overlay');
require('codemirror/mode/markdown/markdown');
require('codemirror/addon/edit/closebrackets');
require('codemirror/addon/edit/continuelist');

CodeMirror.defineMode("enhancedMarkdown", function (config, parserConfig) {
    var customSyntaxOverlay = {
        startState: function () {
            return {
                inLaTeX: false,
                latexDelimiter: ""
            };
        },
        token: function (stream, state) {
            // If not currently in a LaTeX block, check for the start of one
            if (!state.inLaTeX) {
                if (stream.match("$$") || stream.match("$")) {
                    state.inLaTeX = true; // Enter LaTeX mode
                    state.latexDelimiter = stream.current(); // Remember the delimiter used to start LaTeX mode
                    return "comment"; // Apply initial LaTeX styling
                }
            } else {
                // Already in LaTeX mode, look for the closing delimiter
                while (!stream.eol()) {
                    stream.next(); // Move through the text
                    if (stream.match(state.latexDelimiter, false)) {
                        // Found the closing delimiter, consume it and exit LaTeX mode
                        stream.match(state.latexDelimiter);
                        state.inLaTeX = false; // Exit LaTeX mode
                        break; // Stop looking for the closing delimiter in this token
                    }
                }
                return "comment"; // Continue applying LaTeX styling
            }

            // Existing custom syntax highlighting logic for ==
            if (stream.match("==")) {
                while ((ch = stream.next()) != null) {
                    if (ch == "=" && stream.peek() == "=") {
                        stream.next(); // Consume the second =
                        break; // Exit the current highlighting loop
                    }
                }
                return "highlight-text"; // CSS class for highlighted text
            }

            while (stream.next() != null && !stream.eol()) {
                if (stream.match("==", false) || stream.match("$", false)) {
                    break;
                }
            }
            return null; // No specific highlighting for this token
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

function autoCloseDollars(codeMirrorEditor) {
    codeMirrorEditor.on("keypress", function (cm, event) {
        // Check if the pressed key is '$'
        if (event.key === "$") {
            event.preventDefault(); // Prevent the default action to manually handle the insertion

            const selectedText = cm.getSelection();
            const from = cm.getCursor("start"); // Get the start position of the selection
            const to = cm.getCursor("end"); // Get the end position of the selection

            if (selectedText.length === 0) {
                // If no text is selected, just insert $$
                cm.replaceSelection("$$");
                cm.setCursor(from.line, from.ch + 1); // Move the cursor back one position, between the $$
            } else {
                // If there is selected text, wrap it with $$
                cm.replaceSelection(`$${selectedText}$`);
                // Adjust 'to' position to account for the added $ at the start and end
                var newTo = { line: to.line, ch: to.ch + 2 }; // Assuming selection does not span multiple lines
                cm.setSelection(from, newTo); // Reselect the text including the new $$
            }
        }
    });
}


let activeCodeMirrorEditor = null;

function setUpImageInsertion(codeMirrorEditor) {
    codeMirrorEditor.on('focus', () => {
        activeCodeMirrorEditor = codeMirrorEditor;
    });

    codeMirrorEditor.on('paste', handlePasteEvent);

    codeMirrorEditor.on('drop', handleDropEvent);
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

function handleDropEvent(editor, event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    for (const file of files) {
        if (file.type.indexOf('image') !== -1) {
            processImageFile(file);
            break;
        }
    }
}

function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = function (loadEvent) {
        const base64Image = loadEvent.target.result;
        ipcRenderer.send('save-image', base64Image);
    };
    reader.readAsDataURL(file);
}

function insertImagePathIntoEditor(codeMirrorEditor, imagePath) {
    // Replace backslashes with forward slashes in the imagePath
    const normalizedImagePath = imagePath.replace(/\\/g, '/');
    const doc = codeMirrorEditor.getDoc();
    const imageMarkdown = `![Image](${normalizedImagePath})`; // Use the normalized path
    doc.replaceSelection(imageMarkdown);

    const endCursor = doc.getCursor(); // Get the new cursor position after insertion
    doc.setCursor({ line: endCursor.line, ch: endCursor.ch });

    setTimeout(() => {
        codeMirrorEditor.refresh();
    }, 100);
}

// Function to toggle bold formatting in Markdown
function toggleBold(editor) {
    var anchor = editor.getCursor('anchor'); // Start of the selection
    var head = editor.getCursor('head'); // End of the selection
    var doc = editor.getDoc();

    // Determine if the selection is backwards
    var isBackwards = (anchor.line > head.line) || (anchor.line === head.line && anchor.ch > head.ch);

    // Normalize start and end positions based on selection direction
    var startPos = isBackwards ? head : anchor;
    var endPos = isBackwards ? anchor : head;

    // Check for bold markers before and after the selection
    var startCheckPos = { line: startPos.line, ch: Math.max(0, startPos.ch - 2) };
    var endCheckPos = { line: endPos.line, ch: endPos.ch + 2 };
    var preText = doc.getRange(startCheckPos, startPos);
    var postText = doc.getRange(endPos, endCheckPos);

    var isBold = preText === '**' && postText === '**';

    if (isBold) {
        // Remove the bold syntax
        doc.replaceRange('', endPos, endCheckPos); // Remove ending **
        doc.replaceRange('', startCheckPos, startPos); // Remove starting **
        // Adjust cursor to select the text without the **, correctly handling backward selection
        doc.setSelection(
            isBackwards ? { line: endPos.line, ch: endPos.ch - 2 } : startCheckPos,
            isBackwards ? startCheckPos : { line: endPos.line, ch: endPos.ch - 2 }
        );
    } else {
        // Add the bold syntax
        doc.replaceRange('**', endPos); // Add ending **
        doc.replaceRange('**', startPos); // Add starting **
        // Adjust cursor to re-select the text without including the **, correctly handling backward selection
        if (isBackwards) {
            doc.setSelection(
                { line: endPos.line, ch: endPos.ch + 2 }, // New end cursor
                { line: startPos.line, ch: startPos.ch + 2 } // New start cursor, adjusted for added **
            );
        } else {
            doc.setSelection(
                { line: startPos.line, ch: startPos.ch + 2 }, // New start cursor
                { line: endPos.line, ch: endPos.ch + 2 } // New end cursor, adjusted for added **
            );
        }
    }

    editor.focus();
}


function toggleItalics(editor) {
    var anchor = editor.getCursor('anchor'); // Start of the selection
    var head = editor.getCursor('head'); // End of the selection
    var doc = editor.getDoc();

    // Determine if the selection is backwards
    var isBackwards = (anchor.line > head.line) || (anchor.line === head.line && anchor.ch > head.ch);

    // Normalize start and end positions based on selection direction
    var startPos = isBackwards ? head : anchor;
    var endPos = isBackwards ? anchor : head;

    // Check for bold markers before and after the selection
    var startCheckPos = { line: startPos.line, ch: Math.max(0, startPos.ch - 1) };
    var endCheckPos = { line: endPos.line, ch: endPos.ch + 1 };
    var preText = doc.getRange(
        { line: startPos.line, ch: Math.max(0, startPos.ch - 3) },
        startPos
    );
    var postText = doc.getRange(
        endPos, 
        { line: endPos.line, ch: endPos.ch + 3 },
    );

    var isItalics = ((preText.endsWith('*') && postText.startsWith('*')) && !(((preText.endsWith('**') && postText.startsWith('**'))))) || (preText.endsWith('***') && postText.startsWith('***'));

    if (isItalics) {
        // Remove the bold syntax
        doc.replaceRange('', endPos, endCheckPos); // Remove ending **
        doc.replaceRange('', startCheckPos, startPos); // Remove starting **
        // Adjust cursor to select the text without the **, correctly handling backward selection
        doc.setSelection(
            isBackwards ? { line: endPos.line, ch: endPos.ch - 1 } : startCheckPos,
            isBackwards ? startCheckPos : { line: endPos.line, ch: endPos.ch - 1 }
        );
    } else {
        // Add the bold syntax
        doc.replaceRange('*', endPos); // Add ending **
        doc.replaceRange('*', startPos); // Add starting **
        // Adjust cursor to re-select the text without including the **, correctly handling backward selection
        if (isBackwards) {
            doc.setSelection(
                { line: endPos.line, ch: endPos.ch + 1 }, // New end cursor
                { line: startPos.line, ch: startPos.ch + 1 } // New start cursor, adjusted for added **
            );
        } else {
            doc.setSelection(
                { line: startPos.line, ch: startPos.ch + 1 }, // New start cursor
                { line: endPos.line, ch: endPos.ch + 1 } // New end cursor, adjusted for added **
            );
        }
    }

    editor.focus();
}


function setUpCodeMirrorFromTextarea(editTextArea) {
    const codeMirrorEditor = CodeMirror.fromTextArea(editTextArea, {
        lineNumbers: false,
        theme: "default",
        mode: "enhancedMarkdown",
        backdrop: "markdown",
        // mode:"markdown",
        autoCloseBrackets: {
            pairs: "()[]{}''\"\"<>**``",
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
            "Ctrl-B": toggleBold,
            "Ctrl-I": toggleItalics,
        },
    });
    autoCloseEquals(codeMirrorEditor);
    autoCloseDollars(codeMirrorEditor);
    setUpImageInsertion(codeMirrorEditor);
    setUpLinkBlocks(codeMirrorEditor);

    return codeMirrorEditor;
}