import { WebSocketServer, WebSocket } from 'ws';
import { botLifecycleManager } from './botLifecycle.js';
import { botService } from './bot.js';
import { swarmCoordinator } from './swarmCoordinator.js';

// ============================================================
// Real-time WebSocket Handler
// ============================================================
export class RealtimeServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> Set<ws>
    this.botClients = new Map(); // botId -> Set<ws>
  }

  setup(server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.setupBotEventForwarding();
    this.setupScanEventForwarding();
    this.setupSwarmEventForwarding();
    this.startHeartbeat();
    
    console.log('Realtime server initialized');
  }

  handleConnection(ws, req) {
    ws.isAlive = true;
    ws.subscribedBots = new Set();
    ws.subscribedSwarms = new Set();
    ws.userId = null;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(ws, msg);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      this.removeClient(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      this.removeClient(ws);
    });
  }

  handleMessage(ws, msg) {
    switch (msg.type) {
      case 'auth':
        ws.userId = msg.userId;
        this.addClient(ws.userId, ws);
        ws.send(JSON.stringify({ type: 'auth_success' }));
        break;

      case 'subscribe_bot':
        // Require auth before subscribing to bot events (CR-04)
        if (!ws.userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Authentication required before subscribing' }));
          break;
        }
        ws.subscribedBots.add(msg.botId);
        this.addBotClient(msg.botId, ws);
        
        // Send current bot status
        const instance = botLifecycleManager.getBot(msg.botId);
        if (instance) {
          ws.send(JSON.stringify({
            type: 'bot:status',
            botId: msg.botId,
            data: instance.getStatus(),
          }));
        }
        break;

      case 'unsubscribe_bot':
        ws.subscribedBots.delete(msg.botId);
        this.removeBotClient(msg.botId, ws);
        break;

      case 'subscribe_swarm':
        ws.subscribedSwarms.add(msg.swarmId);
        break;

      case 'unsubscribe_swarm':
        ws.subscribedSwarms.delete(msg.swarmId);
        break;

      case 'bot:command':
        const botInstance = botLifecycleManager.getBot(msg.botId);
        if (botInstance) {
          botInstance.sendCommand(msg.command);
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
    }
  }

  addClient(userId, ws) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);
  }

  removeClient(ws) {
    if (ws.userId && this.clients.has(ws.userId)) {
      this.clients.get(ws.userId).delete(ws);
      if (this.clients.get(ws.userId).size === 0) {
        this.clients.delete(ws.userId);
      }
    }

    for (const botId of ws.subscribedBots) {
      this.removeBotClient(botId, ws);
    }
  }

  addBotClient(botId, ws) {
    if (!this.botClients.has(botId)) {
      this.botClients.set(botId, new Set());
    }
    this.botClients.get(botId).add(ws);
  }

  removeBotClient(botId, ws) {
    if (this.botClients.has(botId)) {
      this.botClients.get(botId).delete(ws);
      if (this.botClients.get(botId).size === 0) {
        this.botClients.delete(botId);
      }
    }
  }

  // ============================================================
  // Bot Event Forwarding
  // ============================================================
  setupBotEventForwarding() {
    botLifecycleManager.on('bot:status', (data) => {
      this.broadcastToBotSubscribers(data.botId, {
        type: 'bot:status',
        botId: data.botId,
        data: { status: data.status },
      });
      this.broadcastToAll({
        type: 'bot:status_update',
        botId: data.botId,
        data: { status: data.status },
      });
    });

    botLifecycleManager.on('bot:health', (data) => {
      this.broadcastToBotSubscribers(data.botId, {
        type: 'bot:health',
        botId: data.botId,
        data: { health: data.health, food: data.food, saturation: data.saturation },
      });
    });

    botLifecycleManager.on('bot:position', (data) => {
      this.broadcastToBotSubscribers(data.botId, {
        type: 'bot:position',
        botId: data.botId,
        data: { x: data.x, y: data.y, z: data.z },
      });
    });

    botLifecycleManager.on('bot:inventory', (data) => {
      this.broadcastToBotSubscribers(data.botId, {
        type: 'bot:inventory',
        botId: data.botId,
        data: { items: data.items },
      });
    });

    botLifecycleManager.on('bot:error', (data) => {
      this.broadcastToBotSubscribers(data.botId, {
        type: 'bot:error',
        botId: data.botId,
        data: { error: data.error },
      });
      this.broadcastToAll({
        type: 'bot:error_update',
        botId: data.botId,
        data: { error: data.error },
      });
    });

    botLifecycleManager.on('bot:death', (data) => {
      this.broadcastToBotSubscribers(data.botId, {
        type: 'bot:death',
        botId: data.botId,
      });
      this.broadcastToAll({
        type: 'bot:death_update',
        botId: data.botId,
      });
    });
  }

  // ============================================================
  // Scan Event Forwarding
  // ============================================================
  setupScanEventForwarding() {
    botService.on('scan-progress', (data) => {
      this.broadcastToBotSubscribers(data.botId, {
        type: 'scan-progress',
        botId: data.botId,
        data,
      });
    });

    botService.on('scan-complete', (data) => {
      this.broadcastToBotSubscribers(data.botId, {
        type: 'scan-complete',
        botId: data.botId,
        data,
      });
      this.broadcastToAll({
        type: 'scan-complete',
        botId: data.botId,
        data,
      });
    });
  }

  // ============================================================
  // Swarm Event Forwarding
  // ============================================================
  setupSwarmEventForwarding() {
    swarmCoordinator.on('task:created', (data) => {
      this.broadcastToSwarmSubscribers(data.swarmId, {
        type: 'swarm:task_created',
        swarmId: data.swarmId,
        data: { taskId: data.taskId },
      });
    });

    swarmCoordinator.on('task:locked', (data) => {
      this.broadcastToSwarmSubscribers(data.swarmId, {
        type: 'swarm:task_locked',
        swarmId: data.swarmId,
        data: { taskId: data.taskId, botId: data.botId },
      });
    });

    swarmCoordinator.on('task:started', (data) => {
      this.broadcastToSwarmSubscribers(data.swarmId, {
        type: 'swarm:task_started',
        swarmId: data.swarmId,
        data: { taskId: data.taskId, botId: data.botId },
      });
    });

    swarmCoordinator.on('task:completed', (data) => {
      this.broadcastToSwarmSubscribers(data.swarmId, {
        type: 'swarm:task_completed',
        swarmId: data.swarmId,
        data: { taskId: data.taskId },
      });
    });

    swarmCoordinator.on('task:failed', (data) => {
      this.broadcastToSwarmSubscribers(data.swarmId, {
        type: 'swarm:task_failed',
        swarmId: data.swarmId,
        data: { taskId: data.taskId, errorMessage: data.errorMessage },
      });
    });

    swarmCoordinator.on('task:released', (data) => {
      this.broadcastToSwarmSubscribers(data.swarmId, {
        type: 'swarm:task_released',
        swarmId: data.swarmId,
        data: { taskId: data.taskId, retryCount: data.retryCount },
      });
    });
  }

  // ============================================================
  // Broadcasting
  // ============================================================
  broadcastToBotSubscribers(botId, message) {
    const clients = this.botClients.get(botId);
    if (clients) {
      const msg = JSON.stringify(message);
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(msg);
        }
      }
    }
  }

  broadcastToSwarmSubscribers(swarmId, message) {
    const msg = JSON.stringify(message);
    for (const [userId, clients] of this.clients) {
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN && ws.subscribedSwarms.has(swarmId)) {
          ws.send(msg);
        }
      }
    }
  }

  broadcastToAll(message) {
    const msg = JSON.stringify(message);
    for (const [userId, clients] of this.clients) {
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(msg);
        }
      }
    }
  }

  // ============================================================
  // Heartbeat
  // ============================================================
  startHeartbeat() {
    setInterval(() => {
      for (const [userId, clients] of this.clients) {
        for (const ws of clients) {
          if (!ws.isAlive) {
            ws.terminate();
            continue;
          }
          ws.isAlive = false;
          ws.ping();
        }
      }
    }, 30000);
  }

  getStats() {
    let totalClients = 0;
    for (const clients of this.clients.values()) {
      totalClients += clients.size;
    }
    
    return {
      totalClients,
      subscribedBots: this.botClients.size,
      subscribedSwarms: new Set(
        Array.from(this.clients.values())
          .flatMap(clients => Array.from(clients).flatMap(ws => Array.from(ws.subscribedSwarms)))
      ).size,
    };
  }
}

export const realtimeServer = new RealtimeServer();