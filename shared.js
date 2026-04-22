/**
 * Shared navigation, footer, and search for all pages.
 * Every page lives one directory deep (home/, browse/, tensura/, etc.),
 * so the relative prefix to reach sibling folders is always "../".
 */
(function () {
  'use strict';

  var PREFIX = '../';
  var BROWSE_URL = PREFIX + 'browse/';
  var INDEX_URL = PREFIX + 'data/index.json';

  var NAV_ITEMS = [
    { page: 'home',   label: 'Home',   href: PREFIX + 'home/' },
    { page: 'browse', label: 'Browse', href: BROWSE_URL },
    { page: 'about',  label: 'About',  href: PREFIX + 'about/' },
    { page: 'faq',    label: 'FAQ',    href: PREFIX + 'faq/' },
  ];

  // --- Cached search index ---
  var searchIndex = null;

  function fetchSearchIndex() {
    if (searchIndex) return Promise.resolve(searchIndex);
    return fetch(INDEX_URL)
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (data) {
        searchIndex = Array.isArray(data) ? data : [];
        return searchIndex;
      })
      .catch(function () { searchIndex = []; return searchIndex; });
  }

  function matchesQuery(item, q) {
    var lower = q.toLowerCase();
    var title = item.title || {};
    if ((title.main || '').toLowerCase().includes(lower)) return true;
    var alt = Array.isArray(title.alt) ? title.alt : [];
    for (var i = 0; i < alt.length; i++) {
      if (alt[i].toLowerCase().includes(lower)) return true;
    }
    return false;
  }

  function escapeHtml(text) {
    return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /** Detect which nav item matches the current page path. */
  function detectActivePage() {
    var path = window.location.pathname.toLowerCase();
    if (path.includes('/home')) return 'home';
    if (path.includes('/browse'))    return 'browse';
    if (path.includes('/about'))     return 'about';
    if (path.includes('/faq'))       return 'faq';
    return '';
  }

  function initNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var activePage = detectActivePage();
    nav.innerHTML = NAV_ITEMS.map(function (item) {
      var cls = 'nav__link' + (item.page === activePage ? ' active' : '');
      return '<a class="' + cls + '" href="' + item.href + '">' + item.label + '</a>';
    }).join('\n');
  }

  function initFooter() {
    var footer = document.querySelector('.footer');
    if (!footer) return;

    footer.innerHTML =
      '<div class="container">' +
        '<div class="footer__content">' +
          '<div class="footer__section">' +
            '<h4>AniWatch Order</h4>' +
            '<p>An anime watch order site built with vanilla JS, HTML, CSS. Features dark/light themes, responsive design, infinite scroll.</p>' +
          '</div>' +
          '<div class="footer__section">' +
            '<h4>Links</h4>' +
            '<ul>' +
              '<li><a href="' + PREFIX + 'about/">About</a></li>' +
              '<li><a href="' + PREFIX + 'faq/">FAQ</a></li>' +
            '</ul>' +
          '</div>' +
          '<div class="footer__section">' +
            '<h4>Community</h4>' +
            '<ul>' +
                '<li><a href="https://github.com/Otaku-Save-Terra/anime-watch-order" target="_blank">Github</a></li>' +
                '<li><a href="https://www.reddit.com/r/AniWatchOrder/" target="_blank">Reddit</a></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="footer__bottom">' +
          '<p>Copyright &copy; ' + new Date().getFullYear() + ' Otaku-Save-Terra. All rights reserved.</p>' +
        '</div>' +
      '</div>';
  }

  // --- Search ---

  function navigateToBrowse(query) {
    var url = BROWSE_URL;
    if (query) url += '?q=' + encodeURIComponent(query);
    window.location.href = url;
  }

  var searchDebounceTimer = null;

  function initSearch() {
    var input = document.getElementById('searchInput');
    var btn = document.getElementById('searchButton');
    var suggestions = document.getElementById('searchSuggestions');
    if (!input) return;

    function doNavigate() {
      var q = input.value.trim();
      navigateToBrowse(q);
    }

    if (btn) {
      btn.addEventListener('click', doNavigate);
    }

    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') doNavigate();
    });

    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(searchDebounceTimer);
      if (q.length < 1) {
        if (suggestions) suggestions.classList.add('hidden');
        return;
      }
      searchDebounceTimer = setTimeout(function () {
        fetchSearchIndex().then(function (items) {
          var results = items.filter(function (it) { return matchesQuery(it, q); }).slice(0, 6);
          if (!suggestions) return;
          if (results.length === 0) {
            suggestions.classList.add('hidden');
            return;
          }
          suggestions.innerHTML = results.map(function (it) {
            return '<div class="suggestion-item" data-guid="' + escapeHtml(it.guid) + '">' +
              escapeHtml(it.title.main) + '</div>';
          }).join('');
          suggestions.classList.remove('hidden');
        });
      }, 200);
    });

    // Click on suggestion → go to browse with that query
    if (suggestions) {
      suggestions.addEventListener('click', function (e) {
        var item = e.target.closest('.suggestion-item');
        if (!item) return;
        var text = item.textContent.trim();
        input.value = text;
        suggestions.classList.add('hidden');
        navigateToBrowse(text);
      });
    }

    // Hide suggestions on outside click
    document.addEventListener('click', function (e) {
      if (suggestions && !input.contains(e.target) &&
          !suggestions.contains(e.target)) {
        suggestions.classList.add('hidden');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initFooter();
    initSearch();
  });
})();
