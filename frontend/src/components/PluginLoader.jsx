import { PluginUIProvider } from '../context/PluginUIContext';

/**
 * PluginLoader - Wraps the app to provide plugin UI registry data.
 *
 * Usage in main.jsx:
 *   <PluginLoader>
 *     <App />
 *   </PluginLoader>
 *
 * Then use usePluginUI() hook in any component to access:
 *   - navItems: plugin-registered navigation items
 *   - routes: plugin-registered routes
 *   - settingsPanels: plugin-registered settings panels
 *   - dashboardWidgets: plugin-registered dashboard widgets
 *   - loading: whether registry is being fetched
 *   - error: any fetch error
 *   - refresh: function to re-fetch the registry
 */
export default function PluginLoader({ children }) {
  return (
    <PluginUIProvider>
      {children}
    </PluginUIProvider>
  );
}

export { PluginUIProvider } from '../context/PluginUIContext';
