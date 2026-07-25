import fs from 'fs';
import path from 'path';

export class ConfigService {
  constructor() {
    this.config = this.loadConfig();
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
  
  updateConfig(updates) {
    for (const [key, value] of Object.entries(updates)) {
      this.config[key] = value;
    }
    
    const content = Object.entries(this.config)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    
    fs.writeFileSync(path.resolve('.env'), content, 'utf-8');
    
    // Reload dotenv
    for (const [key, value] of Object.entries(updates)) {
      process.env[key] = value;
    }
  }
  
  getAll() {
    return { ...this.config };
  }
}

export const configService = new ConfigService();