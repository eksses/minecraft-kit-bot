/**
 * Demo Everything Plugin - Tests ALL Plugin Capabilities
 * 
 * This plugin demonstrates:
 * - Adding API routes
 * - Listening to bot events
 * - Listening to swarm events
 * - Controlling bots
 * - Broadcasting WebSocket events
 * - Managing settings
 * - Logging
 * - UI registration (nav items, routes, settings panels, widgets)
 */

module.exports = function(pluginContext) {
  const { app, db, events, bots, websocket, ui, settings, logger } = pluginContext;
  
  logger.info('Demo Everything Plugin loaded!');
  
  // ============================================
  // 1. ADD CUSTOM API ROUTES
  // ============================================
  
  app.get('/hello', async (c) => {
    return c.json({ 
      message: 'Hello from Demo Everything Plugin!',
      timestamp: new Date().toISOString(),
      pluginId: 'demo-everything'
    });
  });
  
  app.get('/status', async (c) => {
    const apiKey = settings.get('apiKey');
    return c.json({
      plugin: 'demo-everything',
      version: '1.0.0',
      uptime: process.uptime(),
      hasApiKey: !!apiKey,
      features: settings.get('enabled_features') || {}
    });
  });
  
  app.post('/echo', async (c) => {
    const body = await c.req.json();
    return c.json({ 
      echo: body,
      receivedAt: new Date().toISOString()
    });
  });
  
  // ============================================
  // 2. LISTEN TO BOT EVENTS
  // ============================================
  
  events.on('bot:status', ({ botId, status }) => {
    logger.info(`Bot ${botId} status changed: ${status}`);
    
    // Broadcast to WebSocket subscribers
    websocket.broadcast({
      type: 'plugin:demo-event',
      pluginId: 'demo-everything',
      event: 'bot_status',
      data: { botId, status }
    });
  });
  
  events.on('bot:health', ({ botId, health, food }) => {
    logger.debug(`Bot ${botId} health: ${health}, food: ${food}`);
    
    // Alert if health is low
    if (health < 10) {
      logger.warn(`Bot ${botId} has low health: ${health}`);
      websocket.broadcast({
        type: 'plugin:alert',
        pluginId: 'demo-everything',
        alert: `Bot ${botId} has low health: ${health}`,
        severity: 'warning'
      });
    }
  });
  
  events.on('bot:death', ({ botId }) => {
    logger.error(`Bot ${botId} died!`);
    websocket.broadcast({
      type: 'plugin:alert',
      pluginId: 'demo-everything',
      alert: `Bot ${botId} has died!`,
      severity: 'critical'
    });
  });
  
  events.on('bot:error', ({ botId, error }) => {
    logger.error(`Bot ${botId} error: ${error}`);
  });
  
  // ============================================
  // 3. LISTEN TO SWARM EVENTS
  // ============================================
  
  events.on('task:created', ({ taskId, swarmId }) => {
    logger.info(`Task ${taskId} created in swarm ${swarmId}`);
  });
  
  events.on('task:completed', ({ taskId }) => {
    logger.info(`Task ${taskId} completed`);
  });
  
  events.on('task:failed', ({ taskId, errorMessage }) => {
    logger.error(`Task ${taskId} failed: ${errorMessage}`);
  });
  
  // ============================================
  // 4. BOT CONTROL EXAMPLES
  // ============================================
  
  app.post('/say/:botId', async (c) => {
    const botId = c.req.param('botId');
    const { message } = await c.req.json();
    
    try {
      bots.command(botId, `say ${message}`);
      return c.json({ success: true, message: `Sent message to bot ${botId}` });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  });
  
  app.post('/command/:botId', async (c) => {
    const botId = c.req.param('botId');
    const { command } = await c.req.json();
    
    try {
      bots.command(botId, command);
      return c.json({ success: true, message: `Sent command to bot ${botId}` });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  });
  
  app.get('/bot-status/:botId', async (c) => {
    const botId = c.req.param('botId');
    const status = bots.getStatus(botId);
    return c.json({ botId, status });
  });
  
  // ============================================
  // 5. WEBSOCKET BROADCAST EXAMPLES
  // ============================================
  
  app.post('/broadcast', async (c) => {
    const { message } = await c.req.json();
    
    websocket.broadcast({
      type: 'plugin:demo-broadcast',
      pluginId: 'demo-everything',
      message,
      timestamp: new Date().toISOString()
    });
    
    return c.json({ success: true, message: 'Broadcast sent' });
  });
  
  // ============================================
  // 6. SETTINGS MANAGEMENT
  // ============================================
  
  app.get('/settings', async (c) => {
    const allSettings = settings.getAll();
    return c.json({ settings: allSettings });
  });
  
  app.put('/settings', async (c) => {
    const updates = await c.req.json();
    
    for (const [key, value] of Object.entries(updates)) {
      settings.set(key, value);
      logger.info(`Setting updated: ${key} = ${JSON.stringify(value)}`);
    }
    
    return c.json({ success: true, message: 'Settings updated' });
  });
  
  // ============================================
  // 7. DATABASE ACCESS EXAMPLES
  // ============================================
  
  app.get('/db/tables', async (c) => {
    // Example: List all plugins from database
    try {
      const allPlugins = await db.select().from(db.schema.plugins);
      return c.json({ plugins: allPlugins });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  });
  
  // ============================================
  // 8. UI REGISTRATION EXAMPLES
  // ============================================
  
  // Register a navigation item
  ui.addNavItem({
    id: 'demo-nav',
    label: 'Demo Nav',
    icon: 'Puzzle',
    path: '/plugins/demo-everything',
    position: 'after'
  });
  
  // Register a route
  ui.addRoute({
    path: '/plugins/demo-everything',
    component: 'DemoPage.jsx',
    layout: 'default'
  });
  
  // Register a settings panel
  ui.addSettingsPanel({
    id: 'demo-settings-panel',
    title: 'Demo Plugin Settings',
    component: 'DemoSettings.jsx'
  });
  
  // Register a dashboard widget
  ui.addDashboardWidget({
    id: 'demo-dashboard-widget',
    title: 'Demo Plugin Status',
    component: 'DemoWidget.jsx',
    size: 'small'
  });
  
  // ============================================
  // 9. LOGGING EXAMPLES
  // ============================================
  
  logger.info('Demo Everything Plugin initialized successfully');
  logger.warn('This is a warning message for testing');
  logger.debug('This is a debug message for testing');
  
  // ============================================
  // 10. PERIODIC TASK (if enabled)
  // ============================================
  
  const interval = settings.get('interval') || 30000;
  const features = settings.get('enabled_features') || {};
  
  if (features.status_monitor) {
    setInterval(() => {
      logger.debug('Periodic status check running');
      websocket.broadcast({
        type: 'plugin:periodic-check',
        pluginId: 'demo-everything',
        timestamp: new Date().toISOString()
      });
    }, interval);
  }
  
  // ============================================
  // CLEANUP ON UNLOAD
  // ============================================
  
  return {
    unload() {
      logger.info('Demo Everything Plugin unloading...');
      // Clean up any resources
      events.removeAllListeners();
    }
  };
};
