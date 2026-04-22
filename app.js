/**
 * Shared watch-order page logic.
 * Each series page (e.g. tensura/) sets `data-anime-guid` on <main>
 * and this script loads data/{guid}/info.json + order.json to render the page.
 */

(function () {
  'use strict';

  // --- Helpers ---

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(text) {
    return escapeHtml(text).replace(/'/g, '&#39;');
  }

  function resolveImagePath(path) {
    if (!path) return '';
    const clean = path.startsWith('/') ? path.slice(1) : path;
    return `../${clean}`;
  }

  // --- Data fetching ---

  function dataUrl(guid, file) {
    return `../data/${encodeURIComponent(guid)}/${file}`;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  // --- Rendering: series header ---

  function renderSeriesHeader(info) {
    const bannerEl = document.getElementById('seriesBanner');
    const coverEl = document.getElementById('seriesCover');
    const titleEl = document.getElementById('seriesTitle');
    const subtitleEl = document.getElementById('seriesSubtitle');
    const genresEl = document.getElementById('seriesGenres');

    if (bannerEl && info.banner) {
      bannerEl.style.backgroundImage = `url('${escapeAttr(resolveImagePath(info.banner))}')`;
    }

    if (coverEl && info.thumbnail) {
      coverEl.innerHTML = `<img src="${escapeAttr(resolveImagePath(info.thumbnail))}" alt="${escapeHtml(info.title?.main || '')}" onerror="this.style.display='none'">`;
    }

    if (titleEl) {
      titleEl.textContent = info.title?.main || 'Untitled';
    }

    if (subtitleEl) {
      const alt = Array.isArray(info.title?.alt) ? info.title.alt : [];
      subtitleEl.textContent = alt[0] || '';
      if (!subtitleEl.textContent) subtitleEl.style.display = 'none';
    }

    if (genresEl && Array.isArray(info.genre)) {
      genresEl.innerHTML = info.genre
        .map((g) => `<span class="genre-tag">${escapeHtml(g)}</span>`)
        .join('');
    }
  }

  // --- Cookie helpers for progress tracking ---

  function getProgressCookie() {
    try {
      const match = document.cookie.match(/(?:^|;\s*)aniwatch_progress=([^;]*)/);
      if (match) return JSON.parse(decodeURIComponent(match[1]));
    } catch (_) { /* ignore */ }
    return {};
  }

  function setProgressCookie(data) {
    try {
      const val = encodeURIComponent(JSON.stringify(data));
      document.cookie = `aniwatch_progress=${val};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    } catch (_) { /* ignore */ }
  }

  function entryKey(entry) {
    const t = (entry.title || '').trim();
    const s = entry.start?.episode ?? '';
    const e = entry.end?.episode ?? '';
    return `${t}|${s}-${e}`;
  }

  function getCheckedKeys(guid, tab) {
    const progress = getProgressCookie();
    return progress[`${guid}:${tab}`] || [];
  }

  function setCheckedKey(guid, tab, key, checked) {
    const progress = getProgressCookie();
    const storeKey = `${guid}:${tab}`;
    let keys = progress[storeKey] || [];
    if (checked && !keys.includes(key)) {
      keys.push(key);
    } else if (!checked) {
      keys = keys.filter((k) => k !== key);
    }
    progress[storeKey] = keys;
    setProgressCookie(progress);
  }

  // --- Rendering: order entries ---

  function formatEpisodeRange(entry) {
    const start = entry.start?.episode;
    const end = entry.end?.episode;
    const startTime = entry.start?.time;
    const endTime = entry.end?.time;

    const parts = [];
    if (start != null && end != null) {
      parts.push(start === end ? `Episode ${start}` : `Episodes ${start} - ${end}`);
    } else if (start != null) {
      parts.push(`Episode ${start}`);
    }

    if (startTime || endTime) {
      const timePart = startTime && endTime
        ? `${startTime} → ${endTime}`
        : startTime || endTime;
      parts.push(`(${timePart})`);
    }

    return parts.join(' ');
  }

  const TAG_CLASS_MAP = {
    main: 'watch-order-tag--main',
    ova: 'watch-order-tag--ova',
    oad: 'watch-order-tag--oad',
    movie: 'watch-order-tag--movie',
    special: 'watch-order-tag--special',
    ona: 'watch-order-tag--ona',
    'spin-off': 'watch-order-tag--spinoff',
    'blu-ray': 'watch-order-tag--bluray',
  };

  function tagClass(tag) {
    return TAG_CLASS_MAP[tag.toLowerCase()] || 'watch-order-tag--special';
  }

  function renderOrderEntries(entries, guid, tab) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return '<div class="watch-order-empty"><p>Coming soon.</p></div>';
    }

    const checkedKeys = guid && tab ? getCheckedKeys(guid, tab) : [];

    const toolbar = `
      <div class="watch-order-toolbar">
        <button class="btn btn--outline btn--sm watch-order-uncheck-all">
          <i class="fa-solid fa-rotate-left"></i>&nbsp; Uncheck All
        </button>
      </div>
    `;

    const rows = entries
      .map((entry, i) => {
        const title = escapeHtml(entry.title || 'Untitled');
        const episodes = formatEpisodeRange(entry);
        const tags = Array.isArray(entry.tag) ? entry.tag : [];
        const remarks = entry.remarks ? escapeHtml(entry.remarks) : '';
        const key = entryKey(entry);
        const isChecked = checkedKeys.includes(key);

        return `
          <div class="watch-order-entry${isChecked ? ' watch-order-entry--checked' : ''}">
            <label class="watch-order-checkbox" title="Mark as watched">
              <input type="checkbox" class="watch-order-checkbox__input" data-entry-key="${escapeAttr(key)}" ${isChecked ? 'checked' : ''}>
              <span class="watch-order-checkbox__box"></span>
            </label>
            <div class="watch-order-entry__number">${i + 1}</div>
            <div class="watch-order-entry__body">
              <h4 class="watch-order-entry__title">${title}</h4>
              ${tags.length ? `
                <div class="watch-order-entry__tags">
                  ${tags.map((t) => `<span class="watch-order-tag ${tagClass(t)}">${escapeHtml(t)}</span>`).join('')}
                </div>` : ''}
              ${episodes ? `<p class="watch-order-entry__episodes">${escapeHtml(episodes)}</p>` : ''}
              ${remarks ? `<p class="watch-order-entry__remarks"><strong>Remarks:</strong> ${remarks}</p>` : ''}
            </div>
          </div>
        `;
      })
      .join('');

    return toolbar + rows;
  }

  // --- Tab switching ---

  function initTabs(orderData, guid) {
    const tabs = document.querySelectorAll('[data-order-tab]');
    const content = document.getElementById('watchOrderContent');
    if (!tabs.length || !content) return;

    const orders = orderData?.orders || {};

    function activate(tabName) {
      tabs.forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-order-tab') === tabName);
      });
      content.innerHTML = renderOrderEntries(orders[tabName] || [], guid, tabName);
    }

    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        activate(btn.getAttribute('data-order-tab'));
      });
    });

    // Event delegation for checkboxes and uncheck-all
    content.addEventListener('click', (e) => {
      const uncheckBtn = e.target.closest('.watch-order-uncheck-all');
      if (uncheckBtn) {
        const activeTab = document.querySelector('[data-order-tab].active');
        const tabName = activeTab ? activeTab.getAttribute('data-order-tab') : 'recommended';
        // Clear cookie for this tab
        const progress = getProgressCookie();
        progress[`${guid}:${tabName}`] = [];
        setProgressCookie(progress);
        // Re-render
        activate(tabName);
      }
    });

    content.addEventListener('change', (e) => {
      const checkbox = e.target.closest('.watch-order-checkbox__input');
      if (!checkbox) return;
      const key = checkbox.getAttribute('data-entry-key');
      const activeTab = document.querySelector('[data-order-tab].active');
      const tabName = activeTab ? activeTab.getAttribute('data-order-tab') : 'recommended';
      const entry = checkbox.closest('.watch-order-entry');
      if (checkbox.checked) {
        entry?.classList.add('watch-order-entry--checked');
      } else {
        entry?.classList.remove('watch-order-entry--checked');
      }
      setCheckedKey(guid, tabName, key, checkbox.checked);
    });

    // Default to recommended
    activate('recommended');
  }

  // --- Theme (shared with home via localStorage key) ---

  function initTheme() {
    try {
      const raw = localStorage.getItem('aniclone_user');
      const user = raw ? JSON.parse(raw) : null;
      const theme = user?.preferences?.theme;
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-color-scheme', 'dark');
      } else if (theme === 'light') {
        document.documentElement.setAttribute('data-color-scheme', 'light');
      }
      updateThemeIcon(theme || 'auto');
    } catch (_) { /* ignore */ }
  }

  function updateThemeIcon(theme) {
    const lightIcon = document.querySelector('.theme-icon--light');
    const darkIcon = document.querySelector('.theme-icon--dark');
    if (theme === 'dark') {
      lightIcon?.classList.add('hidden');
      darkIcon?.classList.remove('hidden');
    } else {
      lightIcon?.classList.remove('hidden');
      darkIcon?.classList.add('hidden');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-color-scheme');
    const nextIsDark = current !== 'dark';
    try {
      const raw = localStorage.getItem('aniclone_user');
      const user = raw ? JSON.parse(raw) : { preferences: {} };
      user.preferences = { ...user.preferences, theme: nextIsDark ? 'dark' : 'light' };
      localStorage.setItem('aniclone_user', JSON.stringify(user));
    } catch (_) { /* ignore */ }

    document.documentElement.setAttribute('data-color-scheme', nextIsDark ? 'dark' : 'light');
    updateThemeIcon(nextIsDark ? 'dark' : 'light');
  }

  // --- Back to Top button ---

  function initBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    btn.title = 'Back to top';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Contributors ---

  function renderContributors(info) {
    const contributors = Array.isArray(info.contributors) ? info.contributors : [];
    if (!contributors.length) return;
    const content = document.getElementById('watchOrderContent');
    if (!content) return;
    const el = document.createElement('p');
    el.className = 'watch-order-contributors';
    el.innerHTML = `<strong>Contributors:</strong> ${contributors.map(c => escapeHtml(c)).join(', ')}`;
    content.parentElement.appendChild(el);
  }

  // --- Bootstrap ---

  async function init() {
    initTheme();
    initBackToTop();

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const mainEl = document.querySelector('[data-anime-guid]');
    const guid = mainEl?.getAttribute('data-anime-guid');
    if (!guid) {
      console.error('No data-anime-guid found on page.');
      return;
    }

    try {
      const [info, order] = await Promise.all([
        fetchJson(dataUrl(guid, 'info.json')),
        fetchJson(dataUrl(guid, 'order.json')),
      ]);

      renderSeriesHeader(info);
      initTabs(order, guid);
      renderContributors(info);
    } catch (err) {
      console.error('Failed to load watch order data:', err);
      const content = document.getElementById('watchOrderContent');
      if (content) {
        content.innerHTML = '<div class="error-message"><p>Could not load watch order data.</p></div>';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
