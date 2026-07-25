import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================
// Users Table
// ============================================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'operator', 'viewer'] }).notNull().default('operator'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================
// Servers Table
// ============================================================
export const servers = sqliteTable('servers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  host: text('host').notNull(),
  port: integer('port').notNull().default(25565),
  version: text('version').notNull().default('1.17'),
  authType: text('auth_type', { enum: ['offline', 'microsoft', 'mojang'] }).notNull().default('offline'),
  spawnX: integer('spawn_x'),
  spawnY: integer('spawn_y'),
  spawnZ: integer('spawn_z'),
  pathfindingTimeout: integer('pathfinding_timeout').notNull().default(5000),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================
// Bots Table
// ============================================================
export const bots = sqliteTable('bots', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serverId: text('server_id').references(() => servers.id, { onDelete: 'set null' }),
  swarmId: text('swarm_id').references(() => swarms.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  username: text('username').notNull(),
  passwordEncrypted: text('password_encrypted'),
  status: text('status', { enum: ['IDLE', 'WORKING', 'ON_DELIVERY', 'BUSY', 'OFFLINE', 'ERROR'] }).notNull().default('OFFLINE'),
  currentX: integer('current_x'),
  currentY: integer('current_y'),
  currentZ: integer('current_z'),
  health: real('health').default(20),
  food: real('food').default(20),
  saturation: real('saturation').default(5),
  experienceLevel: integer('experience_level').default(0),
  lastSeen: integer('last_seen', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================
// Swarms Table
// ============================================================
export const swarms = sqliteTable('swarms', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  loadBalancing: text('load_balancing', { enum: ['round-robin', 'least-busy', 'nearest'] }).notNull().default('nearest'),
  maxConcurrent: integer('max_concurrent').notNull().default(5),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================
// Delivery Queue Table
// ============================================================
export const deliveryQueue = sqliteTable('delivery_queue', {
  id: text('id').primaryKey(),
  swarmId: text('swarm_id').notNull().references(() => swarms.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['PENDING', 'LOCKED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RETRY'] }).notNull().default('PENDING'),
  priority: integer('priority').notNull().default(0),
  itemName: text('item_name').notNull(),
  itemCount: integer('item_count').notNull().default(1),
  targetX: integer('target_x').notNull(),
  targetY: integer('target_y').notNull(),
  targetZ: integer('target_z').notNull(),
  targetPlayer: text('target_player'),
  sourceChestName: text('source_chest_name'),
  assignedBotId: text('assigned_bot_id').references(() => bots.id, { onDelete: 'set null' }),
  lockedAt: integer('locked_at', { mode: 'timestamp' }),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================
// Swarm Memory Table (Shared State)
// ============================================================
export const swarmMemory = sqliteTable('swarm_memory', {
  id: text('id').primaryKey(),
  swarmId: text('swarm_id').notNull().references(() => swarms.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value'), // JSON stringified
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================
// Bot Logs Table
// ============================================================
export const botLogs = sqliteTable('bot_logs', {
  id: text('id').primaryKey(),
  botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
  level: text('level', { enum: ['info', 'warn', 'error', 'debug'] }).notNull().default('info'),
  message: text('message').notNull(),
  metadata: text('metadata'), // JSON stringified
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================
// Chest Locations Table
// ============================================================
export const chestLocations = sqliteTable('chest_locations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serverId: text('server_id').references(() => servers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  z: integer('z').notNull(),
  itemName: text('item_name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================
// Relations
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  servers: many(servers),
  bots: many(bots),
  swarms: many(swarms),
  deliveryQueue: many(deliveryQueue),
  chestLocations: many(chestLocations),
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
  user: one(users, { fields: [servers.userId], references: [users.id] }),
  bots: many(bots),
  chestLocations: many(chestLocations),
}));

export const botsRelations = relations(bots, ({ one }) => ({
  user: one(users, { fields: [bots.userId], references: [users.id] }),
  server: one(servers, { fields: [bots.serverId], references: [servers.id] }),
  swarm: one(swarms, { fields: [bots.swarmId], references: [swarms.id] }),
}));

export const swarmsRelations = relations(swarms, ({ one, many }) => ({
  user: one(users, { fields: [swarms.userId], references: [users.id] }),
  bots: many(bots),
  deliveryQueue: many(deliveryQueue),
  memory: many(swarmMemory),
}));

export const deliveryQueueRelations = relations(deliveryQueue, ({ one }) => ({
  swarm: one(swarms, { fields: [deliveryQueue.swarmId], references: [swarms.id] }),
  user: one(users, { fields: [deliveryQueue.userId], references: [users.id] }),
  assignedBot: one(bots, { fields: [deliveryQueue.assignedBotId], references: [bots.id] }),
}));

export const swarmMemoryRelations = relations(swarmMemory, ({ one }) => ({
  swarm: one(swarms, { fields: [swarmMemory.swarmId], references: [swarms.id] }),
}));

export const botLogsRelations = relations(botLogs, ({ one }) => ({
  bot: one(bots, { fields: [botLogs.botId], references: [bots.id] }),
}));

export const chestLocationsRelations = relations(chestLocations, ({ one }) => ({
  user: one(users, { fields: [chestLocations.userId], references: [users.id] }),
  server: one(servers, { fields: [chestLocations.serverId], references: [servers.id] }),
}));