import { EventEmitter } from 'events';
import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { botLifecycleManager } from './botLifecycle.js';

/**
 * Creates a scoped API context for a plugin.
 *
 * @param {string} pluginId
 * @param {string} pluginDir  Absolute path to the plugin's directory
 * @returns {PluginContext}
 */
export function createPluginContext(pluginId, pluginDir) {
  /** Per-plugin Hono sub-router — plugins call app.get/post/etc. */
  const app = new Hono();

  /** Per-plugin event bus — emitters for bot/swarm events */
  const events = new EventEmitter();

  /** Logger prefixed with plugin id */
  const logger = {
    info: (...args) => console.log(`[${pluginId}]`, ...args),
    warn: (...args) => console.warn(`[${pluginId}]`, ...args),
    error: (...args) => console.error(`[${pluginId}]`, ...args),
    debug: (...args) => {
      if (process.env.DEBUG) console.debug(`[${pluginId}]`, ...args);
    },
  };

  /** Settings access (plugin_settings table) */
  const settings = {
    async get(key) {
      const row = await db.query.pluginSettings.findFirst({
        where: (cols, { and }) => and(
          eq(cols.pluginId, pluginId),
          eq(cols.key, key),
        ),
      });
      if (!row) return null;
      try {
        return JSON.parse(row.value);
      } catch {
        return row.value;
      }
    },

    async set(key, value) {
      const now = new Date();
      const serialized = JSON.stringify(value);
      const existing = await db.query.pluginSettings.findFirst({
        where: (cols, { and }) => and(
          eq(cols.pluginId, pluginId),
          eq(cols.key, key),
        ),
      });

      if (existing) {
        await db.update(schema.pluginSettings)
          .set({ value: serialized, updatedAt: now })
          .where((cols, { and }) => and(
            eq(cols.pluginId, pluginId),
            eq(cols.key, key),
          ));
      } else {
        await db.insert(schema.pluginSettings).values({
          pluginId,
          key,
          value: serialized,
          createdAt: now,
          updatedAt: now,
        });
      }
    },

    async getAll() {
      const rows = await db.query.pluginSettings.findMany({
        where: (cols) => eq(cols.pluginId, pluginId),
      });
      const result = {};
      for (const row of rows) {
        try {
          result[row.key] = JSON.parse(row.value);
        } catch {
          result[row.key] = row.value;
        }
      }
      return result;
    },
  };

  /** Bot controller — command sending & status queries */
  const bots = {
    /**
     * Send a chat command through a bot.
     * @param {string} botId
     * @param {string} command
     */
    command(botId, command) {
      const instance = botLifecycleManager.getBot(botId);
      if (!instance) {
        throw new Error(`Bot ${botId} is not running`);
      }
      instance.sendCommand(command);
    },

    /**
     * Get live status for a bot (or null if offline).
     * @param {string} botId
     */
    getStatus(botId) {
      const instance = botLifecycleManager.getBot(botId);
      return instance ? instance.getStatus() : null;
    },
  };

  /** UI registry — plugins can register navigation, routes, settings, widgets */
  const ui = {
    _navItems: [],
    _routes: [],
    _settingsPanels: [],
    _dashboardWidgets: [],

    addNavItem(item) {
      this._navItems.push({ pluginId, ...item });
      logger.debug('Registered nav item:', item.label);
    },

    addRoute(route) {
      this._routes.push({ pluginId, ...route });
      logger.debug('Registered route:', route.path);
    },

    addSettingsPanel(panel) {
      this._settingsPanels.push({ pluginId, ...panel });
      logger.debug('Registered settings panel:', panel.title);
    },

    addDashboardWidget(widget) {
      this._dashboardWidgets.push({ pluginId, ...widget });
      logger.debug('Registered dashboard widget:', widget.title);
    },

    /** Returns all registered UI elements for this plugin */
    getAll() {
      return {
        navItems: [...this._navItems],
        routes: [...this._routes],
        settingsPanels: [...this._settingsPanels],
        dashboardWidgets: [...this._dashboardWidgets],
      };
    },
  };

  return {
    pluginId,
    pluginDir,
    app,
    db,
    events,
    bots,
    websocket: null, // Attached later if a WS broadcast function is available
    ui,
    settings,
    logger,
  };
}

/**
 * Manages plugin API contexts and mounts plugin sub-routes into the
 * main Hono application.
 */
class PluginAPI {
  constructor() {
    /** @type {Map<string, PluginContext>} */
    this.contexts = new Map();
  }

  /**
   * Create and store a context for a plugin.
   * @param {string} pluginId
   * @param {string} pluginDir
   * @returns {PluginContext}
   */
  initContext(pluginId, pluginDir) {
    const ctx = createPluginContext(pluginId, pluginDir);
    this.contexts.set(pluginId, ctx);
    return ctx;
  }

  /**
   * Retrieve the API context for a plugin.
   * @param {string} pluginId
   * @returns {PluginContext | undefined}
   */
  getContext(pluginId) {
    return this.contexts.get(pluginId);
  }

  /**
   * Remove and clean up a plugin's context.
   * @param {string} pluginId
   */
  removeContext(pluginId) {
    const ctx = this.contexts.get(pluginId);
    if (ctx) {
      ctx.events.removeAllListeners();
      this.contexts.delete(pluginId);
    }
  }

  /**
   * Mount a plugin's sub-router onto the main application.
   *
   * Routes are mounted at  /api/plugins/:pluginId/*
   *
   * @param {string} pluginId
   * @param {import('hono').Hono} mainApp
   */
  mountRoutes(pluginId, mainApp) {
    const ctx = this.contexts.get(pluginId);
    if (!ctx) {
      console.warn(`[PluginAPI] Cannot mount routes — no context for ${pluginId}`);
      return;
    }

    mainApp.route(`/api/plugins/${pluginId}`, ctx.app);
    console.log(`[PluginAPI] Mounted routes for ${pluginId}`);
  }
}

export { PluginAPI };

/** Singleton — import this to access plugin contexts throughout the server */
export const pluginAPI = new PluginAPI();
