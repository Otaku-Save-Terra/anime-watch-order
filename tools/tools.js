(function () {
  'use strict';

  let TAG_OPTIONS = ['MAIN', 'OAD', 'OVA', 'Movie', 'Special', 'ONA', 'Spin-Off', 'Blu-ray'];
  let GENRE_OPTIONS = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror', 'Isekai',
    'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi',
    'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
  ];
  let STATUS_OPTIONS = ['Ongoing', 'Completed', 'Upcoming'];
  let SEASON_OPTIONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

  async function loadConsts() {
    try {
      const res = await fetch('../data/consts.json');
      if (!res.ok) return;
      const c = await res.json();
      if (Array.isArray(c.tags)) TAG_OPTIONS = c.tags;
      if (Array.isArray(c.genres)) GENRE_OPTIONS = c.genres;
      if (Array.isArray(c.statuses)) STATUS_OPTIONS = c.statuses;
      if (Array.isArray(c.seasons)) SEASON_OPTIONS = c.seasons;
    } catch (_) { /* use defaults */ }
  }

  function rebuildStaticDropdowns() {
    const seasonSel = document.getElementById('fieldSeason');
    const statusSel = document.getElementById('fieldStatus');
    if (seasonSel) {
      seasonSel.innerHTML = '<option value="">— Select —</option>' +
        SEASON_OPTIONS.map(s => `<option value="${s}">${s.charAt(0) + s.slice(1).toLowerCase()}</option>`).join('');
    }
    if (statusSel) {
      statusSel.innerHTML = '<option value="">— Select —</option>' +
        STATUS_OPTIONS.map(s => `<option value="${s}">${s}</option>`).join('');
    }
  }

  /* ---------- helpers ---------- */
  function buildTagSelect(selected) {
    const sel = document.createElement('select');
    sel.className = 'tools-select';
    sel.innerHTML = '<option value="">— Tag —</option>' +
      TAG_OPTIONS.map(t => `<option${t === selected ? ' selected' : ''}>${t}</option>`).join('');
    return sel;
  }

  function buildGenreSelect(selected) {
    const sel = document.createElement('select');
    sel.className = 'tools-select';
    sel.innerHTML = '<option value="">— Select —</option>' +
      GENRE_OPTIONS.map(g => `<option${g === selected ? ' selected' : ''}>${g}</option>`).join('');
    return sel;
  }

  /* ---------- dynamic lists (alt titles, studios, genres) ---------- */
  function addDynamicRow(listEl, type) {
    const row = document.createElement('div');
    row.className = 'tools-dynamic-row';
    if (type === 'genre') {
      row.appendChild(buildGenreSelect());
    } else {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'tools-input';
      inp.placeholder = type === 'alt' ? 'Alt title...' : type === 'contributor' ? 'Contributor name...' : 'Studio name...';
      row.appendChild(inp);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tools-btn-icon tools-btn-icon--danger';
    btn.dataset.removeRow = '';
    btn.title = 'Remove';
    btn.textContent = '×';
    row.appendChild(btn);
    listEl.appendChild(row);
  }

  function getDynamicValues(listEl, useSelect) {
    const items = [];
    listEl.querySelectorAll('.tools-dynamic-row').forEach(row => {
      const el = useSelect ? row.querySelector('select') : row.querySelector('input');
      if (el && el.value.trim()) items.push(el.value.trim());
    });
    return items;
  }

  /* ---------- order entry rows ---------- */
  function createEntryRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-move" draggable="true"><span class="drag-handle" title="Drag to reorder">⠿</span></td>
      <td class="col-title"><input type="text" class="tools-input" data-field="title" placeholder="Title"></td>
      <td class="col-tag"></td>
      <td class="col-ep"><input type="text" class="tools-input" data-field="startEp" placeholder="1"></td>
      <td class="col-time"><input type="text" class="tools-input" data-field="startTime" placeholder="mm:ss"></td>
      <td class="col-ep"><input type="text" class="tools-input" data-field="endEp" placeholder="24"></td>
      <td class="col-time"><input type="text" class="tools-input" data-field="endTime" placeholder="mm:ss"></td>
      <td class="col-remarks"><input type="text" class="tools-input" data-field="remarks" placeholder="Optional"></td>
      <td class="col-actions"><button type="button" class="tools-btn-icon tools-btn-icon--danger" data-remove-entry title="Remove">×</button></td>
    `;
    // insert tag select
    const tagTd = tr.querySelector('.col-tag');
    tagTd.appendChild(buildTagSelect());
    return tr;
  }

  function addEntry(orderType) {
    const tbody = document.getElementById('entries-' + orderType);
    tbody.appendChild(createEntryRow());
  }

  function collectEntries(orderType) {
    const tbody = document.getElementById('entries-' + orderType);
    const entries = [];
    tbody.querySelectorAll('tr').forEach(tr => {
      const title = tr.querySelector('[data-field="title"]').value.trim();
      const tag = tr.querySelector('.col-tag select').value.trim();
      const startEp = tr.querySelector('[data-field="startEp"]').value.trim();
      const startTime = tr.querySelector('[data-field="startTime"]').value.trim();
      const endEp = tr.querySelector('[data-field="endEp"]').value.trim();
      const endTime = tr.querySelector('[data-field="endTime"]').value.trim();
      const remarks = tr.querySelector('[data-field="remarks"]').value.trim();

      if (!title) return; // skip empty rows

      function parseEp(v) {
        if (!v) return null;
        const n = Number(v);
        return isNaN(n) ? v : n;
      }

      const entry = {
        title: title,
        tag: tag ? [tag] : [],
        start: {
          episode: parseEp(startEp),
          time: startTime || null
        },
        end: endEp || endTime ? {
          episode: parseEp(endEp),
          time: endTime || null
        } : null,
        remarks: remarks || null
      };
      entries.push(entry);
    });
    return entries;
  }

  /* ---------- order tabs ---------- */
  function initOrderTabs() {
    document.querySelectorAll('.tools-order-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tools-order-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tools-order-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.orderTab).classList.add('active');
      });
    });
  }

  /* ---------- drag-to-reorder rows ---------- */
  function initDragReorder() {
    let dragRow = null;

    document.addEventListener('dragstart', (e) => {
      const handle = e.target.closest('.col-move');
      if (!handle) return;
      dragRow = handle.closest('tr');
      if (!dragRow) return;
      dragRow.classList.add('drag-row--dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    });

    document.addEventListener('dragover', (e) => {
      if (!dragRow) return;
      const targetRow = e.target.closest('.tools-entry-table tbody tr');
      if (!targetRow || targetRow === dragRow) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const tbody = targetRow.parentNode;
      const rows = [...tbody.children];
      const dragIdx = rows.indexOf(dragRow);
      const targetIdx = rows.indexOf(targetRow);
      if (dragIdx < targetIdx) {
        tbody.insertBefore(dragRow, targetRow.nextElementSibling);
      } else {
        tbody.insertBefore(dragRow, targetRow);
      }
    });

    document.addEventListener('dragend', () => {
      if (dragRow) {
        dragRow.classList.remove('drag-row--dragging');
        dragRow = null;
      }
    });
  }

  /* ---------- validation ---------- */
  function validate() {
    const guid = document.getElementById('fieldGuid').value.trim();
    if (!guid) {
      alert('GUID is required.');
      document.getElementById('fieldGuid').focus();
      return false;
    }
    const titleMain = document.getElementById('fieldTitleMain').value.trim();
    if (!titleMain) {
      alert('Title (Main) is required.');
      document.getElementById('fieldTitleMain').focus();
      return false;
    }
    return true;
  }

  /* ---------- generate JSON ---------- */
  function generateJSON() {
    if (!validate()) return;

    const guid = document.getElementById('fieldGuid').value.trim();
    const titleMain = document.getElementById('fieldTitleMain').value.trim();
    const altTitles = getDynamicValues(document.getElementById('altTitlesList'), false);
    const studios = getDynamicValues(document.getElementById('studiosList'), false);
    const description = document.getElementById('fieldDescription').value.trim();
    const season = document.getElementById('fieldSeason').value;
    const year = document.getElementById('fieldYear').value ? Number(document.getElementById('fieldYear').value) : null;
    const status = document.getElementById('fieldStatus').value;
    const banner = document.getElementById('fieldBanner').value.trim();
    const thumbnail = document.getElementById('fieldThumbnail').value.trim();
    const mal = document.getElementById('fieldMal').value.trim();
    const genres = getDynamicValues(document.getElementById('genresList'), true);
    const contributors = getDynamicValues(document.getElementById('contributorsList'), false);

    const infoJson = {
      guid: guid,
      title: {
        main: titleMain,
        alt: altTitles
      },
      studio: studios,
      description: description || null,
      season: season || null,
      year: year,
      banner: banner || null,
      thumbnail: thumbnail || null,
      mal: mal || null,
      genre: genres,
      status: status || null,
      contributors: contributors.length ? contributors : ['Otaku-Save-Terra']
    };

    const orderJson = {
      guid: guid,
      orders: {
        recommended: collectEntries('recommended'),
        chronological: collectEntries('chronological'),
        release: collectEntries('release')
      }
    };

    downloadFile(`info.json`, JSON.stringify(infoJson, null, 2));
    // small delay so browser doesn't merge the two downloads
    setTimeout(() => {
      downloadFile(`order.json`, JSON.stringify(orderJson, null, 2));
    }, 200);
  }

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------- event delegation ---------- */
  function initEvents() {
    const form = document.getElementById('toolsForm');
    form.addEventListener('click', (e) => {
      const target = e.target;

      // Remove row (dynamic lists)
      if (target.dataset.removeRow !== undefined) {
        const row = target.closest('.tools-dynamic-row');
        if (row) row.remove();
        return;
      }

      // Remove entry row (order table)
      if (target.dataset.removeEntry !== undefined) {
        const tr = target.closest('tr');
        if (tr) tr.remove();
        return;
      }

      // Add alt title
      if (target.dataset.addAltTitle !== undefined) {
        addDynamicRow(document.getElementById('altTitlesList'), 'alt');
        return;
      }

      // Add studio
      if (target.dataset.addStudio !== undefined) {
        addDynamicRow(document.getElementById('studiosList'), 'studio');
        return;
      }

      // Add genre
      if (target.dataset.addGenre !== undefined) {
        addDynamicRow(document.getElementById('genresList'), 'genre');
        return;
      }

      // Add contributor
      if (target.dataset.addContributor !== undefined) {
        addDynamicRow(document.getElementById('contributorsList'), 'contributor');
        return;
      }

      // Add order entry
      if (target.dataset.addEntry) {
        addEntry(target.dataset.addEntry);
        return;
      }
    });

    document.getElementById('generateBtn').addEventListener('click', generateJSON);

    // Auto-fill image paths from GUID
    function autoFillImagePath(fieldId, suffix) {
      const guid = document.getElementById('fieldGuid').value.trim();
      if (!guid) {
        alert('Enter a GUID first.');
        document.getElementById('fieldGuid').focus();
        return;
      }
      document.getElementById(fieldId).value = `/images/${guid}${suffix}`;
    }

    document.getElementById('autoBannerBtn').addEventListener('click', () => {
      autoFillImagePath('fieldBanner', '-banner.jpg');
    });

    document.getElementById('autoThumbnailBtn').addEventListener('click', () => {
      autoFillImagePath('fieldThumbnail', '.jpg');
    });

    // Split comma-separated studios into rows
    document.getElementById('splitStudiosBtn').addEventListener('click', () => {
      const list = document.getElementById('studiosList');
      const firstInput = list.querySelector('.tools-dynamic-row input');
      if (!firstInput || !firstInput.value.includes(',')) return;
      const parts = firstInput.value.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length < 2) return;
      list.innerHTML = '';
      parts.forEach(val => {
        addDynamicRow(list, 'studio');
        const lastInput = list.querySelector('.tools-dynamic-row:last-child input');
        if (lastInput) lastInput.value = val;
      });
    });
  }

  /* ---------- load existing series ---------- */
  async function populateGuidDropdown() {
    const sel = document.getElementById('loadGuidSelect');
    try {
      const res = await fetch('../data/index.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const catalog = await res.json();
      catalog.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.guid;
        opt.textContent = `${item.guid} — ${item.title.main}`;
        sel.appendChild(opt);
      });
    } catch (err) {
      console.warn('Could not load index.json for dropdown:', err);
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '⚠ Could not load series list (deploy to server first)';
      opt.disabled = true;
      sel.appendChild(opt);
    }
  }

  function clearForm() {
    document.getElementById('fieldGuid').value = '';
    document.getElementById('fieldTitleMain').value = '';
    document.getElementById('fieldDescription').value = '';
    document.getElementById('fieldSeason').value = '';
    document.getElementById('fieldYear').value = '';
    document.getElementById('fieldStatus').value = '';
    document.getElementById('fieldBanner').value = '';
    document.getElementById('fieldThumbnail').value = '';
    document.getElementById('fieldMal').value = '';

    // clear dynamic lists
    ['altTitlesList', 'studiosList', 'genresList', 'contributorsList'].forEach(id => {
      const list = document.getElementById(id);
      list.innerHTML = '';
    });

    // clear order tables
    ['recommended', 'chronological', 'release'].forEach(tab => {
      document.getElementById('entries-' + tab).innerHTML = '';
    });
  }

  function populateDynamicList(listId, values, type) {
    const list = document.getElementById(listId);
    values.forEach(val => {
      const row = document.createElement('div');
      row.className = 'tools-dynamic-row';
      if (type === 'genre') {
        row.appendChild(buildGenreSelect(val));
      } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'tools-input';
        inp.placeholder = type === 'alt' ? 'Alt title...' : type === 'contributor' ? 'Contributor name...' : 'Studio name...';
        inp.value = val;
        row.appendChild(inp);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tools-btn-icon tools-btn-icon--danger';
      btn.dataset.removeRow = '';
      btn.title = 'Remove';
      btn.textContent = '×';
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  function populateOrderEntries(orderType, entries) {
    const tbody = document.getElementById('entries-' + orderType);
    entries.forEach(entry => {
      const tr = createEntryRow();
      tr.querySelector('[data-field="title"]').value = entry.title || '';
      const tag = Array.isArray(entry.tag) && entry.tag[0] ? entry.tag[0] : '';
      if (tag) tr.querySelector('.col-tag select').value = tag;
      tr.querySelector('[data-field="startEp"]').value = entry.start?.episode ?? '';
      tr.querySelector('[data-field="startTime"]').value = entry.start?.time || '';
      tr.querySelector('[data-field="endEp"]').value = entry.end?.episode ?? '';
      tr.querySelector('[data-field="endTime"]').value = entry.end?.time || '';
      tr.querySelector('[data-field="remarks"]').value = entry.remarks || '';
      tbody.appendChild(tr);
    });
  }

  async function loadExisting(guid) {
    if (!guid) {
      clearForm();
      ['recommended', 'chronological', 'release'].forEach(addEntry);
      return;
    }
    try {
      const [info, order] = await Promise.all([
        fetch(`../data/${encodeURIComponent(guid)}/info.json`).then(r => r.ok ? r.json() : null),
        fetch(`../data/${encodeURIComponent(guid)}/order.json`).then(r => r.ok ? r.json() : null)
      ]);

      clearForm();

      if (info) {
        document.getElementById('fieldGuid').value = info.guid || guid;
        document.getElementById('fieldTitleMain').value = info.title?.main || '';
        document.getElementById('fieldDescription').value = info.description || '';
        document.getElementById('fieldSeason').value = info.season || '';
        document.getElementById('fieldYear').value = info.year || '';
        document.getElementById('fieldStatus').value = info.status || '';
        document.getElementById('fieldBanner').value = info.banner || '';
        document.getElementById('fieldThumbnail').value = info.thumbnail || '';
        document.getElementById('fieldMal').value = info.mal || '';

        if (Array.isArray(info.title?.alt) && info.title.alt.length) {
          populateDynamicList('altTitlesList', info.title.alt, 'alt');
        }
        if (Array.isArray(info.studio) && info.studio.length) {
          populateDynamicList('studiosList', info.studio, 'studio');
        }
        if (Array.isArray(info.genre) && info.genre.length) {
          populateDynamicList('genresList', info.genre, 'genre');
        }
        if (Array.isArray(info.contributors) && info.contributors.length) {
          populateDynamicList('contributorsList', info.contributors, 'contributor');
        }
      }

      if (order?.orders) {
        ['recommended', 'chronological', 'release'].forEach(tab => {
          const entries = order.orders[tab];
          if (Array.isArray(entries) && entries.length) {
            populateOrderEntries(tab, entries);
          } else {
            addEntry(tab);
          }
        });
      } else {
        ['recommended', 'chronological', 'release'].forEach(addEntry);
      }

      alert(`Loaded "${info?.title?.main || guid}" successfully!`);
    } catch (err) {
      alert('Failed to load: ' + err.message);
    }
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    await loadConsts();
    rebuildStaticDropdowns();
    addDynamicRow(document.getElementById('genresList'), 'genre');
    initOrderTabs();
    initDragReorder();
    initEvents();
    populateGuidDropdown();
    // start with one empty entry per tab
    ['recommended', 'chronological', 'release'].forEach(addEntry);

    document.getElementById('loadGuidBtn').addEventListener('click', () => {
      const guid = document.getElementById('loadGuidSelect').value;
      loadExisting(guid);
    });
  });
})();