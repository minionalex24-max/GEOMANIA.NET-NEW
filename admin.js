/* Geomania admin panel: local credential setup, PBKDF2 verification, lockout, and content creation. */
const STORAGE_KEY = 'geomaniaData';
const AUTH_KEY = 'geomaniaAdminAuth';
const ADMIN_KEY = 'geomaniaAdminCreds';
const LOCK_KEY = 'geomaniaAdminLock';

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

function setAuth(auth) {
  sessionStorage.setItem(AUTH_KEY, auth ? '1' : '0');
}

function isAuth() {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

function getStoredCreds() {
  return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null');
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

async function deriveHash(password, saltBase64) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function showView({ setup = false, login = false, dashboard = false }) {
  byId('setupView').classList.toggle('hidden', !setup);
  byId('loginView').classList.toggle('hidden', !login);
  byId('dashboardView').classList.toggle('hidden', !dashboard);
}

function routeView() {
  const hasCreds = !!getStoredCreds();
  if (isAuth() && hasCreds) return showView({ dashboard: true });
  if (!hasCreds) return showView({ setup: true });
  return showView({ login: true });
}

async function setupHandler(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '').trim();
  if (username.length < 4 || password.length < 8) {
    notify('setupMessage', 'Username must be 4+ chars and password 8+ chars.', false);
    return;
  }
  const salt = randomSalt();
  const passHash = await deriveHash(password, salt);
  localStorage.setItem(ADMIN_KEY, JSON.stringify({ username, salt, passHash }));
  notify('setupMessage', 'Admin account created. Please sign in.');
  e.target.reset();
  routeView();
}

async function loginHandler(e) {
  e.preventDefault();
  const lock = isLocked();
  if (lock.until > Date.now()) {
    const min = Math.ceil((lock.until - Date.now()) / 60000);
    notify('loginMessage', `Too many attempts. Try again in ${min} min.`, false);
    return;
  }

  const form = new FormData(e.target);
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '').trim();
  const creds = getStoredCreds();
  if (!creds) {
    routeView();
    return;
  }

  const candidate = await deriveHash(password, creds.salt);
  if (username === creds.username && candidate === creds.passHash) {
    clearLockout();
    setAuth(true);
    routeView();
    notify('adminNotice', 'Welcome back, Admin.');
  } else {
    const fail = registerFailAttempt();
    const msg = fail.attempts >= 5 ? 'Too many failed attempts. Locked for 5 minutes.' : `Invalid credentials. Attempt ${fail.attempts}/5.`;
    notify('loginMessage', msg, false);
  }
}

function addContentHandler(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const type = formData.get('type');
  const data = getData();

  const item = {
    id: crypto.randomUUID(),
    title: String(formData.get('title') || '').trim(),
    category: String(formData.get('category') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    difficulty: String(formData.get('difficulty') || '').trim() || undefined,
    classLevel: String(formData.get('classLevel') || '').trim() || undefined,
    tags: String(formData.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean)
  };

  if (!data[type] || !item.title || !item.category || !item.description) {
    notify('adminNotice', 'Please fill all required fields correctly.', false);
    return;
  }

  data[type].unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  e.target.reset();
  notify('adminNotice', `${type.slice(0, -1)} added successfully.`);
}

function initAdmin() {
  byId('setupForm').addEventListener('submit', setupHandler);
  byId('loginForm').addEventListener('submit', loginHandler);
  byId('contentForm').addEventListener('submit', addContentHandler);
  byId('logoutBtn').addEventListener('click', () => {
    setAuth(false);
    routeView();
    notify('loginMessage', 'Logged out.');
  });
  routeView();
}

document.addEventListener('DOMContentLoaded', initAdmin);
