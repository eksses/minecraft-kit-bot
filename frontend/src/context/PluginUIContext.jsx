import { createContext, useContext, useState, useEffect } from 'react';

const PluginUIContext = createContext({
  navItems: [],
  routes: [],
  settingsPanels: [],
  dashboardWidgets: [],
  loading: true,
  error: null,
});

/**
 * PluginUIProvider - Fetches and provides plugin UI registry data.
 * Wraps the app to make plugin UI elements available via usePluginUI().
 */
export function PluginUIProvider({ children }) {
  const [registry, setRegistry] = useState({
    navItems: [],
    routes: [],
    settingsPanels: [],
    dashboardWidgets: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRegistry();
  }, []);

  const fetchRegistry = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/plugin-ui/registry', {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch plugin UI registry: ${res.status}`);
      }

      const data = await res.json();
      setRegistry(data);
    } catch (err) {
      console.error('[PluginUI] Failed to load registry:', err.message);
      setError(err.message);
      // Keep defaults - graceful degradation
    } finally {
      setLoading(false);
    }
  };

  return (
    <PluginUIContext.Provider value={{ ...registry, loading, error, refresh: fetchRegistry }}>
      {children}
    </PluginUIContext.Provider>
  );
}

/**
 * usePluginUI - Hook to access plugin UI registry data.
 *
 * @returns {{ navItems, routes, settingsPanels, dashboardWidgets, loading, error, refresh }}
 */
export function usePluginUI() {
  return useContext(PluginUIContext);
}
