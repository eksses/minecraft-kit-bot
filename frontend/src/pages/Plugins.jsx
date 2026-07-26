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
    return <div className="loading-state">Loading plugins...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Terminal size={32} style={{ color: 'var(--status-online)' }} />
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '-0.01em' }}>Plugins</h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Manage installed plugins, enable/disable, configure settings</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={loadPlugins}
            style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RefreshCw size={20} style={{ color: 'var(--status-online)' }} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>TOTAL INSTALLED</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--status-online)', marginTop: '4px' }}>{plugins.length}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>ACTIVE</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--status-online)', marginTop: '4px' }}>{enabledCount}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>DISABLED</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--status-warning)', marginTop: '4px' }}>{plugins.length - enabledCount}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>STATUS</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--status-online)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--status-online)' }} />
            ALL SYSTEMS GO
          </div>
        </div>
      </div>

      {/* Plugin List */}
      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {plugins.length === 0 ? (
          <div className="empty-state">
            <Puzzle size={48} />
            <div className="empty-state-title">No plugins installed</div>
            <div className="empty-state-text">Go to Plugin Store to install plugins</div>
          </div>
        ) : (
          plugins.map((plugin) => {
            const isExpanded = expandedPlugin === plugin.id;
            const settings = pluginSettings[plugin.id] || {};

            return (
              <div
                key={plugin.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${isExpanded ? 'var(--status-online)' : 'var(--border)'}`,
                  boxShadow: isExpanded ? '0 0 15px rgba(0,255,65,0.1)' : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Plugin Header */}
                <div style={{
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        background: plugin.enabled ? 'var(--status-online)' : 'var(--status-error)',
                      }} />
                      <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{plugin.name}</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}>
                      <span style={{
                        padding: '2px 8px',
                        background: 'var(--bg-surface-high)',
                        border: '1px solid var(--border)',
                      }}>
                        v{plugin.version}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={14} />
                        {plugin.author || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      letterSpacing: '0.05em',
                      color: plugin.enabled ? 'var(--status-online)' : 'var(--text-muted)',
                    }}>
                      {plugin.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                    <button
                      onClick={() => handleToggle(plugin.id, !plugin.enabled)}
                      style={{
                        width: '48px',
                        height: '24px',
                        background: plugin.enabled ? 'var(--status-online)' : 'var(--bg-surface-high)',
                        position: 'relative',
                        cursor: 'pointer',
                        border: 'none',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        [plugin.enabled ? 'right' : 'left']: '2px',
                        width: '20px',
                        height: '20px',
                        background: 'var(--bg-surface)',
                        transition: 'all 0.2s',
                      }} />
                    </button>
                  </div>
                </div>

                {/* Expanded Settings */}
                {isExpanded && (
                  <div style={{ padding: '24px', background: 'var(--bg-surface-low)' }}>
                    {Object.keys(settings).length > 0 ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(plugin.id); }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                          {Object.entries(settings).map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                letterSpacing: '0.05em',
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                              }}>
                                {key.replace(/_/g, ' ')}
                              </label>
                              {typeof value === 'boolean' ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPluginSettings({
                                      ...pluginSettings,
                                      [plugin.id]: { ...settings, [key]: true }
                                    })}
                                    className={`btn btn-sm ${value ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, height: '48px' }}
                                  >
                                    Enabled
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPluginSettings({
                                      ...pluginSettings,
                                      [plugin.id]: { ...settings, [key]: false }
                                    })}
                                    className={`btn btn-sm ${!value ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, height: '48px' }}
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
                                  style={{
                                    height: '48px',
                                    background: 'var(--bg-surface-high)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-primary)',
                                    padding: '0 16px',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: '14px',
                                    outline: 'none',
                                  }}
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={value || ''}
                                  onChange={(e) => setPluginSettings({
                                    ...pluginSettings,
                                    [plugin.id]: { ...settings, [key]: e.target.value }
                                  })}
                                  style={{
                                    height: '48px',
                                    background: 'var(--bg-surface-high)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-primary)',
                                    padding: '0 16px',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: '14px',
                                    outline: 'none',
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ width: '100%', height: '48px', marginTop: '24px' }}
                          disabled={saving === plugin.id}
                        >
                          {saving === plugin.id ? 'SAVING...' : <><Save size={16} /> SAVE SETTINGS</>}
                        </button>
                      </form>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        <Settings size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <p>No settings configured for this plugin</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                {!isExpanded && (
                  <div style={{
                    padding: '12px 24px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                  }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleExpand(plugin.id)}
                      style={{ height: '36px' }}
                    >
                      <Settings size={14} /> Settings
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleUninstall(plugin.id)}
                      style={{ height: '36px' }}
                    >
                      <Trash2 size={14} /> Uninstall
                    </button>
                  </div>
                )}

                {/* Expand/Collapse Toggle */}
                <div
                  onClick={() => toggleExpand(plugin.id)}
                  style={{
                    padding: '8px 24px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-high)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
