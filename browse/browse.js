(function () {
  'use strict';

  const ITEMS_PER_PAGE = 20;
  let allModels = [];
  let displayModels = [];
  let currentPage = 1;
  let activeQuery = '';

  function totalPages() {
    return Math.max(1, Math.ceil(displayModels.length / ITEMS_PER_PAGE));
  }

  function escapeHtml(t) {
    return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function matchesQuery(item, q) {
    const lower = q.toLowerCase();
    const title = item.title || {};
    if ((title.main || '').toLowerCase().includes(lower)) return true;
    const alt = Array.isArray(title.alt) ? title.alt : [];
    return alt.some((a) => a.toLowerCase().includes(lower));
  }

  function getQueryParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  }

  function applySearch(query) {
    activeQuery = query.trim();
    if (activeQuery) {
      displayModels = allModels.filter((m) => matchesQuery(m, activeQuery));
    } else {
      displayModels = allModels;
    }
    updateSearchHeader();
    renderPage(1);
  }

  function updateSearchHeader() {
    const header = document.getElementById('browseHeader');
    const subtitle = document.getElementById('browseSubtitle');
    if (!header || !subtitle) return;

    if (activeQuery) {
      header.textContent = 'Search Results';
      subtitle.innerHTML = 'Showing results for "<strong>' + escapeHtml(activeQuery) +
        '</strong>" (' + displayModels.length + ' found) &mdash; ' +
        '<a href="index.html" class="browse-clear-search">Clear search</a>';
    } else {
      header.textContent = 'Browse Anime';
      subtitle.textContent = 'Explore all available anime watch orders';
    }
  }

  function renderPage(page) {
    const grid = document.getElementById('browseGrid');
    const pagination = document.getElementById('browsePagination');
    if (!grid) return;

    currentPage = Math.max(1, Math.min(page, totalPages()));
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageModels = displayModels.slice(start, start + ITEMS_PER_PAGE);

    if (pageModels.length === 0) {
      grid.innerHTML = activeQuery
        ? '<p class="error-message">No anime matched your search.</p>'
        : '<p class="error-message">No anime found.</p>';
      if (pagination) pagination.innerHTML = '';
      return;
    }

    grid.innerHTML = pageModels.map((m) => createHomeAnimeCard(m)).join('');
    attachHomeCatalogCardListeners(grid);

    if (pagination) {
      pagination.innerHTML = buildPagination(currentPage, totalPages());
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildPagination(current, total) {
    if (total <= 1) return '';

    const parts = [];

    parts.push(
      `<button class="browse-pagination__btn" ${current === 1 ? 'disabled' : ''} data-page="${current - 1}">&laquo; Prev</button>`
    );

    const pages = getPaginationRange(current, total);
    for (const p of pages) {
      if (p === '...') {
        parts.push('<span class="browse-pagination__ellipsis">&hellip;</span>');
      } else {
        const active = p === current ? ' browse-pagination__btn--active' : '';
        parts.push(
          `<button class="browse-pagination__btn${active}" data-page="${p}">${p}</button>`
        );
      }
    }

    parts.push(
      `<button class="browse-pagination__btn" ${current === total ? 'disabled' : ''} data-page="${current + 1}">Next &raquo;</button>`
    );

    return parts.join('');
  }

  function getPaginationRange(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set([1, 2, current - 1, current, current + 1, total - 1, total]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        result.push('...');
      }
      result.push(sorted[i]);
    }
    return result;
  }

  async function init() {
    const grid = document.getElementById('browseGrid');
    if (!grid) return;

    grid.innerHTML = Array(6).fill(0).map(() => createHomeSkeletonCard()).join('');

    try {
      allModels = await fetchIndexCatalogModels();
      allModels.forEach((m) => {
        if (m.guid) homeCatalogByGuid.set(m.guid, m);
      });

      const q = getQueryParam();
      // Pre-fill the search input if there's a query
      const searchInput = document.getElementById('searchInput');
      if (q && searchInput) searchInput.value = q;

      applySearch(q);
    } catch (err) {
      console.error('Browse catalog load failed:', err);
      grid.innerHTML = '<div class="error-message"><p>Could not load the series list.</p></div>';
    }

    // Pagination click handler (event delegation)
    const pagination = document.getElementById('browsePagination');
    if (pagination) {
      pagination.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-page]');
        if (!btn || btn.disabled) return;
        const page = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(page)) renderPage(page);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();