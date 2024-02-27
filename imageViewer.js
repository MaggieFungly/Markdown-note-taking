function initializeImageViewer(displayDiv) {
    if (displayDiv) {
        var images = displayDiv.querySelectorAll('img');
        images.forEach(function (image) {
            image.addEventListener('click', function () {
                // Initialize viewer for the clicked image
                var viewer = new Viewer(image, {
                    url: 'src' || 'data-original',
                    toolbar: {
                        zoomIn: 1,
                        zoomOut: 1,
                        oneToOne: 1,
                        reset: 1,
                        prev: 0, // Disabled because we're viewing a single image
                        play: {
                            show: 0, // Disabled because we're viewing a single image
                            size: 'large',
                        },
                        next: 0, // Disabled because we're viewing a single image
                        rotateLeft: 1,
                        rotateRight: 1,
                        flipHorizontal: 1,
                        flipVertical: 1,
                    },
                    viewed: function () {
                        viewer.zoomTo(1); // Use `viewer` directly
                    },
                    shown: function () {
                        console.log('Viewer is now shown');
                    },
                    hidden: function () {
                        console.log('Viewer is now hidden');
                        viewer.destroy(); // Correctly destroy the viewer instance
                    },
                    inline: false,
                    button: true, // Show the button to close the viewer
                    navbar: false, // Hide the navbar since we're only displaying one image at a time
                });
                viewer.show();
            });
        });
    }
}

module.exports.viewer = initializeImageViewer;
