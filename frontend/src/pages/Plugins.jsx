import { useState, useEffect } from 'react';
import { useToast } from '../components/ToastContainer';
import { api } from '../services/api';
import {
  Puzzle,
  Terminal,
  RefreshCw,
  Settings,
  Power,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  User,
} from 'lucide-react';

export default function Plugins() {
  const { addToast } = useToast();
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlugin, setExpandedPlugin] = useState(null);
  const [pluginSettings, setPluginSettings] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      const data = await api.pluginStore.getInstalled();
      setPlugins(data.plugins || []);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load plugins' });
    } finally {
      setLoading(false);
    }
  };

  const loadPluginSettings = async (pluginId) => {
    try {
      const res = await api.request(`/plugins/${pluginId}/settings`);
      setPluginSettings(prev => ({ ...prev, [pluginId]: res.settings || {} }));
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load settings' });
    }
  };

  const handleToggle = async (pluginId, enabled) => {
    try {
      await api.request(`/plugins/${pluginId}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled })
      });
      addToast({ type: 'success', title: `Plugin ${enabled ? 'enabled' : 'disabled'}` });
      await loadPlugins();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to toggle plugin' });
    }
  };

  const handleUninstall = async (pluginId) => {
    if (!confirm(`Uninstall ${pluginId}? This will remove all plugin files.`)) return;
    try {
      await api.pluginStore.uninstall(pluginId);
      addToast({ type: 'success', title: 'Plugin uninstalled' });
      await loadPlugins();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to uninstall plugin' });
    }
  };

  const handleSaveSettings = async (pluginId) => {
    setSaving(pluginId);
    try {
      await api.request(`/plugins/${pluginId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(pluginSettings[pluginId] || {})
      });
      addToast({ type: 'success', title: 'Settings saved' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save settings' });
    } finally {
      setSaving(null);
    }
  };

  const toggleExpand = async (pluginId) => {
    if (expandedPlugin === pluginId) {
      setExpandedPlugin(null);
    } else {
      setExpandedPlugin(pluginId);
      if (!pluginSettings[pluginId]) {
        await loadPluginSettings(pluginId);
      }
    }
  };

  const enabledCount = plugins.filter(p => p.enabled).length;

  if (loading) {
    return <div className="p-12 text-center text-mdb-text-muted">Loading plugins...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-mdb-surface border-b border-mdb-outline-variant px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Terminal size={32} className="text-mdb-online" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Plugins</h1>
              <p className="text-sm text-mdb-text-muted">Manage installed plugins, enable/disable, configure settings</p>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center w-12 h-12 text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high"
            onClick={loadPlugins}
          >
            <RefreshCw size={20} className="text-mdb-online" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="p-6 grid grid-cols-4 gap-4">
        <div className="bg-mdb-surface border border-mdb-outline-variant p-4">
          <div className="text-[11px] font-bold tracking-wider text-mdb-text-muted">TOTAL INSTALLED</div>
          <div className="text-[32px] font-bold text-mdb-online mt-1">{plugins.length}</div>
        </div>
        <div className="bg-mdb-surface border border-mdb-outline-variant p-4">
          <div className="text-[11px] font-bold tracking-wider text-mdb-text-muted">ACTIVE</div>
          <div className="text-[32px] font-bold text-mdb-online mt-1">{enabledCount}</div>
        </div>
        <div className="bg-mdb-surface border border-mdb-outline-variant p-4">
          <div className="text-[11px] font-bold tracking-wider text-mdb-text-muted">DISABLED</div>
          <div className="text-[32px] font-bold text-mdb-working mt-1">{plugins.length - enabledCount}</div>
        </div>
        <div className="bg-mdb-surface border border-mdb-outline-variant p-4">
          <div className="text-[11px] font-bold tracking-wider text-mdb-text-muted">STATUS</div>
          <div className="text-sm font-semibold text-mdb-online mt-2 flex items-center gap-1.5">
            <div className="w-2 h-2 bg-mdb-online" />
            ALL SYSTEMS GO
          </div>
        </div>
      </div>

      {/* Plugin List */}
      <div className="px-6 flex flex-col gap-4">
        {plugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
            <Puzzle size={48} />
            <div className="text-lg font-semibold mt-4 mb-2">No plugins installed</div>
            <div className="text-sm">Go to Plugin Store to install plugins</div>
          </div>
        ) : (
          plugins.map((plugin) => {
            const isExpanded = expandedPlugin === plugin.id;
            const settings = pluginSettings[plugin.id] || {};

            return (
              <div
                key={plugin.id}
                className={`bg-mdb-surface border transition-all ${isExpanded ? 'border-mdb-online shadow-[0_0_15px_rgba(0,255,65,0.1)]' : 'border-mdb-outline-variant'}`}
              >
                {/* Plugin Header */}
                <div className={`p-6 flex items-center justify-between ${isExpanded ? 'border-b border-mdb-outline-variant' : ''}`}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 ${plugin.enabled ? 'bg-mdb-online' : 'bg-mdb-status-error'}`} />
                      <h3 className="text-lg font-semibold">{plugin.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-mdb-text-muted font-mono text-[13px]">
                      <span className="px-2 py-0.5 bg-mdb-surface-high border border-mdb-outline-variant">
                        v{plugin.version}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {plugin.author || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-[11px] font-bold tracking-wider ${plugin.enabled ? 'text-mdb-online' : 'text-mdb-text-muted'}`}>
                      {plugin.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                    <button
                      onClick={() => handleToggle(plugin.id, !plugin.enabled)}
                      className="w-12 h-6 relative cursor-pointer border-none transition-colors"
                      style={{ background: plugin.enabled ? 'var(--color-mdb-online)' : 'var(--color-mdb-surface-high)' }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 bg-mdb-surface transition-all"
                        style={{ [plugin.enabled ? 'right' : 'left']: '2px' }}
                      />
                    </button>
                  </div>
                </div>

                {/* Expanded Settings */}
                {isExpanded && (
                  <div className="p-6 bg-mdb-surface-low">
                    {Object.keys(settings).length > 0 ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(plugin.id); }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {Object.entries(settings).map(([key, value]) => (
                            <div key={key} className="flex flex-col gap-2">
                              <label className="text-[11px] font-bold tracking-wider text-mdb-text-muted uppercase">
                                {key.replace(/_/g, ' ')}
                              </label>
                              {typeof value === 'boolean' ? (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPluginSettings({
                                      ...pluginSettings,
                                      [plugin.id]: { ...settings, [key]: true }
                                    })}
                                    className={`flex-1 h-12 text-xs font-bold ${value ? 'bg-mdb-primary text-mdb-on-primary' : 'border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high'}`}
                                  >
                                    Enabled
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPluginSettings({
                                      ...pluginSettings,
                                      [plugin.id]: { ...settings, [key]: false }
                                    })}
                                    className={`flex-1 h-12 text-xs font-bold ${!value ? 'bg-mdb-primary text-mdb-on-primary' : 'border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high'}`}
                                  >
                                    Disabled
                                  </button>
                                </div>
                              ) : typeof value === 'number' ? (
                                <input
                                  type="number"
                                  value={value}
                                  onChange={(e) => setPluginSettings({
                                    ...pluginSettings,
                                    [plugin.id]: { ...settings, [key]: parseInt(e.target.value) || 0 }
                                  })}
                                  className="h-12 bg-mdb-surface-high border border-mdb-outline-variant text-mdb-text px-4 font-mono text-sm outline-none"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={value || ''}
                                  onChange={(e) => setPluginSettings({
                                    ...pluginSettings,
                                    [plugin.id]: { ...settings, [key]: e.target.value }
                                  })}
                                  className="h-12 bg-mdb-surface-high border border-mdb-outline-variant text-mdb-text px-4 font-mono text-sm outline-none"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 w-full h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary mt-6"
                          disabled={saving === plugin.id}
                        >
                          {saving === plugin.id ? 'SAVING...' : <><Save size={16} /> SAVE SETTINGS</>}
                        </button>
                      </form>
                    ) : (
                      <div className="text-center p-6 text-mdb-text-muted">
                        <Settings size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No settings configured for this plugin</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                {!isExpanded && (
                  <div className="px-6 py-3 border-t border-mdb-outline-variant flex justify-end gap-2">
                    <button
                      className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high"
                      onClick={() => toggleExpand(plugin.id)}
                    >
                      <Settings size={14} /> Settings
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-status-error text-mdb-status-error hover:bg-mdb-status-error/10"
                      onClick={() => handleUninstall(plugin.id)}
                    >
                      <Trash2 size={14} /> Uninstall
                    </button>
                  </div>
                )}

                {/* Expand/Collapse Toggle */}
                <div
                  onClick={() => toggleExpand(plugin.id)}
                  className="px-6 py-2 border-t border-mdb-outline-variant flex items-center justify-center cursor-pointer text-mdb-text-muted transition-colors hover:bg-mdb-surface-high"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
