const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('paypilot_token');
}

function setToken(token) {
  localStorage.setItem('paypilot_token', token);
}

function clearSession() {
  localStorage.removeItem('paypilot_token');
  localStorage.removeItem('paypilot_user');
}

function getUser() {
  const raw = localStorage.getItem('paypilot_user');
  return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
  localStorage.setItem('paypilot_user', JSON.stringify(user));
}

async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function requireAuthOrRedirect() {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

function showBanner(el, message, type = 'info') {
  el.textContent = message;
  el.className = `banner ${type}`;
  el.classList.remove('hidden');
}

function hideBanner(el) {
  el.classList.add('hidden');
}

function renderUserChip(elementId) {
  const user = getUser();
  const el = document.getElementById(elementId);
  if (!user || !el) return;
  const initial = user.user_id.charAt(0).toUpperCase();
  el.innerHTML = `<span class="avatar">${initial}</span> ${user.user_id}`;
  el.classList.remove('hidden');
  if (user.is_admin) {
    const adminLink = document.getElementById('adminLink');
    if (adminLink) adminLink.classList.remove('hidden');
  }
}
