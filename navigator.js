function displayNavigator() {

    clearContents();

    ipcRenderer.send('get-recent-files');
    ipcRenderer.send('get-to-do-items');
    ipcRenderer.send('clear-contents');

    // display navigator page
    navigatorDate();
    document.getElementById('editor-outline').style.display = 'none';
    document.getElementById('navigator').style.display = 'block';
}

ipcRenderer.on('recent-files', (event, files) => {
    setUpRecentFiles(files);
});

ipcRenderer.on('to-do-items', (event, blocks) => {
    setUpToDoItems(blocks);
});

function setUpToDoItems(blocks) {
    const toDoDiv = document.getElementById('todo-list');
    toDoDiv.innerHTML = '';

    blocks = blocks.slice(-10);

    blocks.forEach(block => {
        const todoItemDiv = document.createElement('div');
        todoItemDiv.className = 'nav-to-do';
        todoItemDiv.classList.add('nav-item')

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        if (block.checked === 'true'){
            checkbox.checked = true;
        }
        checkbox.disabled = true;

        const todoName = document.createElement('span');
        todoName.classList.add('nav-item-name');

        const fragment = document.createElement('div');
        fragment.innerHTML = getOutlineContents(block.note);
        todoName.textContent = fragment.querySelector('div').textContent.trim();

        todoName.addEventListener('click', function (event) {
            ipcRenderer.send('load-blocks', block.path);
        })

        todoItemDiv.appendChild(checkbox);
        todoItemDiv.appendChild(todoName);

        toDoDiv.appendChild(todoItemDiv);
    })
}

function setUpRecentFiles(files) {
    const recentlyOpened = document.getElementById('recent-file-list');
    recentlyOpened.innerHTML = '';

    files.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'recently-opened-file';
        fileDiv.classList.add('nav-item')

        const fileName = document.createElement('span')
        fileName.textContent = pathManagement.basename(file, '.json');
        fileName.className = 'recently-opened-file-name';
        fileName.classList.add('nav-item-name')

        fileName.addEventListener('click', function (event) {
            ipcRenderer.send('load-blocks', file)
        })

        fileDiv.appendChild(fileName);
        recentlyOpened.appendChild(fileDiv);
    })
}

function navigatorDate() {
    // Create a new Date object for the current date
    const now = new Date();
    // Specify options for toLocaleDateString() to format the date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    // Format the date
    const formattedDate = now.toLocaleDateString('en-US', options);
    // Set the content of the <span> element to the formatted date
    document.getElementById('date').textContent = formattedDate;
}