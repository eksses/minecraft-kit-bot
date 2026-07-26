import { readdir, stat, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { parseManifest, validateManifest } from '../utils/plugin-manifest.js';
import { pluginAPI } from './plugin-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLUGINS_DIR = process.env.PLUGINS_DIR || join(__dirname, '../../../data/plugins');

/**
 * PluginLoader - Scans, loads, and manages plugins via dynamic import.
 *
 * On startup it scans data/plugins/, reads each plugin's manifest,
 * syncs state to the database, and loads each enabled plugin by
 * dynamically importing its entry file and calling the default export.
 */
class PluginLoader {
  constructor() {
    /** @type {Set<string>} IDs of currently loaded plugins */
    this.loaded = new Set();
    /** @type {Map<string, Object>} pluginId → manifest */
    this.manifests = new Map();
    this.running = false;
  }

  /**
   * Initialise: ensure plugins dir exists, scan, sync DB, start enabled plugins.
   */
  async start() {
    if (this.running) return;
    this.running = true;

    try {
      await mkdir(PLUGINS_DIR, { recursive: true });
    } catch {
      // directory already exists
    }

    const pluginDirs = await this._scanPlugins();
    await this._syncDatabase(pluginDirs);
    await this._loadEnabledPlugins();

    console.log(`[PluginLoader] Initialised – ${this.loaded.size} plugin(s) running`);
  }

  /**
   * Gracefully stop all loaded plugins.
   */
  async stop() {
    this.running = false;
    for (const pluginId of [...this.loaded]) {
      await this._stopPlugin(pluginId);
    }
    this.loaded.clear();
  }

  /**
   * Toggle a plugin on/off (hot-reload).
   */
  async togglePlugin(pluginId, enabled) {
    const now = new Date();
    await db
      .update(schema.plugins)
      .set({ enabled, updatedAt: now })
      .where(eq(schema.plugins.id, pluginId));

    if (enabled) {
      await this._startPlugin(pluginId);
    } else {
      await this._stopPlugin(pluginId);
    }

    console.log(`[PluginLoader] Plugin ${pluginId} ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  /**
   * Scan the plugins directory for subdirectories containing plugin.json.
   * @returns {Promise<Map<string, string>>} pluginId → absolute dir path
   */
  async _scanPlugins() {
    const entries = await readdir(PLUGINS_DIR);
    const dirs = new Map();

    for (const entry of entries) {
      const fullPath = join(PLUGINS_DIR, entry);
      const info = await stat(fullPath);
      if (!info.isDirectory()) continue;

      try {
        const manifest = await parseManifest(fullPath);
        const { valid, errors } = validateManifest(manifest);
        if (!valid) {
          console.warn(`[PluginLoader] Skipping ${entry}: ${errors.join('; ')}`);
          continue;
        }
        dirs.set(manifest.id, fullPath);
        this.manifests.set(manifest.id, manifest);
      } catch (err) {
        console.warn(`[PluginLoader] Skipping ${entry}: ${err.message}`);
      }
    }

    return dirs;
  }

  /**
   * Ensure every discovered plugin exists in the DB.
   */
  async _syncDatabase(pluginDirs) {
    const now = new Date();

    for (const [id, dir] of pluginDirs) {
      const manifest = this.manifests.get(id);
      const existing = await db.query.plugins.findFirst({
        where: eq(schema.plugins.id, id),
      });

      if (existing) {
        await db
          .update(schema.plugins)
          .set({
            name: manifest.name,
            version: manifest.version,
            description: manifest.description || null,
            author: manifest.author || null,
            updatedAt: now,
          })
          .where(eq(schema.plugins.id, id));
      } else {
        await db.insert(schema.plugins).values({
          id,
          name: manifest.name,
          version: manifest.version,
          description: manifest.description || null,
          author: manifest.author || null,
          enabled: true,
          installedAt: now,
          updatedAt: now,
          settings: null,
        });
      }
    }
  }

  /**
   * Load all enabled plugins from the database.
   */
  async _loadEnabledPlugins() {
    const enabledPlugins = await db.query.plugins.findMany({
      where: eq(schema.plugins.enabled, true),
    });

    for (const row of enabledPlugins) {
      if (this.manifests.has(row.id)) {
        await this._startPlugin(row.id);
      }
    }
  }

  /**
   * Dynamically import and call a plugin's default export.
   */
  async _startPlugin(pluginId) {
    if (this.loaded.has(pluginId)) return;

    const manifest = this.manifests.get(pluginId);
    if (!manifest) {
      console.warn(`[PluginLoader] No manifest found for ${pluginId}`);
      return;
    }

    const pluginDir = join(PLUGINS_DIR, manifest.id);
    const entryFile = manifest.entry || 'index.js';
    const entryPath = join(pluginDir, entryFile);

    try {
      // Create the plugin API context (Hono sub-router, events, settings, etc.)
      const ctx = pluginAPI.initContext(pluginId, pluginDir);

      // Dynamically import the plugin's default export
      const mod = await import(entryPath);
      const pluginFn = mod.default || mod;

      if (typeof pluginFn !== 'function') {
        throw new Error('Plugin entry does not export a function');
      }

      // Call the plugin with its context
      pluginFn(ctx);

      // Mount plugin routes onto the main app
      // (This is done later in app.js after all plugins are loaded)
      this.loaded.add(pluginId);
      console.log(`[PluginLoader] Started plugin: ${pluginId}`);
    } catch (err) {
      console.error(`[PluginLoader] Failed to start plugin ${pluginId}:`, err.message);
    }
  }

  /**
   * Unload a plugin.
   */
  async _stopPlugin(pluginId) {
    if (!this.loaded.has(pluginId)) return;

    pluginAPI.removeContext(pluginId);
    this.loaded.delete(pluginId);
    console.log(`[PluginLoader] Stopped plugin: ${pluginId}`);
  }
}

export { PluginLoader };
export const pluginLoader = new PluginLoader();
