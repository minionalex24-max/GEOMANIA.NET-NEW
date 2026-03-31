const STORAGE_KEY = 'geomaniaData';
const THEME_KEY = 'geomaniaTheme';

const seedData = {
  maps: [
    { id: crypto.randomUUID(), title: 'Климатические пояса мира', category: 'Климат', difficulty: 'Начальный', description: 'Интерактивная карта климатических зон.', tags: ['климат', 'зоны'], image: '', mapPath: 'maps/climate-world.jpg' },
    { id: crypto.randomUUID(), title: 'Экономические регионы Европы', category: 'Экономика', difficulty: 'Продвинутый', description: 'Сравнение ВВП и торговых коридоров.', tags: ['экономика', 'европа'], image: '', mapPath: 'maps/europe-economy.jpg' }
  ],
  exams: [{ id: crypto.randomUUID(), title: 'Основы тектоники', category: 'Теория', description: 'Базовые понятия и термины.' }],
  presentations: [{ id: crypto.randomUUID(), title: 'Реки Азии', category: 'Гидрология', classLevel: '8 класс', description: 'Крупнейшие речные системы.', fileName: 'реки-азии.pdf', fileData: '' }],
  articles: [{ id: crypto.randomUUID(), title: 'Как формируются горы', category: 'Физическая география', description: 'Процесс орогенеза простыми словами.', tags: ['тектоника'] }],
  films: [{ id: crypto.randomUUID(), title: 'Планета океанов', category: 'Природа', description: 'Документальный фильм об экосистемах.', fileName: 'planet-oceans.mp4', fileData: '' }],
  news: [{ id: crypto.randomUUID(), title: 'Новая спутниковая миссия', category: 'Наука', description: 'Запущен новый спутник наблюдения Земли.' }]
};

const pageMap = { maps: 'maps.html', articles: 'articles.html', news: 'index.html', presentations: 'presentations.html', films: 'films.html', exams: 'exams.html' };

const loadData = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || (localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData)), seedData);
const saveData = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const state = { data: loadData() };

const typeLabel = { Map: 'Карта', Article: 'Статья', News: 'Новость', Presentation: 'Презентация', Film: 'Фильм', Exam: 'Экзамен' };

function toggleTheme() { const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = current; localStorage.setItem(THEME_KEY, current); }
function initTheme() { document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) || 'light'; }

function imageMarkup(item) { return item.image ? `<img class="card-media" src="${item.image}" alt="${item.title}" loading="lazy" />` : '<div class="card-media"></div>'; }
function downloadMarkup(item) { return item.fileData ? `<button class="btn" data-download="${item.id}">Скачать</button>` : ''; }
function mapOpenMarkup(item) { return item.mapPath || item.image ? `<button class="btn" data-open-map="${item.id}">Открыть карту</button>` : ''; }

function cardTemplate(item, type) {
  const mapBtn = type === 'Map' ? mapOpenMarkup(item) : '';
  const downloadBtn = type !== 'Map' ? downloadMarkup(item) : '';
  const tags = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  return `<article class="card" id="item-${item.id}" data-type="${type}" data-id="${item.id}">${imageMarkup(item)}<h3>${item.title}</h3><p class="meta">${typeLabel[type]} · ${item.category || 'Общее'} ${item.difficulty ? `· ${item.difficulty}` : ''} ${item.classLevel ? `· ${item.classLevel}` : ''}</p><p>${item.description}</p>${tags}<div class="toolbar">${mapBtn}${downloadBtn}</div></article>`;
}

function group(containerId, items, key, type) {
  const groups = items.reduce((a, i) => ((a[i[key] || 'Другое'] ??= []).push(i), a), {});
  document.getElementById(containerId).innerHTML = Object.entries(groups).map(([g, v]) => `<section class="group"><h2>${g}</h2><div class="grid cards-grid">${v.map(x => cardTemplate(x, type)).join('')}</div></section>`).join('');
}

function renderHome() {
  const quick = [{ title: 'Карты', url: 'maps.html' }, { title: 'Экзамены', url: 'exams.html' }, { title: 'Презентации', url: 'presentations.html' }, { title: 'Статьи', url: 'articles.html' }];
  document.getElementById('quickAccess').innerHTML = quick.map(q => `<a class="card" href="${q.url}"><h3>${q.title}</h3><p class="muted">Перейти в раздел</p></a>`).join('');
  document.getElementById('newsGrid').innerHTML = state.data.news.map(i => cardTemplate(i, 'News')).join('');
  document.getElementById('popularMapsGrid').innerHTML = state.data.maps.slice(0, 3).map(i => cardTemplate(i, 'Map')).join('');
  document.getElementById('articlesPreviewGrid').innerHTML = state.data.articles.slice(0, 3).map(i => cardTemplate(i, 'Article')).join('');
}

function renderMaps() {
  const cFilter = document.getElementById('categoryFilter');
  cFilter.innerHTML += [...new Set(state.data.maps.map(m => m.category))].map(c => `<option>${c}</option>`).join('');
  const run = () => {
    const q = document.getElementById('mapsSearch').value.toLowerCase();
    const c = cFilter.value; const d = document.getElementById('difficultyFilter').value;
    const filtered = state.data.maps.filter(m => (c === 'all' || m.category === c) && (d === 'all' || m.difficulty === d) && `${m.title} ${m.description}`.toLowerCase().includes(q));
    document.getElementById('mapsGrid').innerHTML = filtered.map(m => cardTemplate(m, 'Map')).join('') || '<p class="muted">Ничего не найдено.</p>';
  };
  ['mapsSearch', 'categoryFilter', 'difficultyFilter'].forEach(id => document.getElementById(id).addEventListener('input', run));
  run();
}

function renderExams() { group('examSections', state.data.exams, 'category', 'Exam'); }
function renderPresentations() { group('presentationsGrouped', state.data.presentations, 'classLevel', 'Presentation'); }
function renderArticles() { group('articlesGrouped', state.data.articles, 'category', 'Article'); }
function renderFilms() { group('filmsGrouped', state.data.films, 'category', 'Film'); }

function setupGlobalSearch() {
  const input = document.getElementById('globalSearch'); const box = document.getElementById('searchResults'); if (!input || !box) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return box.classList.add('hidden');
    const sources = ['maps', 'articles', 'news', 'presentations', 'films', 'exams'];
    const results = sources.flatMap(source => state.data[source].map(item => ({ ...item, source }))).filter(i => `${i.title} ${i.description}`.toLowerCase().includes(q));
    box.innerHTML = results.slice(0, 12).map(r => `<a class="search-link" href="${(pageMap[r.source] || 'index.html')}#item-${r.id}"><div class="card">${imageMarkup(r)}<p class="meta">${r.source}</p><h3>${r.title}</h3><p>${r.description}</p></div></a>`).join('') || '<p class="muted">Совпадений нет.</p>';
    box.classList.remove('hidden');
  });
}

function setupActions() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card[data-id]');
    if (!card) return;
    const id = card.dataset.id;
    const type = card.dataset.type;

    if (type === 'Map') {
      const item = state.data.maps.find(m => m.id === id);
      const src = item?.mapPath || item?.image;
      if (!src) return;
      document.getElementById('mapModalImage').src = src;
      document.getElementById('mapModal').classList.remove('hidden');
      return;
    }

    if (['Presentation', 'Film', 'Article', 'News', 'Exam'].includes(type)) {
      const all = ['presentations', 'films', 'articles', 'news', 'exams'].flatMap(k => state.data[k]);
      const item = all.find(i => i.id === id);
      if (!item?.fileData) return;
      const a = document.createElement('a');
      a.href = item.fileData;
      a.download = item.fileName || `${item.title}.bin`;
      a.click();
    }
  });

  document.getElementById('closeMapModal')?.addEventListener('click', () => document.getElementById('mapModal').classList.add('hidden'));
}

function scrollToHash() { const id = window.location.hash?.slice(1); if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

function init() {
  initTheme();
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  setupGlobalSearch();
  setupActions();
  const p = document.body.dataset.page;
  if (p === 'home') renderHome(); if (p === 'maps') renderMaps(); if (p === 'exams') renderExams(); if (p === 'presentations') renderPresentations(); if (p === 'articles') renderArticles(); if (p === 'films') renderFilms();
  saveData(state.data);
  setTimeout(scrollToHash, 150);
}

document.addEventListener('DOMContentLoaded', init);
