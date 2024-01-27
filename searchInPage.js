// Initialize Mark.js on the content you want to search
const markInstance = new Mark(document.body);

// Function to perform search
function searchForTerm(term) {
    markInstance.unmark({
        done: function () {
            markInstance.mark(term, {
                separateWordSearch: true,
                done: function () {
                    // Optional: additional logic after search
                }
            });
        }
    });
}

// Event listener for search input
document.querySelector('#search-input').addEventListener('input', function () {
    searchForTerm(this.value);
});

// Navigation in search results
document.querySelector('#search-next').addEventListener('click', function () {
    markInstance.next();
});

document.querySelector('#search-prev').addEventListener('click', function () {
    markInstance.prev();
});

// Clear search highlights
document.querySelector('#search-close').addEventListener('click', function () {
    markInstance.unmark();
});