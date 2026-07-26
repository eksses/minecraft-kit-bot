import { useState, useEffect } from 'react';
import { useToast } from '../components/ToastContainer';
import { api } from '../services/api';
import { Puzzle, Settings, Power, Trash2, RefreshCw, Info, ChevronDown, ChevronUp } from 'lucide-react';

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
      const res = await fetch('/api/plugins');
      const data = await res.json();
      setPlugins(data.plugins || []);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load plugins' });
    } finally {
      setLoading(false);
    }
  };

  const loadPluginSettings = async (pluginId) => {
    try {
      const res = await fetch(`/api/plugins/${pluginId}/settings`);
      const data = await res.json();
      setPluginSettings(prev => ({ ...prev, [pluginId]: data.settings || {} }));
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load settings' });
    }
  };

  const handleToggle = async (pluginId, enabled) => {
    try {
      await fetch(`/api/plugins/${pluginId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`/api/plugin-store/uninstall/${pluginId}`, { method: 'DELETE' });
      addToast({ type: 'success', title: 'Plugin uninstalled' });
      await loadPlugins();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to uninstall plugin' });
    }
  };

  const handleSaveSettings = async (pluginId) => {
    setSaving(pluginId);
    try {
      await fetch(`/api/plugins/${pluginId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  if (loading) {
    return <div className="loading-state">Loading plugins...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Plugins</h1>
          <p className="page-subtitle">Manage installed plugins, enable/disable, configure settings</p>
        </div>
        <button className="btn btn-secondary" onClick={loadPlugins}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {plugins.length === 0 ? (
        <div className="empty-state">
          <Puzzle size={48} />
          <div className="empty-state-title">No plugins installed</div>
          <div className="empty-state-text">Go to Plugin Store to install plugins</div>
        </div>
      ) : (
        <div className="list">
          {plugins.map((plugin) => (
            <div key={plugin.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              {/* Plugin Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div className="list-item-info">
                  <div className="list-item-name">
                    {plugin.name}
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: plugin.enabled ? 'var(--status-online)' : 'var(--bg-surface-high)',
                        color: plugin.enabled ? '#000' : 'var(--text-muted)',
                      }}
                    >
                      {plugin.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="list-item-meta">
                    v{plugin.version} by {plugin.author || 'Unknown'}
                  </div>
                  {plugin.description && (
                    <div className="list-item-meta">{plugin.description}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleExpand(plugin.id)}
                    title="Settings"
                  >
                    {expandedPlugin === plugin.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <Settings size={16} />
                  </button>
                  <button
                    className={`btn btn-sm ${plugin.enabled ? 'btn-warning' : 'btn-success'}`}
                    onClick={() => handleToggle(plugin.id, !plugin.enabled)}
                    title={plugin.enabled ? 'Disable' : 'Enable'}
                  >
                    <Power size={16} />
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleUninstall(plugin.id)}
                    title="Uninstall"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Plugin Settings (expanded) */}
              {expandedPlugin === plugin.id && (
                <div style={{ 
                  marginTop: '16px', 
                  paddingTop: '16px', 
                  borderTop: '1px solid var(--border)',
                  width: '100%'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Info size={16} />
                    <span style={{ fontWeight: '600' }}>Plugin Settings</span>
                  </div>
                  
                  {pluginSettings[plugin.id] ? (
                    <div>
                      {Object.entries(pluginSettings[plugin.id]).map(([key, value]) => (
                        <div key={key} className="form-group">
                          <label className="form-label">{key}</label>
                          {typeof value === 'boolean' ? (
                            <select
                              value={value ? 'true' : 'false'}
                              onChange={(e) => setPluginSettings({
                                ...pluginSettings,
                                [plugin.id]: {
                                  ...pluginSettings[plugin.id],
                                  [key]: e.target.value === 'true'
                                }
                              })}
                            >
                              <option value="true">Enabled</option>
                              <option value="false">Disabled</option>
                            </select>
                          ) : typeof value === 'number' ? (
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => setPluginSettings({
                                ...pluginSettings,
                                [plugin.id]: {
                                  ...pluginSettings[plugin.id],
                                  [key]: parseInt(e.target.value) || 0
                                }
                              })}
                            />
                          ) : (
                            <input
                              type="text"
                              value={value || ''}
                              onChange={(e) => setPluginSettings({
                                ...pluginSettings,
                                [plugin.id]: {
                                  ...pluginSettings[plugin.id],
                                  [key]: e.target.value
                                }
                              })}
                            />
                          )}
                        </div>
                      ))}
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveSettings(plugin.id)}
                        disabled={saving === plugin.id}
                      >
                        {saving === plugin.id ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-muted">No settings configured</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
