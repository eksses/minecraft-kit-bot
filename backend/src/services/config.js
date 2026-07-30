import fs from 'fs';
import path from 'path';
import { db, schema } from '../db/index.js';

// Keys that should never be stored in DB (secrets)
const SECRET_KEYS = new Set(['BOTNAME', 'PASSWORD']);

export class ConfigService {
  constructor() {
    this.config = this.loadConfig();
    this._dbLoaded = false;
  }
  
  loadConfig() {
    const envPath = path.resolve('.env');
    const config = {};
    
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return config;
  }

  async loadFromDB() {
    try {
      const rows = await db.select().from(schema.appSettings);
      for (const row of rows) {
        this.config[row.key] = row.value;
      }
      this._dbLoaded = true;
      console.log(`[Config] Loaded ${rows.length} settings from database`);
    } catch (err) {
      console.error('[Config] Failed to load settings from DB, using .env fallback:', err.message);
    }
  }
  
  get(key, defaultValue) {
    return this.config[key] || defaultValue;
  }
  
  require(key) {
    const value = this.config[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set. Please configure it in .env`);
    }
    return value;
  }
  
  getBotConfig() {
    return {
      host: this.get('IP', '6b6t.org'),
      port: parseInt(this.get('PORT', '25565'), 10),
      username: this.require('BOTNAME'),
      password: this.require('PASSWORD'),
      version: this.get('VERSION', '1.17'),
    };
  }
  
  getServerPort() {
    return parseInt(this.get('SERVER_PORT', '8081'), 10);
  }
  
  getWSPort() {
    return parseInt(this.get('WS_PORT', '3000'), 10);
  }
  
  getUICredentials() {
    return {
      username: this.require('UI_USER'),
      password: this.require('UI_PASSWORD'),
    };
  }
  
  getChestDataPath() {
    return path.resolve('chestData.json');
  }
  
  async updateConfig(updates) {
    const now = Math.floor(Date.now() / 1000);
    
    for (const [key, value] of Object.entries(updates)) {
      this.config[key] = value;
      process.env[key] = value;
      
      if (!SECRET_KEYS.has(key)) {
        await db.insert(schema.appSettings)
          .values({ key, value, updatedAt: new Date(now * 1000) })
          .onConflictDoUpdate({
            target: schema.appSettings.key,
            set: { value, updatedAt: new Date(now * 1000) },
          });
      }
    }
  }
  
  getAll() {
    return { ...this.config };
  }

  getPublicSettings() {
    const publicSettings = {};
    for (const [key, value] of Object.entries(this.config)) {
      if (!SECRET_KEYS.has(key)) {
        publicSettings[key] = value;
      }
    }
    return publicSettings;
  }
}

export const configService = new ConfigService();
