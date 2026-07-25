---
created: 2026-07-25T17:50:18Z
title: Multi-User Mineflayer Delivery Bot Platform
area: general
files:
  - backend/src/services/bot.js
  - backend/src/services/chest.js
  - frontend/src/pages/Dashboard.jsx
  - frontend/src/pages/ChestManager.jsx
  - frontend/src/store/index.js
---

## Problem

Current system is single-user, single-bot architecture with basic kit delivery. Need to scale to enterprise-grade multi-user platform with:
- Multi-tenant user isolation
- Fleet management (multiple bots per user)
- Swarm intelligence with load balancing
- Fault-tolerant delivery queue with zero-drop guarantee
- Real-time status streaming to modern mobile-first UI

## Solution

### 1. Multi-User & Multi-Bot Isolation

**User Isolation:**
- Multi-tenant account system with role-based access
- Each user manages own fleet of bots, servers, tasks, delivery routes
- User-scoped data isolation at database level

**Bot Isolation:**
- Each bot as independent worker process/thread
- Isolated state management, inventory tracking, event handling
- Process-level isolation to prevent cross-contamination

**Server Binding:**
- Dynamic binding to Minecraft servers (host, port, version, auth_type)
- Single server can host multiple bots from same user or swarm

### 2. Database & Persistence Layer (SQLite)

**ORM:** Use Drizzle ORM for type-safe queries

**Schemas:**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'operator', 'viewer') DEFAULT 'operator',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Server Configs
CREATE TABLE server_configs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER DEFAULT 25565,
  version VARCHAR(50) DEFAULT '1.17',
  auth_type ENUM('offline', 'microsoft', 'mojang') DEFAULT 'offline',
  spawn_x INTEGER, spawn_y INTEGER, spawn_z INTEGER,
  pathfinding_timeout INTEGER DEFAULT 5000,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bots
CREATE TABLE bots (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  server_config_id UUID REFERENCES server_configs(id),
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  password_encrypted VARCHAR(255),
  status ENUM('IDLE', 'EN_ROUTE', 'DELIVERING', 'DISCONNECTED', 'ERROR') DEFAULT 'IDLE',
  current_x INTEGER, current_y INTEGER, current_z INTEGER,
  health FLOAT DEFAULT 20,
  food FLOAT DEFAULT 20,
  saturation FLOAT DEFAULT 5,
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Swarms
CREATE TABLE swarms (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  load_balancing ENUM('round-robin', 'least-busy', 'nearest') DEFAULT 'nearest',
  max_concurrent INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Swarm Members (many-to-many)
CREATE TABLE swarm_members (
  swarm_id UUID REFERENCES swarms(id),
  bot_id UUID REFERENCES bots(id),
  PRIMARY KEY (swarm_id, bot_id)
);

-- Delivery Queue
CREATE TABLE delivery_queue (
  id UUID PRIMARY KEY,
  swarm_id UUID REFERENCES swarms(id),
  user_id UUID REFERENCES users(id),
  status ENUM('PENDING', 'LOCKED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RETRY') DEFAULT 'PENDING',
  priority INTEGER DEFAULT 0,
  item_name VARCHAR(255) NOT NULL,
  item_count INTEGER DEFAULT 1,
  target_x INTEGER NOT NULL,
  target_y INTEGER NOT NULL,
  target_z INTEGER NOT NULL,
  target_player VARCHAR(255),
  assigned_bot_id UUID REFERENCES bots(id),
  locked_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Swarm Memory (shared state)
CREATE TABLE swarm_memory (
  id UUID PRIMARY KEY,
  swarm_id UUID REFERENCES swarms(id),
  key VARCHAR(255) NOT NULL,
  value JSONB,
  expires_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(swarm_id, key)
);
```

### 3. Swarm Intelligence & Fault-Tolerant Delivery Queue

**Swarm Collaboration:**
- Shared SQLite-backed memory for bots in same swarm
- Central awareness: inventory, chest maps, hazard zones, online players
- Dynamic task allocation from central swarm queue

**Task Scheduler:**
```typescript
class SwarmScheduler {
  private queue: DeliveryQueue;
  private bots: Map<string, BotInstance>;

  async allocateNextTask(swarmId: string): Promise<DeliveryTask | null> {
    // Find idle bot with nearest pathfinding to task location
    const idleBots = this.getIdleBots(swarmId);
    const pendingTasks = this.getPendingTasks(swarmId);
    
    for (const task of pendingTasks) {
      const nearestBot = this.findNearestBot(idleBots, task.target);
      if (nearestBot) {
        return this.lockAndAssign(task, nearestBot);
      }
    }
    return null;
  }

  private async lockAndAssign(task: DeliveryTask, bot: BotInstance) {
    // Atomic transaction - SQLite row-level lock
    await this.db.transaction(async (tx) => {
      await tx.update(deliveryQueue)
        .set({ 
          status: 'LOCKED', 
          assigned_bot_id: bot.id,
          locked_at: new Date()
        })
        .where(eq(deliveryQueue.id, task.id))
        .for('update');
    });
    
    bot.assignTask(task);
  }
}
```

**Failover & Re-queuing:**
```typescript
class FaultToleranceManager {
  async handleBotFailure(botId: string, taskId: string, error: Error) {
    // 1. Release task back to queue with elevated priority
    await this.db.update(deliveryQueue)
      .set({ 
        status: 'RETRY',
        priority: incrementPriority(),
        retry_count: increment(),
        error_message: error.message,
        assigned_bot_id: null,
        locked_at: null
      })
      .where(eq(deliveryQueue.id, taskId));

    // 2. Trigger auto-reconnect with exponential backoff
    await this.reconnectBot(botId);

    // 3. Notify swarm to pick up task
    this.eventEmitter.emit('task:released', { taskId, botId });
  }

  private async reconnectBot(botId: string) {
    const bot = await this.getBot(botId);
    let delay = 1000;
    const maxDelay = 30000;

    while (bot.status === 'DISCONNECTED') {
      try {
        await this.delay(delay);
        await bot.reconnect();
        break;
      } catch {
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }
}
```

**Error Boundaries:**
```typescript
// Wrap all Mineflayer event listeners
function createErrorBoundary(bot: MineflayerBot) {
  const events = ['kicked', 'error', 'death', 'path_update', 'goal_reached'];
  
  events.forEach(event => {
    const original = bot.listeners(event)[0];
    bot.removeAllListeners(event);
    
    bot.on(event, async (...args) => {
      try {
        await original(...args);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
        bot.emit('handler_error', { event, error });
      }
    });
  });
}
```

### 4. UI/UX & Aesthetics Specification

**Design Principles:**
- NO emojis anywhere - use Lucide Icons exclusively
- Minimalist, high signal-to-noise ratio
- Mobile-first with 48px minimum touch targets
- Drawer menus for secondary content
- Sticky bottom action bars

**Heatmap Color System:**
```css
:root {
  --idle: #10B981;      /* Teal/Emergency - Ready */
  --working: #F59E0B;   /* Amber/Gold - En Route */
  --busy: #EF4444;      /* Coral/Crimson - Alert */
  --offline: #64748B;   /* Slate/Zinc - Passive */
}
```

**Information Architecture:**

1. **Fleet Overview Dashboard**
   - Grid view of all bots
   - Live status badges (heatmap colored)
   - Health/food/saturation bars
   - Active server tags

2. **Swarm Controller**
   - Visual task flow diagram
   - Swarm load distribution chart
   - Job queue status with priority indicators

3. **Bot Inspector (Drawer Modal)**
   - Live inventory grid
   - Real-time coordinates
   - Connection logs
   - Manual override controls

**React Components:**
```tsx
// StatusBadge.tsx
import { Circle } from 'lucide-react';

type Status = 'IDLE' | 'EN_ROUTE' | 'DELIVERING' | 'DISCONNECTED' | 'ERROR';

const statusColors: Record<Status, string> = {
  IDLE: 'bg-emerald-500',
  EN_ROUTE: 'bg-amber-500',
  DELIVERING: 'bg-amber-500',
  DISCONNECTED: 'bg-slate-500',
  ERROR: 'bg-red-500',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <div className="flex items-center gap-2">
      <Circle className={`w-3 h-3 ${statusColors[status]}`} />
      <span className="text-sm font-medium">{status}</span>
    </div>
  );
}

// BotCard.tsx
export function BotCard({ bot }: { bot: Bot }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 min-h-[120px]">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold">{bot.name}</h3>
        <StatusBadge status={bot.status} />
      </div>
      <div className="mt-3 space-y-2">
        <HealthBar value={bot.health} max={20} />
        <FoodBar value={bot.food} max={20} />
      </div>
      <div className="mt-3 text-xs text-slate-500">
        {bot.serverConfig.name}
      </div>
    </div>
  );
}
```

### 5. Real-time Communication

**WebSocket Events:**
```typescript
// Server → Client events
type ServerEvents = {
  'bot:status': { botId: string; status: Status };
  'bot:inventory': { botId: string; items: Item[] };
  'bot:position': { botId: string; x: number; y: number; z: number };
  'swarm:task:update': { taskId: string; status: string };
  'swarm:queue:change': { pending: number; active: number };
};

// Client → Server events
type ClientEvents = {
  'bot:command': { botId: string; command: string };
  'task:create': { swarmId: string; task: NewTask };
  'task:cancel': { taskId: string };
};
```

### 6. Implementation Phases

**Phase 1: Database & Auth (Week 1)**
- SQLite schema with Drizzle ORM
- User authentication with JWT
- Server config CRUD

**Phase 2: Bot Management (Week 2)**
- Bot lifecycle management
- Mineflayer integration with process isolation
- Status tracking and health monitoring

**Phase 3: Swarm Logic (Week 3)**
- Swarm creation and membership
- Task queue with atomic locking
- Load balancing algorithm

**Phase 4: Fault Tolerance (Week 4)**
- Auto-reconnect with backoff
- Task re-queuing on failure
- Error boundary implementation

**Phase 5: Real-time UI (Week 5-6)**
- WebSocket server for live updates
- React dashboard with heatmap status
- Mobile-first responsive design

**Phase 6: Polish & Testing (Week 7)**
- End-to-end testing
- Performance optimization
- Documentation