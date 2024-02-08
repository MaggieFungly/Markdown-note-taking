CodeMirror.defineMode("highlightCustomSyntax", function (config, parserConfig) {
    var customSyntaxOverlay = {
        token: function (stream, state) {
            if (stream.match("==")) { // Correctly match the starting ==
                var maybeEnd = false, ch;
                while ((ch = stream.next()) != null) {
                    if (ch == "=") {
                        if (stream.peek() == "=") { // Correctly check if the next character is also =
                            stream.next(); // Consume the second =
                            return "highlight-text"; // Return the CSS class to apply
                        }
                    }
                }
            }
            while (stream.next() != null && !stream.eol()) { }
            return null;
        }
    };
    return CodeMirror.overlayMode(CodeMirror.getMode(config, parserConfig.backdrop || "markdown"), customSyntaxOverlay);
});

function autoCloseEquals(cm) {
    cm.on("beforeChange", function (instance, change) {
        var selection = instance.getSelection();
        // Check if "=" is typed and there is a text selection
        if (change.text[0] === "=" && selection.length > 0) {
            // Prevent the default change
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