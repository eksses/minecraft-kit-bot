import { readdir, stat, mkdir } from 'fs/promises';
import { join } from 'path';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { parseManifest, validateManifest } from '../utils/plugin-manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLUGINS_DIR = process.env.PLUGINS_DIR || join(__dirname, '../../../data/plugins');

/**
 * PluginLoader - Scans, loads, and manages plugin worker threads.
 *
 * On startup it scans data/plugins/, reads each plugin's manifest,
 * syncs state to the database, and spawns a worker thread for each
 * enabled plugin.
 */
class PluginLoader {
  constructor() {
    /** @type {Map<string, Worker>} pluginId → Worker */
    this.workers = new Map();
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

    console.log(`[PluginLoader] Initialised – ${this.workers.size} plugin(s) running`);
  }

  /**
   * Gracefully stop all running plugin workers.
   */
  async stop() {
    this.running = false;
    const stops = [];
    for (const [id, worker] of this.workers) {
      stops.push(
        new Promise((resolve) => {
          worker.once('exit', resolve);
          worker.terminate();
        }).then(() => {
          console.log(`[PluginLoader] Stopped plugin: ${id}`);
        })
      );
    }
    await Promise.all(stops);
    this.workers.clear();
  }

  /**
   * Toggle a plugin on/off (hot-reload).
   *
   * @param {string} pluginId
   * @param {boolean} enabled
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
   * Plugins not on disk are left untouched (may have been uninstalled manually).
   */
  async _syncDatabase(pluginDirs) {
    const now = new Date();

    for (const [id, dir] of pluginDirs) {
      const manifest = this.manifests.get(id);
      const existing = await db.query.plugins.findFirst({
        where: eq(schema.plugins.id, id),
      });

      if (existing) {
        // Update version / meta if changed
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
   * Spawn a worker thread for a single plugin.
   */
  async _startPlugin(pluginId) {
    if (this.workers.has(pluginId)) return;

    const manifest = this.manifests.get(pluginId);
    if (!manifest) {
      console.warn(`[PluginLoader] No manifest found for ${pluginId}`);
      return;
    }

    const pluginDir = join(PLUGINS_DIR, manifest.id);
    const entryPath = join(pluginDir, manifest.entry);

    try {
      const worker = new Worker(entryPath, {
        workerData: {
          pluginId,
          pluginDir,
          manifest,
        },
      });

      worker.on('error', (err) => {
        console.error(`[PluginLoader] Plugin ${pluginId} worker error:`, err.message);
        this.workers.delete(pluginId);
      });

      worker.on('exit', (code) => {
        if (this.workers.has(pluginId)) {
          console.warn(`[PluginLoader] Plugin ${pluginId} exited with code ${code}`);
          this.workers.delete(pluginId);
        }
      });

      this.workers.set(pluginId, worker);
      console.log(`[PluginLoader] Started plugin: ${pluginId}`);
    } catch (err) {
      console.error(`[PluginLoader] Failed to start plugin ${pluginId}:`, err.message);
    }
  }

  /**
   * Terminate a single plugin worker.
   */
  async _stopPlugin(pluginId) {
    const worker = this.workers.get(pluginId);
    if (!worker) return;

    await new Promise((resolve) => {
      worker.once('exit', resolve);
      worker.terminate();
    });

    this.workers.delete(pluginId);
  }
}

export { PluginLoader };
export const pluginLoader = new PluginLoader();
