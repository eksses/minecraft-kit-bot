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

// ============================================================
// Auth API
// ============================================================
export const authAPI = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
};

// ============================================================
// Legacy Bot API (for backward compatibility)
// ============================================================
export const botAPI = {
  getStatus: () => request('/bot/status'),
  leave: () => request('/bot/leave', { method: 'POST' }),
  restart: () => request('/bot/restart', { method: 'POST' }),
};

// ============================================================
// Legacy Chest API
// ============================================================
export const chestAPI = {
  getAll: () => request('/chests'),
  create: (data) => request('/chests', { method: 'POST', body: JSON.stringify(data) }),
  update: (name, data) => request(`/chests/${name}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (name) => request(`/chests/${name}`, { method: 'DELETE' }),
};

// ============================================================
// Legacy Kit API
// ============================================================
export const kitAPI = {
  order: (chestName, amount, player) => request('/kits/order', { method: 'POST', body: JSON.stringify({ chestName, amount, player }) }),
  available: () => request('/kits/available'),
  history: () => request('/kits/history'),
};

// ============================================================
// Config API
// ============================================================
export const configAPI = {
  get: () => request('/config'),
  update: (data) => request('/config', { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================================
// Fleet Management API
// ============================================================
export const fleetAPI = {
  // Dashboard
  getDashboard: () => request('/fleet/dashboard'),
  
  // Servers
  getServers: () => request('/fleet/servers'),
  createServer: (data) => request('/fleet/servers', { method: 'POST', body: JSON.stringify(data) }),
  updateServer: (id, data) => request(`/fleet/servers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteServer: (id) => request(`/fleet/servers/${id}`, { method: 'DELETE' }),
  
  // Bots
  getBots: () => request('/fleet/bots'),
  createBot: (data) => request('/fleet/bots', { method: 'POST', body: JSON.stringify(data) }),
  startBot: (id) => request(`/fleet/bots/${id}/start`, { method: 'POST' }),
  stopBot: (id) => request(`/fleet/bots/${id}/stop`, { method: 'POST' }),
  sendCommand: (id, command) => request(`/fleet/bots/${id}/command`, { method: 'POST', body: JSON.stringify({ command }) }),
  deleteBot: (id) => request(`/fleet/bots/${id}`, { method: 'DELETE' }),
  
  // Swarms
  getSwarms: () => request('/fleet/swarms'),
  createSwarm: (data) => request('/fleet/swarms', { method: 'POST', body: JSON.stringify(data) }),
  updateSwarm: (id, data) => request(`/fleet/swarms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSwarm: (id) => request(`/fleet/swarms/${id}`, { method: 'DELETE' }),
  addBotToSwarm: (swarmId, botId) => request(`/fleet/swarms/${swarmId}/bots`, { method: 'POST', body: JSON.stringify({ botId }) }),
  removeBotFromSwarm: (swarmId, botId) => request(`/fleet/swarms/${swarmId}/bots/${botId}`, { method: 'DELETE' }),
  getSwarmBots: (swarmId) => request(`/fleet/swarms/${swarmId}/bots`),
  
  // Tasks
  getSwarmTasks: (swarmId, status) => request(`/fleet/swarms/${swarmId}/tasks${status ? `?status=${status}` : ''}`),
  createTask: (swarmId, data) => request(`/fleet/swarms/${swarmId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  cancelTask: (taskId) => request(`/fleet/tasks/${taskId}`, { method: 'DELETE' }),
  getSwarmStats: (swarmId) => request(`/fleet/swarms/${swarmId}/stats`),
  
  // Swarm Memory
  getSwarmMemory: (swarmId) => request(`/fleet/swarms/${swarmId}/memory`),
  setSwarmMemory: (swarmId, data) => request(`/fleet/swarms/${swarmId}/memory`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSwarmMemory: (swarmId, key) => request(`/fleet/swarms/${swarmId}/memory/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  
  // Chest Locations
  getChests: () => request('/fleet/chests'),
  createChest: (data) => request('/fleet/chests', { method: 'POST', body: JSON.stringify(data) }),
  updateChest: (id, data) => request(`/fleet/chests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChest: (id) => request(`/fleet/chests/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Combined API Export
// ============================================================
export const api = {
  auth: authAPI,
  bot: botAPI,
  chests: chestAPI,
  kits: kitAPI,
  config: configAPI,
  fleet: fleetAPI,
};