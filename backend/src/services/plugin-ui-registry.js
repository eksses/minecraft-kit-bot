/**
 * PluginUIRegistry - Central registry for plugin UI elements.
 *
 * Plugins register navigation items, routes, settings panels, and
 * dashboard widgets. The frontend fetches this registry to dynamically
 * render plugin-provided UI.
 */
class PluginUIRegistry {
  constructor() {
    /** @type {Map<string, Object[]>} pluginId → nav items */
    this._navItems = new Map();
    /** @type {Map<string, Object[]>} pluginId → routes */
    this._routes = new Map();
    /** @type {Map<string, Object[]>} pluginId → settings panels */
    this._settingsPanels = new Map();
    /** @type {Map<string, Object[]>} pluginId → dashboard widgets */
    this._dashboardWidgets = new Map();
  }

  // ------------------------------------------------------------------
  // Navigation Items
  // ------------------------------------------------------------------

  /**
   * Register a navigation item for a plugin.
   * @param {Object} item - { pluginId, id, label, icon, path, position }
   */
  addNavItem(item) {
    const { pluginId } = item;
    if (!pluginId) throw new Error('NavItem must include pluginId');
    if (!this._navItems.has(pluginId)) {
      this._navItems.set(pluginId, []);
    }
    this._navItems.get(pluginId).push(item);
    console.log(`[PluginUIRegistry] Registered nav item: ${item.label} (${pluginId})`);
  }

  /**
   * Get all registered nav items across all plugins, sorted by position.
   * @returns {Object[]}
   */
  getNavItems() {
    const items = [];
    for (const pluginItems of this._navItems.values()) {
      items.push(...pluginItems);
    }
    return items.sort((a, b) => (a.position ?? 100) - (b.position ?? 100));
  }

  // ------------------------------------------------------------------
  // Routes
  // ------------------------------------------------------------------

  /**
   * Register a route for a plugin.
   * @param {Object} route - { pluginId, path, componentName, layout }
   */
  addRoute(route) {
    const { pluginId } = route;
    if (!pluginId) throw new Error('Route must include pluginId');
    if (!this._routes.has(pluginId)) {
      this._routes.set(pluginId, []);
    }
    this._routes.get(pluginId).push(route);
    console.log(`[PluginUIRegistry] Registered route: ${route.path} (${pluginId})`);
  }

  /**
   * Get all registered routes across all plugins.
   * @returns {Object[]}
   */
  getRoutes() {
    const routes = [];
    for (const pluginRoutes of this._routes.values()) {
      routes.push(...pluginRoutes);
    }
    return routes;
  }

  // ------------------------------------------------------------------
  // Settings Panels
  // ------------------------------------------------------------------

  /**
   * Register a settings panel for a plugin.
   * @param {Object} panel - { pluginId, id, title, componentName }
   */
  addSettingsPanel(panel) {
    const { pluginId } = panel;
    if (!pluginId) throw new Error('SettingsPanel must include pluginId');
    if (!this._settingsPanels.has(pluginId)) {
      this._settingsPanels.set(pluginId, []);
    }
    this._settingsPanels.get(pluginId).push(panel);
    console.log(`[PluginUIRegistry] Registered settings panel: ${panel.title} (${pluginId})`);
  }

  /**
   * Get all registered settings panels across all plugins.
   * @returns {Object[]}
   */
  getSettingsPanels() {
    const panels = [];
    for (const pluginPanels of this._settingsPanels.values()) {
      panels.push(...pluginPanels);
    }
    return panels;
  }

  // ------------------------------------------------------------------
  // Dashboard Widgets
  // ------------------------------------------------------------------

  /**
   * Register a dashboard widget for a plugin.
   * @param {Object} widget - { pluginId, id, title, componentName, size }
   */
  addDashboardWidget(widget) {
    const { pluginId } = widget;
    if (!pluginId) throw new Error('DashboardWidget must include pluginId');
    if (!this._dashboardWidgets.has(pluginId)) {
      this._dashboardWidgets.set(pluginId, []);
    }
    this._dashboardWidgets.get(pluginId).push(widget);
    console.log(`[PluginUIRegistry] Registered dashboard widget: ${widget.title} (${pluginId})`);
  }

  /**
   * Get all registered dashboard widgets across all plugins.
   * @returns {Object[]}
   */
  getDashboardWidgets() {
    const widgets = [];
    for (const pluginWidgets of this._dashboardWidgets.values()) {
      widgets.push(...pluginWidgets);
    }
    return widgets;
  }

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------

  /**
   * Remove all UI elements registered by a specific plugin.
   * @param {string} pluginId
   */
  removePluginUI(pluginId) {
    const navCount = this._navItems.get(pluginId)?.length ?? 0;
    const routeCount = this._routes.get(pluginId)?.length ?? 0;
    const panelCount = this._settingsPanels.get(pluginId)?.length ?? 0;
    const widgetCount = this._dashboardWidgets.get(pluginId)?.length ?? 0;

    this._navItems.delete(pluginId);
    this._routes.delete(pluginId);
    this._settingsPanels.delete(pluginId);
    this._dashboardWidgets.delete(pluginId);

    console.log(
      `[PluginUIRegistry] Removed UI for ${pluginId}: ` +
      `${navCount} nav, ${routeCount} routes, ${panelCount} panels, ${widgetCount} widgets`
    );
  }

  // ------------------------------------------------------------------
  // Get All (for API response)
  // ------------------------------------------------------------------

  /**
   * Get all registered UI elements.
   * @returns {Object} { navItems, routes, settingsPanels, dashboardWidgets }
   */
  getAll() {
    return {
      navItems: this.getNavItems(),
      routes: this.getRoutes(),
      settingsPanels: this.getSettingsPanels(),
      dashboardWidgets: this.getDashboardWidgets(),
    };
  }
}

export { PluginUIRegistry };
export const pluginUIRegistry = new PluginUIRegistry();
