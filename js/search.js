const originalNavbarHTML = document.getElementById('navbar').innerHTML;
function showSearchBar(event) {
    const navbar = document.getElementById('navbar');
    navbar.innerHTML = `
        <div id="search-bar">
            <button onclick="restoreNavbar()">Cancel</button>
            <input type="text" id="searchInput" placeholder="Search through our video catalog..." />
            <button onclick="submitSearch()"><b>Go</b></button>
        </div>
    `;
    document.getElementById('searchInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitSearch();
        }
    });
    document.getElementById('searchInput').focus();
}

function restoreNavbar() {
    document.getElementById('navbar').innerHTML = originalNavbarHTML;
}
function submitSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (query !== '') {
        window.open(`https://www.youtube.com/@dheirya/search?query=${encodeURIComponent(query)}`, '_blank');
        restoreNavbar();
    } else {
        alert("Please enter a search term.");
    }
}