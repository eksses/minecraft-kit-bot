/**
 * GitHub Repo Test Plugin
 * 
 * This plugin tests installation from GitHub repository.
 * It's a simple plugin that demonstrates basic functionality.
 */

module.exports = function(pluginContext) {
  const { app, logger, settings } = pluginContext;
  
  logger.info('GitHub Repo Test Plugin loaded!');
  
  // Add a simple API endpoint
  app.get('/greet', async (c) => {
    const greeting = settings.get('greeting') || 'Hello from GitHub!';
    return c.json({ 
      message: greeting,
      plugin: 'demo-github-repo',
      source: 'github-repo',
      timestamp: new Date().toISOString()
    });
  });
  
  // Add a health check endpoint
  app.get('/health', async (c) => {
    return c.json({ 
      status: 'healthy',
      plugin: 'demo-github-repo',
      uptime: process.uptime()
    });
  });
  
  logger.info('GitHub Repo Test Plugin initialized successfully');
};
