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
import { mkdirSync, existsSync, readFileSync } from 'fs';
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
      server_host TEXT,
      server_port INTEGER DEFAULT 25565,
      server_version TEXT DEFAULT 'auto',
      auth_mode TEXT NOT NULL DEFAULT 'ONLINE',
      auth_password TEXT,
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
      item_count INTEGER,
      all_items TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      sign_data TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      last_scanned INTEGER,
      bot_id TEXT REFERENCES bots(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scan_configs (
      id TEXT PRIMARY KEY,
      bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      scan_marked_enabled INTEGER NOT NULL DEFAULT 0,
      auto_scan_on_connect INTEGER NOT NULL DEFAULT 0,
      scan_interval_ms INTEGER,
      scan_radius INTEGER NOT NULL DEFAULT 32,
      allow_unnamed_orders INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_config (
      id TEXT PRIMARY KEY,
      delivery_mode TEXT NOT NULL DEFAULT 'TPA',
      target_coord_mode TEXT NOT NULL DEFAULT 'USER',
      post_delivery_action TEXT NOT NULL DEFAULT 'FLY_HOME',
      storage_key_ender TEXT NOT NULL DEFAULT 'ender',
      storage_key_chest TEXT NOT NULL DEFAULT 'chest',
      storage_key_elytra TEXT NOT NULL DEFAULT 'elytra',
      storage_key_rocket TEXT NOT NULL DEFAULT 'rocket',
      base_x INTEGER NOT NULL DEFAULT 0,
      base_y INTEGER NOT NULL DEFAULT 64,
      base_z INTEGER NOT NULL DEFAULT 0,
      random_x1 INTEGER NOT NULL DEFAULT -1000,
      random_z1 INTEGER NOT NULL DEFAULT -1000,
      random_x2 INTEGER NOT NULL DEFAULT 1000,
      random_z2 INTEGER NOT NULL DEFAULT 1000,
      whitelist_enabled INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_whitelist (
      id TEXT PRIMARY KEY,
      player_name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      added_by TEXT DEFAULT 'system',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT,
      author TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      installed_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      settings TEXT
    );

    CREATE TABLE IF NOT EXISTS plugin_settings (
      plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (plugin_id, key)
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

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER NOT NULL
    );
  `);
  
  // Migration: Add new columns to bots table if they don't exist
  const botColumns = sqlite.prepare("PRAGMA table_info(bots)").all();
  const botColumnNames = botColumns.map(c => c.name);
  
  if (!botColumnNames.includes('server_host')) {
    sqlite.exec(`ALTER TABLE bots ADD COLUMN server_host TEXT`);
  }
  if (!botColumnNames.includes('server_port')) {
    sqlite.exec(`ALTER TABLE bots ADD COLUMN server_port INTEGER DEFAULT 25565`);
  }
  if (!botColumnNames.includes('server_version')) {
    sqlite.exec(`ALTER TABLE bots ADD COLUMN server_version TEXT DEFAULT 'auto'`);
  }
  if (!botColumnNames.includes('auth_mode')) {
    sqlite.exec(`ALTER TABLE bots ADD COLUMN auth_mode TEXT NOT NULL DEFAULT 'ONLINE'`);
  }
  if (!botColumnNames.includes('auth_password')) {
    sqlite.exec(`ALTER TABLE bots ADD COLUMN auth_password TEXT`);
  }
  
  // Create default admin user if not exists
  const existingUser = sqlite.prepare('SELECT id FROM users WHERE id = ?').get('legacy-admin');
  if (!existingUser) {
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('legacy-admin', 'admin', 'admin@localhost', 'legacy-hash', 'admin', now, now);
  }
  
  // Seed app_settings from .env defaults (only if table is empty)
  const settingsCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM app_settings').get();
  if (settingsCount.cnt === 0) {
    const envPath = join(__dirname, '../../../.env');
    const envConfig = {};
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envConfig[key.trim()] = valueParts.join('=').trim();
        }
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const defaults = {
      UI_USER: envConfig.UI_USER || 'admin',
      UI_PASSWORD: envConfig.UI_PASSWORD || 'password',
      IP: envConfig.IP || '6b6t.org',
      PORT: envConfig.PORT || '25565',
      VERSION: envConfig.VERSION || '1.17',
      SERVER_PORT: envConfig.SERVER_PORT || '8081',
      WS_PORT: envConfig.WS_PORT || '3000',
    };

    const insert = sqlite.prepare('INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)');
    for (const [key, value] of Object.entries(defaults)) {
      insert.run(key, value, now);
    }
    console.log('Seeded app_settings with defaults from .env');
  }

  console.log('Database initialized successfully');
}