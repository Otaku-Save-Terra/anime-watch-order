/**
 * Parsed entry from `data/index.json` (site catalog).
 * @typedef {Object} SeriesIndexModel
 * @property {string} guid - Folder slug, e.g. "tensura"
 * @property {{ main: string, alt: string[] }} title
 * @property {string} thumbnail - Site-root path, e.g. "/images/foo.jpg"
 */

const INDEX_JSON_URL = '../data/index.json';
const HOME_MODAL_ID = 'animeModal';
const HOME_MODAL_DETAILS_ID = 'animeDetails';
const homeCatalogByGuid = new Map();

/**
 * @returns {Promise<SeriesIndexModel[]>}
 */
async function fetchIndexCatalogModels() {
    const res = await fetch(INDEX_JSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    return indexJsonToModels(raw);
  }

/**
 * @param {unknown} raw - Response JSON from index.json
 * @returns {SeriesIndexModel[]}
 */
function indexJsonToModels(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const titleObj = row && typeof row.title === 'object' && row.title ? row.title : {};
    const alt = Array.isArray(titleObj.alt) ? titleObj.alt.map(String) : [];
    return {
      guid: row && row.guid != null ? String(row.guid) : '',
      title: {
        main: titleObj.main != null ? String(titleObj.main) : 'Untitled',
        alt,
      },
      thumbnail: row && typeof row.thumbnail === 'string' ? row.thumbnail : '',
    };
  });
}

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

function resolveThumbnailFromHome(thumbnail) {
  if (!thumbnail) return '';
  const path = thumbnail.startsWith('/') ? thumbnail.slice(1) : thumbnail;
  return `../${path}`;
}

const GENRE_COLOR_COUNT = 8;
function genreColorIndex(genre) {
  let hash = 0;
  for (let i = 0; i < genre.length; i++) {
    hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % GENRE_COLOR_COUNT;
}

function pickRandomSubset(list, maxCount) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, maxCount);
}

function infoJsonUrlFromGuid(guid) {
  return `../data/${encodeURIComponent(guid)}/info.json`;
}

/**
 * Loading placeholder (mirrors app.js `createSkeletonCard`).
 * @returns {string}
 */
function createHomeSkeletonCard() {
  return `
    <div class="skeleton-card">
      <div class="skeleton-image skeleton"></div>
      <div class="skeleton-content">
        <div class="skeleton-title skeleton"></div>
        <div class="skeleton-text skeleton"></div>
        <div class="skeleton-text skeleton"></div>
      </div>
    </div>
  `;
}

/**
 * Anime card for catalog entries (mirrors app.js `createAnimeCard` layout).
 * @param {SeriesIndexModel} model
 * @returns {string}
 */
function createHomeAnimeCard(model) {
  const title = escapeHtml(model.title.main);
  const genres = model.title.alt.slice(1, 4);
  const imgSrc = resolveThumbnailFromHome(model.thumbnail);
  const guidAttr = escapeAttr(model.guid);

  return `
    <div class="anime-card" data-home-guid="${guidAttr}" tabindex="0">
      <div class="anime-card__image">
        <img src="${imgSrc}" alt="${title}" loading="lazy" onerror="this.style.display='none'">
        <div class="anime-card__actions"></div>
      </div>
      <div class="anime-card__content">
        <h3 class="anime-card__title">${title}</h3>
        <div class="anime-card__genres">
          ${genres.map((g) => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Featured carousel card (matches app.js/classes for existing carousel sizing).
 * @param {SeriesIndexModel} model
 * @returns {string}
 */
function createHomeFeaturedCard(model) {
  const title = escapeHtml(model.title.main);
  const imgSrc = resolveThumbnailFromHome(model.thumbnail);
  const guidAttr = escapeAttr(model.guid);

  return `
    <div class="featured-card" data-home-guid="${guidAttr}" tabindex="0">
      <img src="${imgSrc}" alt="${title}" loading="lazy" onerror="this.style.display='none'">
    </div>
  `;
}

function createHomeDetailHtml(indexModel, info) {
  const guid = indexModel.guid || '';
  const title = escapeHtml(info?.title?.main || indexModel.title.main || 'Untitled');
  const description = escapeHtml(info?.description || 'No description available yet.');
  const alternateNamesRaw = Array.isArray(info?.title?.alt) && info.title.alt.length ? info.title.alt : indexModel.title.alt;
  const alternateNames = Array.isArray(alternateNamesRaw) ? alternateNamesRaw.map(escapeHtml) : [];
  const studiosRaw = Array.isArray(info?.studio) ? info.studio : [];
  const studios = studiosRaw.map(escapeHtml);
  const genresRaw = Array.isArray(info?.genre) && info.genre.length ? info.genre : indexModel.title.alt.slice(1, 4);
  const genres = genresRaw.map(escapeHtml);
  const seriesOverallStatus = info?.status ? escapeHtml(info.status) : 'N/A';
  const season = info?.season ? escapeHtml(info.season) : null;
  const year = info?.year != null ? escapeHtml(info.year) : null;
  const seasonYear = season && year ? `${season} ${year}` : (season || year || 'N/A');
  const malUrl = typeof info?.mal === 'string' && info.mal ? info.mal : '';
  const bannerSrc = resolveThumbnailFromHome(info?.banner || indexModel.thumbnail);
  const coverSrc = resolveThumbnailFromHome(info?.thumbnail || indexModel.thumbnail);
  const nativeSubtitle = alternateNames[0] || '';

  return `
    <div class="anime-detail" data-guid="${escapeAttr(guid)}">
      <div id="homeAnimeGuid" data-guid="${escapeAttr(guid)}" class="hidden"></div>
      <div class="anime-detail__banner" style="background-image: url('${escapeAttr(bannerSrc)}')"></div>
      <div class="anime-detail__content">
        <div class="anime-detail__header">
          <div class="anime-detail__cover">
            <img src="${escapeAttr(coverSrc)}" alt="${title}" onerror="this.style.display='none'">
          </div>
          <div class="anime-detail__info">
            <h2 class="anime-detail__title">${title}</h2>
            ${nativeSubtitle ? `<p class="anime-detail__subtitle">${nativeSubtitle}</p>` : ''}
            <div class="anime-detail__actions">
              <a class="btn btn--primary" href="../${escapeAttr(indexModel.guid)}/index.html">Watch Order</a>
              ${malUrl ? `<a class="btn btn--outline" href="${escapeAttr(malUrl)}" target="_blank" rel="noopener noreferrer">MyAnimeList</a>` : ''}
            </div>
            <div class="anime-detail__stats">
              <div class="stat">
                <div class="stat__value">${seriesOverallStatus}</div>
                <div class="stat__label">Series Status</div>
              </div>
            </div>
            ${genres.length ? `<div class="anime-detail__genres">${genres.map((genre) => `<span class="genre-tag genre-tag--color-${genreColorIndex(genre)}">${genre}</span>`).join('')}</div>` : ''}
          </div>
        </div>
        <div class="anime-detail__sections">
          <div class="detail-section">
            <h3>Description</h3>
            <p>${description}</p>
          </div>
          <div class="detail-section">
            <h3>Information</h3>
            <div style="display: grid; gap: var(--space-12);">
              <div><strong>Alternate names:</strong> ${alternateNames.length ? alternateNames.join(', ') : 'N/A'}</div>
              <div><strong>Studios:</strong> ${studios.length ? studios.join(', ') : 'N/A'}</div>
              <div><strong>Start Season:</strong> ${seasonYear}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function closeHomeAnimeModal() {
  const modal = document.getElementById(HOME_MODAL_ID);
  const detailsContainer = document.getElementById(HOME_MODAL_DETAILS_ID);
  if (modal) modal.classList.add('hidden');
  if (detailsContainer) detailsContainer.innerHTML = '';
}

async function openHomeAnimeModal(model) {
  const modal = document.getElementById(HOME_MODAL_ID);
  const detailsContainer = document.getElementById(HOME_MODAL_DETAILS_ID);
  if (!modal || !detailsContainer) return;

  modal.classList.remove('hidden');
  detailsContainer.innerHTML = createHomeSkeletonCard();

  try {
    const res = await fetch(infoJsonUrlFromGuid(model.guid));
    let info = null;
    if (res.ok) {
      info = await res.json();
    }
    detailsContainer.innerHTML = createHomeDetailHtml(model, info);
  } catch (err) {
    console.error('Home info load failed:', err);
    detailsContainer.innerHTML = createHomeDetailHtml(model, null);
  }
}

function attachHomeCatalogCardListeners(container) {
  container.querySelectorAll('[data-home-guid]').forEach((card) => {
    const open = () => {
      const guid = card.getAttribute('data-home-guid');
      if (!guid) return;
      const model = homeCatalogByGuid.get(guid) || {
        guid,
        title: {
          main: card.querySelector('.anime-card__title')?.textContent?.trim() || card.querySelector('img')?.alt || 'Untitled',
          alt: [],
        },
        thumbnail: '',
      };
      openHomeAnimeModal(model);
    };
    card.addEventListener('click', open);
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') open();
    });
  });
}

function initHomeModal() {
  const modal = document.getElementById(HOME_MODAL_ID);
  const closeBtn = document.getElementById('closeModal');
  if (!modal) return;

  closeBtn?.addEventListener('click', closeHomeAnimeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal__backdrop')) {
      closeHomeAnimeModal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeHomeAnimeModal();
    }
  });
}

/**
 * Fill all grids marked with `data-home-catalog="true"` from index.json models.
 */
async function loadHomeCatalogFromIndex() {
  const grids = document.querySelectorAll('[data-home-catalog="true"]');
  const featuredCarousel = document.getElementById('featuredCarousel');
  if (!grids.length && !featuredCarousel) return;

  const skeleton = Array(6).fill(0).map(() => createHomeSkeletonCard()).join('');
  grids.forEach((el) => {
    el.innerHTML = skeleton;
  });
  if (featuredCarousel) {
    featuredCarousel.innerHTML = skeleton;
  }

  try {
    const models = await fetchIndexCatalogModels();
    homeCatalogByGuid.clear();
    models.forEach((model) => {
      if (model.guid) {
        homeCatalogByGuid.set(model.guid, model);
      }
    });
    if (models.length === 0) {
      const empty = '<p class="error-message">No series in index yet.</p>';
      grids.forEach((el) => {
        el.innerHTML = empty;
      });
      if (featuredCarousel) {
        featuredCarousel.innerHTML = empty;
      }
      return;
    }

    const recentlyUpdatedModels = [...models].reverse().slice(0, 10);
    const featuredModels = pickRandomSubset(models, 10);

    const recentHtml = recentlyUpdatedModels.map((m) => createHomeAnimeCard(m)).join('');
    const featuredHtml = featuredModels.map((m) => createHomeFeaturedCard(m)).join('');

    grids.forEach((el) => {
      el.innerHTML = recentHtml;
      attachHomeCatalogCardListeners(el);
    });
    if (featuredCarousel) {
      featuredCarousel.innerHTML = featuredHtml;
      attachHomeCatalogCardListeners(featuredCarousel);
      initCarouselAutoSlide(featuredCarousel);
    }
  } catch (err) {
    console.error('Home catalog load failed:', err);
    const errHtml = '<div class="error-message"><p>Could not load the series list.</p></div>';
    grids.forEach((el) => {
      el.innerHTML = errHtml;
    });
    if (featuredCarousel) {
      featuredCarousel.innerHTML = errHtml;
    }
  }
}

// --- Theme (compatible with `aniclone_user` from main app; home-only names) ---

function readStoredUser() {
  try {
    const raw = localStorage.getItem('aniclone_user');
    if (raw) return JSON.parse(raw);
  } catch (_) {
    /* ignore */
  }
  return {
    lists: { watching: [], completed: [], planning: [], paused: [], dropped: [] },
    preferences: { theme: 'auto' },
  };
}

function writeStoredUser(user) {
  try {
    localStorage.setItem('aniclone_user', JSON.stringify(user));
  } catch (_) {
    /* ignore */
  }
}

function initHomeTheme() {
  const user = readStoredUser();
  const theme = user.preferences?.theme ?? 'auto';
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    updateHomeThemeIcon('dark');
  } else if (theme === 'light') {
    document.documentElement.setAttribute('data-color-scheme', 'light');
    updateHomeThemeIcon('light');
  } else {
    updateHomeThemeIcon('auto');
  }
}

function updateHomeThemeIcon(theme) {
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

function toggleHomeTheme() {
  const current = document.documentElement.getAttribute('data-color-scheme');
  const nextIsDark = current !== 'dark';
  const user = readStoredUser();
  user.preferences = { ...user.preferences, theme: nextIsDark ? 'dark' : 'light' };
  writeStoredUser(user);
  if (nextIsDark) {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    updateHomeThemeIcon('dark');
  } else {
    document.documentElement.setAttribute('data-color-scheme', 'light');
    updateHomeThemeIcon('light');
  }
}

function initHomeChrome() {
  initHomeTheme();
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleHomeTheme);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initHomeChrome();
  initHomeModal();
  loadHomeCatalogFromIndex().then(() => loadContinueWatching());
});

// --- Continue Watching (from progress cookie) ---

function getProgressCookie() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)aniwatch_progress=([^;]*)/);
    if (match) return JSON.parse(decodeURIComponent(match[1]));
  } catch (_) { /* ignore */ }
  return {};
}

function loadContinueWatching() {
  const section = document.getElementById('continueWatchingSection');
  const grid = document.getElementById('continueWatchingGrid');
  if (!section || !grid) return;

  const progress = getProgressCookie();
  // Extract unique guids that have at least one checked entry
  const guids = [...new Set(
    Object.keys(progress)
      .filter(key => Array.isArray(progress[key]) && progress[key].length > 0)
      .map(key => key.split(':')[0])
  )];

  if (!guids.length) return;

  // Filter to guids we have in the catalog
  const cards = guids
    .map(guid => homeCatalogByGuid.get(guid))
    .filter(Boolean);

  if (!cards.length) return;

  grid.innerHTML = cards.map(m => createHomeAnimeCard(m)).join('');
  attachHomeCatalogCardListeners(grid);
  section.classList.remove('hidden');
}

// --- Auto-sliding featured carousel ---

function initCarouselAutoSlide(carousel) {
  const cards = carousel.querySelectorAll('.featured-card');
  if (cards.length <= 1) return;

  const INTERVAL_MS = 4000;
  let timerId = null;
  let currentIndex = 0;

  function getCardStep() {
    if (cards.length < 2) return 216;
    return cards[1].offsetLeft - cards[0].offsetLeft;
  }

  function advance() {
    const step = getCardStep();
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    if (carousel.scrollLeft + step >= maxScroll) {
      carousel.style.scrollBehavior = 'auto';
      carousel.scrollLeft = 0;
      // Force reflow then restore smooth
      void carousel.offsetHeight;
      carousel.style.scrollBehavior = 'smooth';
      currentIndex = 0;
    } else {
      carousel.style.scrollBehavior = 'smooth';
      currentIndex += 1;
      carousel.scrollLeft += step;
    }
  }

  function start() {
    if (timerId) return;
    timerId = setInterval(advance, INTERVAL_MS);
  }

  function pause() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  carousel.addEventListener('mouseenter', pause);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('touchstart', pause, { passive: true });
  carousel.addEventListener('touchend', start);
  carousel.addEventListener('touchcancel', start);

  // Only auto-slide when content overflows
  if (carousel.scrollWidth > carousel.clientWidth) {
    start();
  }
}

// Hero: scroll to catalog section
document.addEventListener('click', (e) => {
  if (e.target.closest('#startExploringBtn')) {
    const section = document.getElementById('recentUpdateSection');
    if (section) {
      const header = document.querySelector('.header');
      const headerHeight = header ? header.offsetHeight : 0;
      const extraSpacing = 12;
      const targetTop = section.getBoundingClientRect().top + window.scrollY - headerHeight - extraSpacing;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: 'smooth',
      });
    }
  }
});
