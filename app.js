const PER_PAGE = 24;
let allCorsi = [];
let filtered = [];
let activeFilters = { provincia: null, comune: null, orario: null, cert: null, esenzione: null };
let searchQuery = '';
let sortKey = 'titolo-asc';
let currentPage = 1;

// ── FETCH DATA ──
fetch('corsi.json')
  .then(r => r.json())
  .then(data => {
    allCorsi = data;
    buildSidebar();
    applyFilters();
  })
  .catch(() => {
    document.getElementById('grid').innerHTML =
      '<div class="empty"><p>Impossibile caricare corsi.json. Assicurati che il file sia nella stessa cartella di index.html.</p></div>';
  });

// ── SIDEBAR BUILD ──
function buildSidebar() {
  const counts = (key) => {
    const map = {};
    allCorsi.forEach(c => { const v = c[key] || 'N/D'; map[v] = (map[v]||0)+1; });
    return Object.entries(map).sort((a,b) => b[1]-a[1]);
  };

  buildFilter('filter-provincia', counts('provincia'), 'provincia');
  buildFilter('filter-comune', counts('comune'), 'comune');
  buildFilter('filter-orario', counts('orario'), 'orario');
  buildFilter('filter-cert', counts('certificazione'), 'cert');
  buildFilter('filter-esenzione', counts('esenzione'), 'esenzione');
}

function buildFilter(elId, entries, filterKey) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  entries.forEach(([val, cnt]) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.key = filterKey;
    btn.dataset.val = val;
    btn.innerHTML = `<span>${val}</span><span class="badge">${cnt}</span>`;
    btn.addEventListener('click', () => toggleFilter(filterKey, val, btn));
    el.appendChild(btn);
  });
}

function toggleFilter(key, val, btn) {
  if (activeFilters[key] === val) {
    activeFilters[key] = null;
    btn.classList.remove('active');
  } else {
    document.querySelectorAll(`.filter-btn[data-key="${key}"]`).forEach(b => b.classList.remove('active'));
    activeFilters[key] = val;
    btn.classList.add('active');
  }
  currentPage = 1;
  applyFilters();
}

// ── SEARCH ──
document.getElementById('search').addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase().trim();
  currentPage = 1;
  applyFilters();
});

// ── SORT ──
document.getElementById('sort-select').addEventListener('change', e => {
  sortKey = e.target.value;
  currentPage = 1;
  renderGrid();
});

// ── RESET ──
document.getElementById('reset-btn').addEventListener('click', () => {
  activeFilters = { provincia: null, comune: null, orario: null, cert: null, esenzione: null };
  searchQuery = '';
  document.getElementById('search').value = '';
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  currentPage = 1;
  applyFilters();
});

// ── FILTER LOGIC ──
function applyFilters() {
  filtered = allCorsi.filter(c => {
    if (activeFilters.provincia && c.provincia !== activeFilters.provincia) return false;
    if (activeFilters.comune && c.comune !== activeFilters.comune) return false;
    if (activeFilters.orario && c.orario !== activeFilters.orario) return false;
    if (activeFilters.cert && c.certificazione !== activeFilters.cert) return false;
    if (activeFilters.esenzione && c.esenzione !== activeFilters.esenzione) return false;
    if (searchQuery) {
      const haystack = [c.titolo, c.operatore, c.comune, c.sede].join(' ').toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });
  document.getElementById('count-num').textContent = filtered.length;
  renderChips();
  renderGrid();
}

// ── CHIPS ──
const filterLabels = { provincia: 'Provincia', comune: 'Comune', orario: 'Orario', cert: 'Certificazione', esenzione: 'Esenzione' };
function renderChips() {
  const el = document.getElementById('active-filters');
  el.innerHTML = '';
  Object.entries(activeFilters).forEach(([key, val]) => {
    if (!val) return;
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span>${filterLabels[key]}: <strong>${val}</strong></span><button title="Rimuovi filtro">×</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      activeFilters[key] = null;
      document.querySelectorAll(`.filter-btn[data-key="${key}"]`).forEach(b => b.classList.remove('active'));
      currentPage = 1;
      applyFilters();
    });
    el.appendChild(chip);
  });
}

// ── SORT ──
function sortedFiltered() {
  const arr = [...filtered];
  const [field, dir] = sortKey.split('-');
  arr.sort((a, b) => {
    let av = a[field === 'cert' ? 'certificazione' : field] || '';
    let bv = b[field === 'cert' ? 'certificazione' : field] || '';
    if (field === 'costo' || field === 'ore') {
      av = parseFloat(av) || 0;
      bv = parseFloat(bv) || 0;
    } else {
      av = av.toLowerCase();
      bv = bv.toLowerCase();
    }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
  return arr;
}

// ── RENDER GRID ──
function renderGrid() {
  const sorted = sortedFiltered();
  const total = sorted.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  if (currentPage > totalPages) currentPage = 1;

  const start = (currentPage - 1) * PER_PAGE;
  const page = sorted.slice(start, start + PER_PAGE);

  document.getElementById('results-text').textContent =
    total === 0 ? 'Nessun risultato' :
    `${start+1}–${Math.min(start+PER_PAGE, total)} di ${total} corsi`;

  const grid = document.getElementById('grid');
  if (total === 0) {
    grid.innerHTML = `<div class="empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M8 11h6M11 8v6"/></svg>
      <h3>Nessun corso trovato</h3>
      <p>Prova a modificare i filtri o la ricerca.</p>
    </div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  grid.innerHTML = '';
  page.forEach((c, i) => {
    const card = buildCard(c, i);
    grid.appendChild(card);
  });

  renderPagination(totalPages);
}

function buildCard(c, i) {
  const el = document.createElement('div');
  el.className = 'card';
  el.style.animationDelay = `${i * 20}ms`;

  const costo = parseFloat(c.costo) || 0;
  const contributo = costo > 0 ? (costo * 0.3) : 0;
  const contributoFmt = contributo > 0 ? `€ ${contributo.toLocaleString('it-IT', {maximumFractionDigits:0})}` : '';
  const costoFmt = costo > 0 ? `€ ${costo.toLocaleString('it-IT')}` : '–';

  el.innerHTML = `
    <div class="card-header">
      <span class="card-id"># ${c.id}</span>
      <div class="card-title">${cap(c.titolo)}</div>
      <div class="card-operatore">${c.operatore}</div>
    </div>
    <div class="card-meta">
      ${c.provincia ? `<span class="tag tag-provincia">${c.provincia}</span>` : ''}
      ${c.orario ? `<span class="tag tag-orario">${c.orario}</span>` : ''}
      ${c.certificazione ? `<span class="tag tag-cert">${c.certificazione}</span>` : ''}
      ${c.esenzione && c.esenzione !== 'NESSUNA' ? `<span class="tag tag-esenzione">${c.esenzione}</span>` : ''}
    </div>
    <div class="card-footer">
      <div class="card-info-row">
        ${c.ore ? `<span class="card-stat">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${c.ore} ore
        </span>` : ''}
        ${c.comune ? `<span class="card-stat">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${cap(c.comune)}
        </span>` : ''}
      </div>
      ${contributo > 0 ? `<div class="card-cost">
        <span class="cost-private">${contributoFmt}</span>
        <span class="cost-sub">il tuo contributo 30%</span>
        <span class="cost-sub">prezzo pieno ${costoFmt}</span>
      </div>` : ''}
    </div>
  `;
  el.addEventListener('click', () => openModal(c));
  return el;
}

// ── PAGINATION ──
function renderPagination(totalPages) {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  const pages = getPageNums(currentPage, totalPages);
  el.innerHTML = '';

  const prev = document.createElement('button');
  prev.className = 'page-btn';
  prev.textContent = '← Prec';
  prev.disabled = currentPage === 1;
  prev.addEventListener('click', () => { currentPage--; renderGrid(); scrollToTop(); });
  el.appendChild(prev);

  pages.forEach(p => {
    if (p === '…') {
      const sp = document.createElement('span');
      sp.className = 'page-ellipsis';
      sp.textContent = '…';
      el.appendChild(sp);
    } else {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (p === currentPage ? ' active' : '');
      btn.textContent = p;
      btn.addEventListener('click', () => { currentPage = p; renderGrid(); scrollToTop(); });
      el.appendChild(btn);
    }
  });

  const next = document.createElement('button');
  next.className = 'page-btn';
  next.textContent = 'Succ →';
  next.disabled = currentPage === totalPages;
  next.addEventListener('click', () => { currentPage++; renderGrid(); scrollToTop(); });
  el.appendChild(next);
}

function getPageNums(cur, total) {
  if (total <= 7) return Array.from({length: total}, (_, i) => i+1);
  const pages = [1];
  if (cur > 3) pages.push('…');
  for (let i = Math.max(2, cur-1); i <= Math.min(total-1, cur+1); i++) pages.push(i);
  if (cur < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

function scrollToTop() {
  document.querySelector('main').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── MODAL ──
function openModal(c) {
  document.getElementById('m-id').textContent = `Corso # ${c.id}`;
  document.getElementById('m-title').textContent = cap(c.titolo);

  const tags = document.getElementById('m-tags');
  tags.innerHTML = `
    ${c.provincia ? `<span class="tag tag-provincia">${c.provincia}</span>` : ''}
    ${c.orario ? `<span class="tag tag-orario">${c.orario}</span>` : ''}
    ${c.certificazione ? `<span class="tag tag-cert">${c.certificazione}</span>` : ''}
    ${c.esenzione && c.esenzione !== 'NESSUNA' ? `<span class="tag tag-esenzione">${c.esenzione}</span>` : ''}
  `;

  const costo = parseFloat(c.costo) || 0;
  const tuo = costo > 0 ? `€ ${(costo * 0.3).toLocaleString('it-IT', {maximumFractionDigits:0})} (30%)` : '–';
  document.getElementById('m-grid').innerHTML = `
    <div class="modal-stat"><div class="label">Durata</div><div class="value">${c.ore || '–'} ore</div></div>
    <div class="modal-stat"><div class="label">Orario</div><div class="value">${c.orario || '–'}</div></div>
    <div class="modal-stat"><div class="label">Costo totale</div><div class="value">${costo > 0 ? '€ ' + costo.toLocaleString('it-IT') : '–'}</div></div>
    <div class="modal-stat"><div class="label">Tuo contributo</div><div class="value">${tuo}</div></div>
    <div class="modal-stat"><div class="label">Giorni/settimana</div><div class="value">${c.giorni_settimana || '–'}</div></div>
    <div class="modal-stat"><div class="label">Esenzione</div><div class="value">${c.esenzione || '–'}</div></div>
  `;

  const sedeEl = document.getElementById('m-sede');
  let sedeHtml = `<p style="font-size:.88rem;color:var(--ink-soft);line-height:1.7;">`;
  sedeHtml += `<strong>${c.operatore}</strong><br>`;
  if (c.sede && c.sede !== c.operatore) sedeHtml += `${c.sede}<br>`;
  if (c.indirizzo) sedeHtml += `${cap(c.indirizzo)}, ${cap(c.comune)} (${c.provincia})<br>`;
  if (c.telefono) sedeHtml += `📞 <a href="tel:${c.telefono}">${c.telefono}</a><br>`;
  if (c.email) sedeHtml += `✉️ <a href="mailto:${c.email}">${c.email}</a>`;
  sedeHtml += `</p>`;
  sedeEl.innerHTML = sedeHtml;

  const descEl = document.getElementById('m-desc');
  if (c.descrizione) {
    descEl.textContent = c.descrizione;
    document.getElementById('m-desc-section').style.display = '';
  } else {
    document.getElementById('m-desc-section').style.display = 'none';
  }

  const prereqEl = document.getElementById('m-prereq');
  if (c.prerequisiti) {
    prereqEl.textContent = c.prerequisiti;
    document.getElementById('m-prereq-section').style.display = '';
  } else {
    document.getElementById('m-prereq-section').style.display = 'none';
  }

  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── UTILS ──
function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
