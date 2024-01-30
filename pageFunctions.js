const Sortable = require("sortablejs");
document.addEventListener('DOMContentLoaded', () => {
    const returnButton = document.getElementById('return');
    returnButton.addEventListener('click', function () {
        ipcRenderer.send('load-index');
    });

    var sortable = new Sortable(document.querySelector('#blocks'), {
        handle: '.dragButton',
        animation: 300,
    });
});