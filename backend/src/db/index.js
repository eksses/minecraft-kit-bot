import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../../data/mcdb.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(join(__dirname, '../../../data'), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export { schema };

// Initialize tables
export function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 25565,
      version TEXT NOT NULL DEFAULT '1.17',
      auth_type TEXT NOT NULL DEFAULT 'offline',
      spawn_x INTEGER,
      spawn_y INTEGER,
      spawn_z INTEGER,
      pathfinding_timeout INTEGER NOT NULL DEFAULT 5000,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS swarms (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      load_balancing TEXT NOT NULL DEFAULT 'nearest',
      max_concurrent INTEGER NOT NULL DEFAULT 5,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      server_id TEXT REFERENCES servers(id) ON DELETE SET NULL,
      swarm_id TEXT REFERENCES swarms(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      username TEXT NOT NULL,
      password_encrypted TEXT,
      status TEXT NOT NULL DEFAULT 'OFFLINE',
      current_x INTEGER,
      current_y INTEGER,
      current_z INTEGER,
      health REAL DEFAULT 20,
      food REAL DEFAULT 20,
      saturation REAL DEFAULT 5,
      experience_level INTEGER DEFAULT 0,
      last_seen INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_queue (
      id TEXT PRIMARY KEY,
      swarm_id TEXT NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'PENDING',
      priority INTEGER NOT NULL DEFAULT 0,
      item_name TEXT NOT NULL,
      item_count INTEGER NOT NULL DEFAULT 1,
      target_x INTEGER NOT NULL,
      target_y INTEGER NOT NULL,
      target_z INTEGER NOT NULL,
      target_player TEXT,
      source_chest_name TEXT,
      assigned_bot_id TEXT REFERENCES bots(id) ON DELETE SET NULL,
      locked_at INTEGER,
      started_at INTEGER,
      completed_at INTEGER,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      error_message TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS swarm_memory (
      id TEXT PRIMARY KEY,
      swarm_id TEXT NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT,
      expires_at INTEGER,
      updated_at INTEGER NOT NULL,
      UNIQUE(swarm_id, key)
    );

    CREATE TABLE IF NOT EXISTS bot_logs (
      id TEXT PRIMARY KEY,
      bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      level TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chest_locations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      server_id TEXT REFERENCES servers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      z INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
    CREATE INDEX IF NOT EXISTS idx_bots_server_id ON bots(server_id);
    CREATE INDEX IF NOT EXISTS idx_bots_swarm_id ON bots(swarm_id);
    CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
    CREATE INDEX IF NOT EXISTS idx_delivery_queue_swarm_id ON delivery_queue(swarm_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_queue_status ON delivery_queue(status);
    CREATE INDEX IF NOT EXISTS idx_delivery_queue_assigned_bot_id ON delivery_queue(assigned_bot_id);
    CREATE INDEX IF NOT EXISTS idx_swarm_memory_swarm_id ON swarm_memory(swarm_id);
    CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_id ON bot_logs(bot_id);
    CREATE INDEX IF NOT EXISTS idx_chest_locations_user_id ON chest_locations(user_id);
  `);
  
  // Create default admin user if not exists
  const existingUser = sqlite.prepare('SELECT id FROM users WHERE id = ?').get('legacy-admin');
  if (!existingUser) {
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('legacy-admin', 'admin', 'admin@localhost', 'legacy-hash', 'admin', now, now);
  }
  
  console.log('Database initialized successfully');
}