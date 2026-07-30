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
  CheckCircle,
} from 'lucide-react';
import {
  Card,
  Button,
  Toggle,
  StatCard,
  Badge,
  Input,
  ConfirmAction,
  EmptyState,
  LoadingState,
  LiveStatusDot,
} from '../components/ui';

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
      setPluginSettings((prev) => ({ ...prev, [pluginId]: res.settings || {} }));
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load settings' });
    }
  };

  const handleToggle = async (pluginId, enabled) => {
    try {
      await api.request(`/plugins/${pluginId}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      addToast({ type: 'success', title: `Plugin ${enabled ? 'enabled' : 'disabled'}` });
      await loadPlugins();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to toggle plugin' });
    }
  };

  const handleUninstall = async (pluginId) => {
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
        body: JSON.stringify(pluginSettings[pluginId] || {}),
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

  const enabledCount = plugins.filter((p) => p.enabled).length;

  if (loading) {
    return <LoadingState text="Loading plugins..." className="py-20" />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-mdb-primary/10 border border-mdb-primary/20 flex items-center justify-center">
            <Terminal size={22} className="text-mdb-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Plugins</h1>
            <p className="text-sm text-mdb-text-muted">
              Manage installed plugins, enable/disable, configure settings
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="md"
          icon={<RefreshCw size={16} />}
          onClick={loadPlugins}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="TOTAL INSTALLED" value={plugins.length} icon={Puzzle} />
        <StatCard label="ACTIVE" value={enabledCount} color="success" icon={CheckCircle} />
        <StatCard label="DISABLED" value={plugins.length - enabledCount} color="warning" icon={Power} />
        <StatCard label="STATUS" value="ALL SYSTEMS GO" color="success" icon={Terminal} />
      </div>

      {/* Plugin List */}
      <div className="space-y-4">
        {plugins.length === 0 ? (
          <EmptyState
            icon={Puzzle}
            title="No plugins installed"
            description="Go to Plugin Store to browse and install plugins"
          />
        ) : (
          plugins.map((plugin) => {
            const isExpanded = expandedPlugin === plugin.id;
            const settings = pluginSettings[plugin.id] || {};

            return (
              <Card
                key={plugin.id}
                padding="none"
                className={`transition-all ${
                  isExpanded ? 'border-mdb-primary/50 shadow-md shadow-mdb-primary/5' : ''
                }`}
              >
                {/* Plugin Header */}
                <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <LiveStatusDot status={plugin.enabled ? 'online' : 'offline'} />
                      <h3 className="text-base font-semibold text-mdb-text">{plugin.name}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-mdb-text-muted">
                      <Badge variant="default">v{plugin.version}</Badge>
                      <span className="flex items-center gap-1">
                        <User size={13} />
                        {plugin.author || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <Badge variant={plugin.enabled ? 'success' : 'default'} dot>
                      {plugin.enabled ? 'ENABLED' : 'DISABLED'}
                    </Badge>
                    <Toggle
                      checked={plugin.enabled}
                      onChange={(checked) => handleToggle(plugin.id, checked)}
                    />
                  </div>
                </div>

                {/* Expanded Settings */}
                {isExpanded && (
                  <div className="p-6 bg-mdb-surface-low border-t border-mdb-border space-y-4">
                    {Object.keys(settings).length > 0 ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveSettings(plugin.id);
                        }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(settings).map(([key, value]) => (
                            <div key={key} className="space-y-1.5">
                              {typeof value === 'boolean' ? (
                                <div className="pt-2">
                                  <Toggle
                                    checked={!!value}
                                    onChange={(checked) =>
                                      setPluginSettings({
                                        ...pluginSettings,
                                        [plugin.id]: { ...settings, [key]: checked },
                                      })
                                    }
                                    label={key.replace(/_/g, ' ').toUpperCase()}
                                  />
                                </div>
                              ) : (
                                <Input
                                  label={key.replace(/_/g, ' ').toUpperCase()}
                                  type={typeof value === 'number' ? 'number' : 'text'}
                                  value={value ?? ''}
                                  onChange={(e) =>
                                    setPluginSettings({
                                      ...pluginSettings,
                                      [plugin.id]: {
                                        ...settings,
                                        [key]:
                                          typeof value === 'number'
                                            ? parseInt(e.target.value) || 0
                                            : e.target.value,
                                      },
                                    })
                                  }
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <Button
                          type="submit"
                          variant="primary"
                          size="md"
                          loading={saving === plugin.id}
                          icon={<Save size={16} />}
                          className="w-full mt-2"
                        >
                          Save Settings
                        </Button>
                      </form>
                    ) : (
                      <div className="py-6 text-center text-mdb-text-muted">
                        <Settings size={28} className="mx-auto mb-1.5 opacity-40" />
                        <p className="text-xs">No settings configured for this plugin</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Bar */}
                <div className="px-5 py-2.5 border-t border-mdb-border bg-mdb-surface-high/30 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Settings size={14} />}
                    onClick={() => toggleExpand(plugin.id)}
                  >
                    Settings {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                  <ConfirmAction
                    title="Uninstall Plugin"
                    message={`Uninstall ${plugin.name}? This will remove all plugin files.`}
                    confirmLabel="Uninstall"
                    onConfirm={() => handleUninstall(plugin.id)}
                  >
                    <Button variant="danger" size="sm" icon={<Trash2 size={14} />}>
                      Uninstall
                    </Button>
                  </ConfirmAction>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
