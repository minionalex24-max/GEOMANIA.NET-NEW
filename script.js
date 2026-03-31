/* Geomania core app: dynamic rendering, filters, search, favorites, theming, and localStorage persistence. */
const STORAGE_KEY = 'geomaniaData';
const THEME_KEY = 'geomaniaTheme';
const FAV_KEY = 'geomaniaFavorites';

const seedData = {
  maps: [
    { id: crypto.randomUUID(), title: 'World Climate Zones', category: 'Climate', difficulty: 'Beginner', description: 'Interactive climate classification map.', tags: ['climate', 'zones'] },
    { id: crypto.randomUUID(), title: 'Economic Regions of Europe', category: 'Economy', difficulty: 'Advanced', description: 'Compare GDP and trade corridors.', tags: ['economy', 'europe'] },
    { id: crypto.randomUUID(), title: 'Countries and Capitals Drill', category: 'Countries', difficulty: 'Intermediate', description: 'Practice country-capital pairing.', tags: ['countries', 'capitals'] }
  ],
  exams: [
    { id: crypto.randomUUID(), title: 'Plate Tectonics Basics', category: 'Theory', description: 'Core concepts and terminology.' },
    { id: crypto.randomUUID(), title: 'Climate Data Interpretation', category: 'Practice', description: 'Interpret charts and map overlays.' },
    { id: crypto.randomUUID(), title: 'Regional Geography Solutions Pack', category: 'Solutions', description: 'Step-by-step solution archive.' }
  ],
  presentations: [
    { id: crypto.randomUUID(), title: 'Rivers of Asia', category: 'Hydrology', classLevel: 'Class 8', description: 'Major river systems and impacts.' },
    { id: crypto.randomUUID(), title: 'Urbanization Patterns', category: 'Population', classLevel: 'Class 10', description: 'Global urban growth trends.' }
  ],
  articles: [
    { id: crypto.randomUUID(), title: 'How Mountains Form', category: 'Physical geography', description: 'Orogeny and plate boundaries explained.', tags: ['tectonics'] },
    { id: crypto.randomUUID(), title: 'Global Trade Routes', category: 'Economic geography', description: 'How shipping lanes shape economies.', tags: ['trade', 'oceans'] },
    { id: crypto.randomUUID(), title: 'Deserts That Once Were Green', category: 'Interesting facts', description: 'Paleoclimate evidence from deserts.', tags: ['deserts', 'history'] }
  ],
  films: [
    { id: crypto.randomUUID(), title: 'Blue Planet Frontiers', category: 'Nature', description: 'Ecosystems and biodiversity.' },
    { id: crypto.randomUUID(), title: 'Storm Systems Explained', category: 'Climate', description: 'Mechanics of extreme weather.' },
    { id: crypto.randomUUID(), title: 'Inside Japan', category: 'Countries', description: 'Culture and geographic constraints.' },
    { id: crypto.randomUUID(), title: 'Earth Lab', category: 'Science', description: 'Geoscience breakthroughs.' },
    { id: crypto.randomUUID(), title: 'The Atlas Archives', category: 'Documentaries', description: 'Historic cartography stories.' }
  ],
  news: [
    { id: crypto.randomUUID(), title: 'New Volcano Monitoring Satellite', category: 'Science', description: 'A new platform improves eruption warnings.' },
    { id: crypto.randomUUID(), title: 'Geomania Weekly Quiz Released', category: 'Education', description: 'Fresh practice set added for students.' }
  ]
};

const loadData = () => {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (data) return data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
  return seedData;
};
const saveData = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const getFavorites = () => JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
const setFavorites = (favs) => localStorage.setItem(FAV_KEY, JSON.stringify(favs));

const state = { data: loadData(), favorites: getFavorites() };

function toggleTheme() {
  const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = current;
  localStorage.setItem(THEME_KEY, current);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.dataset.theme = saved;
}

function cardTemplate(item, type) {
  const isFav = state.favorites.includes(item.id);
  const tags = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  return `<article class="card"><button class="fav-btn" data-fav="${item.id}" title="Toggle favorite">${isFav ? '★' : '☆'}</button><h3>${item.title}</h3><p class="meta">${type} · ${item.category || 'General'} ${item.difficulty ? `· ${item.difficulty}` : ''} ${item.classLevel ? `· ${item.classLevel}` : ''}</p><p>${item.description}</p>${tags}</article>`;
}

function withSkeleton(containerId, renderer) {
  const node = document.getElementById(containerId);
  if (!node) return;
  node.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  setTimeout(renderer, 250);
}

function renderHome() {
  const quick = [
    { title: 'Maps', url: 'maps.html' },
    { title: 'Exams', url: 'exams.html' },
    { title: 'Presentations', url: 'presentations.html' },
    { title: 'Articles', url: 'articles.html' }
  ];
  document.getElementById('quickAccess').innerHTML = quick.map(q => `<a class="card" href="${q.url}"><h3>${q.title}</h3><p class="muted">Open ${q.title.toLowerCase()} section</p></a>`).join('');

  withSkeleton('newsGrid', () => {
    document.getElementById('newsGrid').innerHTML = state.data.news.map(item => cardTemplate(item, 'News')).join('');
  });
  withSkeleton('popularMapsGrid', () => {
    document.getElementById('popularMapsGrid').innerHTML = state.data.maps.slice(0, 3).map(item => cardTemplate(item, 'Map')).join('');
  });
  withSkeleton('articlesPreviewGrid', () => {
    document.getElementById('articlesPreviewGrid').innerHTML = state.data.articles.slice(0, 3).map(item => cardTemplate(item, 'Article')).join('');
  });
}

function renderMaps() {
  const categoryFilter = document.getElementById('categoryFilter');
  const categories = [...new Set(state.data.maps.map(m => m.category))];
  categoryFilter.innerHTML += categories.map(c => `<option>${c}</option>`).join('');

  const runFilter = () => {
    const q = document.getElementById('mapsSearch').value.toLowerCase();
    const c = categoryFilter.value;
    const d = document.getElementById('difficultyFilter').value;
    const filtered = state.data.maps.filter(m =>
      (c === 'all' || m.category === c) &&
      (d === 'all' || m.difficulty === d) &&
      (`${m.title} ${m.description} ${(m.tags || []).join(' ')}`.toLowerCase().includes(q))
    );
    document.getElementById('mapsGrid').innerHTML = filtered.map(m => cardTemplate(m, 'Map')).join('') || '<p class="muted">No maps found.</p>';
  };

  ['mapsSearch', 'categoryFilter', 'difficultyFilter'].forEach(id => document.getElementById(id).addEventListener('input', runFilter));
  runFilter();
}

function renderGrouped(containerId, items, groupKey, type) {
  const groups = items.reduce((acc, item) => {
    const key = item[groupKey] || 'Other';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  document.getElementById(containerId).innerHTML = Object.entries(groups)
    .map(([group, values]) => `<section class="group"><h2>${group}</h2><div class="grid cards-grid">${values.map(v => cardTemplate(v, type)).join('')}</div></section>`)
    .join('');
}

function renderExams() { renderGrouped('examSections', state.data.exams, 'category', 'Exam'); }
function renderPresentations() { renderGrouped('presentationsGrouped', state.data.presentations, 'classLevel', 'Presentation'); }
function renderArticles() { renderGrouped('articlesGrouped', state.data.articles, 'category', 'Article'); }
function renderFilms() { renderGrouped('filmsGrouped', state.data.films, 'category', 'Film'); }

function setupGlobalSearch() {
  const input = document.getElementById('globalSearch');
  const box = document.getElementById('searchResults');
  if (!input || !box) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    const sources = ['maps', 'articles', 'news', 'presentations', 'films', 'exams'];
    const results = sources.flatMap(source => state.data[source].map(item => ({ ...item, source })))
      .filter(item => (`${item.title} ${item.description} ${item.category || ''}`.toLowerCase().includes(q)))
      .slice(0, 12);

    box.innerHTML = results.map(r => `<div class="card"><p class="meta">${r.source}</p><h3>${r.title}</h3><p>${r.description}</p></div>`).join('') || '<p class="muted">No matches.</p>';
    box.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!box.contains(e.target) && e.target !== input) box.classList.add('hidden');
  });
}

function setupFavorites() {
  document.addEventListener('click', (e) => {
    const id = e.target?.dataset?.fav;
    if (!id) return;
    state.favorites = state.favorites.includes(id) ? state.favorites.filter(f => f !== id) : [...state.favorites, id];
    setFavorites(state.favorites);
    location.reload();
  });
}

function init() {
  initTheme();
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  setupGlobalSearch();
  setupFavorites();

  const page = document.body.dataset.page;
  if (page === 'home') renderHome();
  if (page === 'maps') renderMaps();
  if (page === 'exams') renderExams();
  if (page === 'presentations') renderPresentations();
  if (page === 'articles') renderArticles();
  if (page === 'films') renderFilms();

  saveData(state.data);
}

document.addEventListener('DOMContentLoaded', init);
