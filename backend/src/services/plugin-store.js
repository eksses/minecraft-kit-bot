import { readdir, mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { parseManifest, validateManifest } from '../utils/plugin-manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLUGINS_DIR = process.env.PLUGINS_DIR || join(__dirname, '../../../data/plugins');
const REPOS_FILE = join(__dirname, '../../../data/plugin-repos.json');

// Default repository (official Minecraft Kit Bot plugins)
const DEFAULT_REPOS = [
  {
    id: 'official',
    name: 'Official Repository',
    url: 'https://raw.githubusercontent.com/eksses/minecraft-kit-bot/dev/plugins.json',
    enabled: true,
  },
];

/**
 * PluginStore - Manages plugin discovery, installation, and repository configuration.
 *
 * Maintains a list of plugin repositories, fetches available plugins,
 * and handles install/uninstall/update operations.
 */
class PluginStore {
  constructor() {
    /** @type {Array<{id: string, name: string, url: string, enabled: boolean}>} */
    this.repos = [...DEFAULT_REPOS];
    this.reposLoaded = false;
  }

  /**
   * Ensure repos file is loaded from disk.
   */
  async _ensureReposLoaded() {
    if (this.reposLoaded) return;

    try {
      const data = await readFile(REPOS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.repos = parsed;
      }
    } catch {
      // File doesn't exist or is invalid — use defaults
      await this._saveRepos();
    }

    this.reposLoaded = true;
  }

  /**
   * Persist repos to disk.
   */
  async _saveRepos() {
    try {
      await writeFile(REPOS_FILE, JSON.stringify(this.repos, null, 2));
    } catch (err) {
      console.error('[PluginStore] Failed to save repos:', err.message);
    }
  }

  /**
   * Fetch available plugins from all enabled repositories.
   *
   * Fetches plugins.json from each configured repository URL.
   *
   * @returns {Promise<Array<Object>>} List of available plugins
   */
  async getAvailable() {
    await this._ensureReposLoaded();

    const available = [];

    for (const repo of this.repos) {
      if (!repo.enabled) continue;

      try {
        const res = await fetch(repo.url);
        if (res.ok) {
          const plugins = await res.json();
          if (Array.isArray(plugins)) {
            available.push(...plugins.map(p => ({ ...p, repoId: repo.id, repoName: repo.name })));
          }
        }
      } catch (err) {
        console.error(`[PluginStore] Failed to fetch from ${repo.name}:`, err.message);
      }
    }

    return available;
  }

  /**
   * Get all installed plugins from the database.
   *
   * @returns {Promise<Array<Object>>} List of installed plugins
   */
  async getInstalled() {
    const plugins = await db.query.plugins.findMany();
    return plugins.map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      author: p.author,
      enabled: p.enabled,
      installedAt: p.installedAt,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * Add a custom plugin repository.
   *
   * @param {string} name - Human-readable repo name
   * @param {string} url - Repository URL
   * @returns {Promise<Object>} The created repo object
   */
  async addRepo(name, url) {
    await this._ensureReposLoaded();

    if (!name || !url) {
      throw new Error('Name and URL are required');
    }

    // Check for duplicate URL
    if (this.repos.some((r) => r.url === url)) {
      throw new Error('Repository URL already exists');
    }

    const repo = {
      id: `custom-${Date.now()}`,
      name,
      url,
      enabled: true,
    };

    this.repos.push(repo);
    await this._saveRepos();

    console.log(`[PluginStore] Added repo: ${name} (${url})`);
    return repo;
  }

  /**
   * Update a custom plugin repository.
   *
   * @param {string} repoId
   * @param {Object} updates - { name?, url? }
   * @returns {Promise<Object>} Updated repo object
   */
  async updateRepo(repoId, updates) {
    await this._ensureReposLoaded();

    const repo = this.repos.find((r) => r.id === repoId);
    if (!repo) {
      throw new Error('Repository not found');
    }

    if (repoId === 'official') {
      throw new Error('Cannot edit official repository');
    }

    if (updates.name) repo.name = updates.name;
    if (updates.url) repo.url = updates.url;

    await this._saveRepos();

    console.log(`[PluginStore] Updated repo: ${repoId}`);
    return repo;
  }

  /**
   * Remove a plugin repository.
   *
   * @param {string} repoId
   * @returns {Promise<boolean>}
   */
  async removeRepo(repoId) {
    await this._ensureReposLoaded();

    const idx = this.repos.findIndex((r) => r.id === repoId);
    if (idx === -1) {
      throw new Error('Repository not found');
    }

    // Cannot remove the official repo
    if (repoId === 'official') {
      throw new Error('Cannot remove the official repository');
    }

    this.repos.splice(idx, 1);
    await this._saveRepos();

    console.log(`[PluginStore] Removed repo: ${repoId}`);
    return true;
  }

  /**
   * List all configured repositories.
   *
   * @returns {Promise<Array<Object>>}
   */
  async getRepos() {
    await this._ensureReposLoaded();
    return [...this.repos];
  }

  /**
   * Install a plugin by downloading it to the plugins directory.
   *
   * @param {string} pluginId - Plugin identifier
   * @param {string} [downloadUrl] - Optional direct download URL
   * @returns {Promise<Object>} Installed plugin info
   */
  async install(pluginId, downloadUrl) {
    if (!pluginId) {
      throw new Error('Plugin ID is required');
    }

    // Check if already installed
    const existing = await db.query.plugins.findFirst({
      where: eq(schema.plugins.id, pluginId),
    });

    if (existing) {
      throw new Error(`Plugin "${pluginId}" is already installed`);
    }

    // Create plugin directory
    const pluginDir = join(PLUGINS_DIR, pluginId);
    try {
      await mkdir(pluginDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    // Check if plugin files already exist in data/plugins
    const { readFileSync, existsSync } = await import('fs');
    const manifestPath = join(pluginDir, 'plugin.json');
    
    if (existsSync(manifestPath)) {
      // Plugin already exists in data/plugins, just register it
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      
      const { valid, errors } = validateManifest(manifest);
      if (!valid) {
        throw new Error(`Invalid plugin manifest: ${errors.join('; ')}`);
      }

      // Insert into database
      const now = new Date();
      await db.insert(schema.plugins).values({
        id: pluginId,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        enabled: true, // Enable by default since files exist
        installedAt: now,
        updatedAt: now,
        settings: null,
      });

      console.log(`[PluginStore] Registered existing plugin: ${pluginId}`);
      return {
        id: pluginId,
        name: manifest.name,
        version: manifest.version,
        enabled: true,
      };
    }

    // Download plugin from repository if downloadUrl provided
    if (downloadUrl) {
      try {
        const res = await fetch(downloadUrl);
        if (res.ok) {
          // In a real implementation, this would extract a zip/tar file
          // For now, we'll create a stub
          const manifest = {
            id: pluginId,
            name: pluginId.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            version: '1.0.0',
            description: `Installed plugin: ${pluginId}`,
            author: 'Unknown',
            entry: 'index.js',
          };

          await writeFile(join(pluginDir, 'plugin.json'), JSON.stringify(manifest, null, 2));
          await writeFile(
            join(pluginDir, 'index.js'),
            `// Plugin: ${pluginId}\n// This is a stub entry point.\nconsole.log('[${pluginId}] loaded');\n`
          );

          const { valid, errors } = validateManifest(manifest);
          if (!valid) {
            await rm(pluginDir, { recursive: true, force: true });
            throw new Error(`Invalid plugin manifest: ${errors.join('; ')}`);
          }

          const now = new Date();
          await db.insert(schema.plugins).values({
            id: pluginId,
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            author: manifest.author,
            enabled: false,
            installedAt: now,
            updatedAt: now,
            settings: null,
          });

          console.log(`[PluginStore] Installed plugin: ${pluginId}`);
          return {
            id: pluginId,
            name: manifest.name,
            version: manifest.version,
            enabled: false,
          };
        }
      } catch (err) {
        console.error(`[PluginStore] Failed to download plugin:`, err.message);
      }
    }

    throw new Error('Plugin not found in repositories and no download URL provided');
  }

  /**
   * Uninstall a plugin by removing its files and database record.
   *
   * @param {string} pluginId
   * @returns {Promise<boolean>}
   */
  async uninstall(pluginId) {
    if (!pluginId) {
      throw new Error('Plugin ID is required');
    }

    const plugin = await db.query.plugins.findFirst({
      where: eq(schema.plugins.id, pluginId),
    });

    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }

    // Remove plugin directory
    const pluginDir = join(PLUGINS_DIR, pluginId);
    await rm(pluginDir, { recursive: true, force: true });

    // Remove from database (cascade will remove settings)
    await db.delete(schema.plugins).where(eq(schema.plugins.id, pluginId));

    console.log(`[PluginStore] Uninstalled plugin: ${pluginId}`);
    return true;
  }

  /**
   * Update a plugin to the latest version.
   *
   * @param {string} pluginId
   * @returns {Promise<Object>} Updated plugin info
   */
  async update(pluginId) {
    if (!pluginId) {
      throw new Error('Plugin ID is required');
    }

    const plugin = await db.query.plugins.findFirst({
      where: eq(schema.plugins.id, pluginId),
    });

    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }

    // In a real implementation, download the latest version and compare.
    // For now, just bump the patch version.
    const parts = plugin.version.split('.');
    parts[2] = String(parseInt(parts[2], 10) + 1);
    const newVersion = parts.join('.');

    const now = new Date();
    await db
      .update(schema.plugins)
      .set({ version: newVersion, updatedAt: now })
      .where(eq(schema.plugins.id, pluginId));

    console.log(`[PluginStore] Updated plugin: ${pluginId} → ${newVersion}`);
    return {
      id: pluginId,
      name: plugin.name,
      previousVersion: plugin.version,
      version: newVersion,
    };
  }
}

export { PluginStore };
export const pluginStore = new PluginStore();
