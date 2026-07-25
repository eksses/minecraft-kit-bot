const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });
  
  if (!res.ok) {
    const error = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(error);
  }
  
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const authAPI = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
};

export const botAPI = {
  getStatus: () => request('/bot/status'),
  leave: () => request('/bot/leave', { method: 'POST' }),
  restart: () => request('/bot/restart', { method: 'POST' }),
};

export const chestAPI = {
  getAll: () => request('/chests'),
  create: (data) => request('/chests', { method: 'POST', body: JSON.stringify(data) }),
  update: (name, data) => request(`/chests/${name}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (name) => request(`/chests/${name}`, { method: 'DELETE' }),
};

export const kitAPI = {
  order: (chestName, amount, player) => request('/kits/order', { method: 'POST', body: JSON.stringify({ chestName, amount, player }) }),
  available: () => request('/kits/available'),
  history: () => request('/kits/history'),
};

export const configAPI = {
  get: () => request('/config'),
  update: (data) => request('/config', { method: 'POST', body: JSON.stringify(data) }),
};

export const api = {
  auth: authAPI,
  bot: botAPI,
  chests: chestAPI,
  kits: kitAPI,
  config: configAPI,
};