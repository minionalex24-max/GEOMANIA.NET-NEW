/* Geomania admin panel: hash-verified login, lockout, and content CRUD (add/delete). */
const STORAGE_KEY = 'geomaniaData';
const AUTH_KEY = 'geomaniaAdminAuth';
const LOCK_KEY = 'geomaniaAdminLock';

// PBKDF2 hashes for username KScalling and password letovo_KS1234.
const AUTH = {
  saltBase64: 'gE7nD9sK2xQ4mV1p8YtR3A==',
  iterations: 150000,
  usernameHash: 'axPgvUeH7Hcr7suAMRe3/mz6ntTxAbq/K3g9ZEOOw9w=',
  passwordHash: 'F1m1GWtYhBzpDNq1gyFknGvPPcIOax8hwzFgUj90bFc='
};

const byId = (id) => document.getElementById(id);

function notify(id, msg, ok = true) {
  const el = byId(id);
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#16a34a' : '#dc2626';
}

function getData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"maps":[],"articles":[],"news":[],"presentations":[],"films":[],"exams":[]}');
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function setAuth(auth) {
  sessionStorage.setItem(AUTH_KEY, auth ? '1' : '0');
}

function isAuth() {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

function isLocked() {
  const lock = JSON.parse(localStorage.getItem(LOCK_KEY) || '{"attempts":0,"until":0}');
  if (Date.now() < lock.until) return lock;
  if (lock.until !== 0) localStorage.removeItem(LOCK_KEY);
  return { attempts: 0, until: 0 };
}

function registerFailAttempt() {
  const lock = isLocked();
  const attempts = lock.attempts + 1;
  const until = attempts >= 5 ? Date.now() + 5 * 60 * 1000 : 0;
  localStorage.setItem(LOCK_KEY, JSON.stringify({ attempts, until }));
  return { attempts, until };
}

function clearLockout() {
  localStorage.removeItem(LOCK_KEY);
}

function constantTimeEqualBase64(a, b) {
  const aBytes = Uint8Array.from(atob(a), c => c.charCodeAt(0));
  const bBytes = Uint8Array.from(atob(b), c => c.charCodeAt(0));
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i += 1) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

async function deriveHash(value) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(value), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(atob(AUTH.saltBase64), c => c.charCodeAt(0));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: AUTH.iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Image read failed'));
    reader.readAsDataURL(file);
  });
}

function routeView() {
  byId('loginView').classList.toggle('hidden', isAuth());
  byId('dashboardView').classList.toggle('hidden', !isAuth());
}

async function loginHandler(e) {
  e.preventDefault();
  const lock = isLocked();
  if (lock.until > Date.now()) {
    const min = Math.ceil((lock.until - Date.now()) / 60000);
    notify('loginMessage', `Слишком много попыток. Повторите через ${min} мин.`, false);
    return;
  }

  const form = new FormData(e.target);
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '').trim();

  const [uHash, pHash] = await Promise.all([deriveHash(username), deriveHash(password)]);
  const usernameOk = constantTimeEqualBase64(uHash, AUTH.usernameHash);
  const passwordOk = constantTimeEqualBase64(pHash, AUTH.passwordHash);

  if (usernameOk && passwordOk) {
    clearLockout();
    setAuth(true);
    routeView();
    notify('adminNotice', 'Вход выполнен.');
  } else {
    const fail = registerFailAttempt();
    const msg = fail.attempts >= 5 ? 'Слишком много ошибок. Доступ заблокирован на 5 минут.' : `Неверные данные. Попытка ${fail.attempts}/5.`;
    notify('loginMessage', msg, false);
  }
}

async function addContentHandler(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const type = formData.get('type');
  const data = getData();

  const imageFile = formData.get('imageFile');
  const materialFile = formData.get('materialFile');
  const image = await fileToDataUrl(imageFile && imageFile.size ? imageFile : null);
  const fileData = await fileToDataUrl(materialFile && materialFile.size ? materialFile : null);

  const item = {
    id: crypto.randomUUID(),
    title: String(formData.get('title') || '').trim(),
    category: String(formData.get('category') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    difficulty: String(formData.get('difficulty') || '').trim() || undefined,
    classLevel: String(formData.get('classLevel') || '').trim() || undefined,
    tags: String(formData.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean),
    image,
    mapPath: String(formData.get('mapPath') || '').trim(),
    fileName: materialFile && materialFile.name ? materialFile.name : undefined,
    fileData
  };

  if (!data[type] || !item.title || !item.category || !item.description) {
    notify('adminNotice', 'Заполните обязательные поля корректно.', false);
    return;
  }

  data[type].unshift(item);
  saveData(data);
  e.target.reset();
  notify('adminNotice', `${type.slice(0, -1)} успешно добавлен(а).`);
  renderDeleteList();
}

function renderDeleteList() {
  const type = byId('deleteType').value;
  const data = getData();
  const list = data[type] || [];
  byId('deleteList').innerHTML = list.length
    ? list.map(item => `<article class="card"><h3>${item.title}</h3><p class="meta">${item.category || 'General'}</p><button class="btn" data-delete-id="${item.id}" data-delete-type="${type}">Delete</button></article>`).join('')
    : '<p class="muted">В этом разделе пока нет контента.</p>';
}

function deleteItem(type, id) {
  const data = getData();
  if (!data[type]) return;
  data[type] = data[type].filter(item => item.id !== id);
  saveData(data);
  notify('adminNotice', `Материал удалён из раздела ${type}.`);
  renderDeleteList();
}

function setMode(mode) {
  const addMode = mode === 'add';
  byId('contentForm').classList.toggle('hidden', !addMode);
  byId('deletePanel').classList.toggle('hidden', addMode);
  byId('modeAdd').classList.toggle('btn-primary', addMode);
  byId('modeDelete').classList.toggle('btn-primary', !addMode);
  byId('modeDelete').classList.toggle('btn', addMode);
}

function initAdmin() {
  byId('loginForm').addEventListener('submit', loginHandler);
  byId('contentForm').addEventListener('submit', addContentHandler);
  byId('logoutBtn').addEventListener('click', () => {
    setAuth(false);
    routeView();
    notify('loginMessage', 'Вы вышли из админ-панели.');
  });

  byId('modeAdd').addEventListener('click', () => setMode('add'));
  byId('modeDelete').addEventListener('click', () => {
    setMode('delete');
    renderDeleteList();
  });

  byId('deleteType').addEventListener('change', renderDeleteList);
  byId('deleteList').addEventListener('click', (e) => {
    const id = e.target?.dataset?.deleteId;
    const type = e.target?.dataset?.deleteType;
    if (!id || !type) return;
    deleteItem(type, id);
  });

  setMode('add');
  routeView();
}

document.addEventListener('DOMContentLoaded', initAdmin);
