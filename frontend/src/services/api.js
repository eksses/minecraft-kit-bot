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
// Chest API (Legacy + Bot-Scoped)
// ============================================================
export const chestAPI = {
  // Legacy endpoints
  getAll: () => request('/chests'),
  create: (data) => request('/chests', { method: 'POST', body: JSON.stringify(data) }),
  update: (name, data) => request(`/chests/${name}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (name) => request(`/chests/${name}`, { method: 'DELETE' }),

  // Bot-scoped chest operations (D-14a)
  listForBot: (botId) => request(`/chests/${botId}`),
  createForBot: (botId, data) => request(`/chests/${botId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Scan endpoints — all scoped by botId (D-01, D-02)
  triggerScan: (botId, radius = 32) =>
    request(`/chests/${botId}/scan`, {
      method: 'POST',
      body: JSON.stringify({ radius }),
    }),
  getScanStatus: (botId) => request(`/chests/${botId}/scan/status`),
  abortScan: (botId) => request(`/chests/${botId}/scan/abort`, { method: 'POST' }),
  getScanConfig: (botId) => request(`/chests/${botId}/scan/config`),
  updateScanConfig: (botId, config) =>
    request(`/chests/${botId}/scan/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  rescanChest: (botId, x, y, z) =>
    request(`/chests/${botId}/rescan`, {
      method: 'POST',
      body: JSON.stringify({ x, y, z }),
    }),
  orderItem: (botId, itemName, count, playerName) =>
    request(`/fleet/bots/${botId}/trade`, {
      method: 'POST',
      body: JSON.stringify({ itemName, count, playerName }),
    }),
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
  getBot: (id) => request(`/fleet/bots/${id}`),
  createBot: (data) => request('/fleet/bots', { method: 'POST', body: JSON.stringify(data) }),
  startBot: (id) => request(`/fleet/bots/${id}/start`, { method: 'POST' }),
  stopBot: (id) => request(`/fleet/bots/${id}/stop`, { method: 'POST' }),
  sendBotCommand: (id, command) => request(`/fleet/bots/${id}/command`, { method: 'POST', body: JSON.stringify({ command }) }),
  sendCommand: (id, command) => request(`/fleet/bots/${id}/command`, { method: 'POST', body: JSON.stringify({ command }) }),
  getBotInventory: (id) => request(`/fleet/bots/${id}/inventory`),
  getBotLogs: (id) => request(`/fleet/bots/${id}/logs`),
  deleteBot: (id) => request(`/fleet/bots/${id}`, { method: 'DELETE' }),
  
  // Tasks (global)
  getTasks: () => request('/fleet/tasks'),
  
  // Swarms
  getSwarms: () => request('/fleet/swarms'),
  createSwarm: (data) => request('/fleet/swarms', { method: 'POST', body: JSON.stringify(data) }),
  updateSwarm: (id, data) => request(`/fleet/swarms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSwarm: (id) => request(`/fleet/swarms/${id}`, { method: 'DELETE' }),
  addBotToSwarm: (swarmId, botId) => request(`/fleet/swarms/${swarmId}/bots`, { method: 'POST', body: JSON.stringify({ botId }) }),
  removeBotFromSwarm: (swarmId, botId) => request(`/fleet/swarms/${swarmId}/bots/${botId}`, { method: 'DELETE' }),
  getSwarmBots: (swarmId) => request(`/fleet/swarms/${swarmId}/bots`),
  
  // Swarm Tasks
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
  
  // User Management
  getUsers: () => request('/auth/users'),
  createUser: (data) => request('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),

  // Delivery Configuration
  getDeliveryConfig: () => request('/fleet/delivery-config'),
  updateDeliveryConfig: (data) => request('/fleet/delivery-config', { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================================
// Realtime WebSocket Client (D-17)
// ============================================================
class RealtimeClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map(); // event -> Set<callback>
    this.subscribedBots = new Set();
    this.reconnectTimer = null;
    this.connected = false;
    this._userId = null;
  }

  setUserId(userId) {
    this._userId = userId;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      // Authenticate with the server (CR-04)
      if (this._userId) {
        this.ws.send(JSON.stringify({ type: 'auth', userId: this._userId }));
      }
      // Re-subscribe to previously subscribed bots
      for (const botId of this.subscribedBots) {
        this.ws.send(JSON.stringify({ type: 'subscribe_bot', botId }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this._dispatch(msg.type, msg);
      } catch { /* ignore parse errors */ }
    };

    this.ws.onclose = () => {
      this.connected = false;
      // Attempt reconnect after 3 seconds
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.connected = false;
    };
  }

  _dispatch(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      for (const cb of callbacks) {
        try { cb(data); } catch { /* swallow listener errors */ }
      }
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => this.off(eventType, callback);
  }

  off(eventType, callback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) callbacks.delete(callback);
  }

  subscribeBot(botId) {
    this.subscribedBots.add(botId);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe_bot', botId }));
    }
  }

  unsubscribeBot(botId) {
    this.subscribedBots.delete(botId);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe_bot', botId }));
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.subscribedBots.clear();
    this.listeners.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const realtimeClient = new RealtimeClient();

// ============================================================
// Plugin Store API
// ============================================================
export const pluginStoreAPI = {
  getAvailable: () => request('/plugin-store/available'),
  getInstalled: () => request('/plugin-store/installed'),
  getRepos: () => request('/plugin-store/repos'),
  addRepo: (name, url) => request('/plugin-store/repos', { method: 'POST', body: JSON.stringify({ name, url }) }),
  removeRepo: (id) => request(`/plugin-store/repos/${id}`, { method: 'DELETE' }),
  install: (id, downloadUrl) => request(`/plugin-store/install/${id}`, { method: 'POST', body: JSON.stringify({ downloadUrl }) }),
  uninstall: (id) => request(`/plugin-store/uninstall/${id}`, { method: 'DELETE' }),
  update: (id) => request(`/plugin-store/update/${id}`, { method: 'POST' }),
};

// ============================================================
// Combined API Export
// ============================================================
export const api = {
  request,
  auth: authAPI,
  bot: botAPI,
  chests: chestAPI,
  kits: kitAPI,
  config: configAPI,
  fleet: fleetAPI,
  pluginStore: pluginStoreAPI,
  realtime: realtimeClient,
};