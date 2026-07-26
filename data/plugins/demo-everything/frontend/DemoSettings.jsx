import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';

export default function DemoSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/plugins/demo-everything/settings');
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/plugins/demo-everything/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading settings...</div>;
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <Settings size={20} />
        <h3>Demo Plugin Settings</h3>
      </div>

      <div className="settings-body">
        <div className="form-group">
          <label className="form-label">API Key</label>
          <input
            type="text"
            className="form-input"
            value={settings.apiKey || ''}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            placeholder="Enter API key..."
          />
          <span className="form-hint">External API key for testing purposes</span>
        </div>

        <div className="form-group">
          <label className="form-label">Check Interval (ms)</label>
          <input
            type="number"
            className="form-input"
            value={settings.interval || 30000}
            onChange={(e) => setSettings({ ...settings, interval: parseInt(e.target.value) })}
            min={1000}
            max={300000}
          />
          <span className="form-hint">How often to run the periodic check (1000-300000ms)</span>
        </div>

        <div className="form-group">
          <label className="form-label">Enabled Features</label>
          <div className="checkbox-group">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings.enabled_features?.chat_logger ?? true}
                onChange={(e) => setSettings({
                  ...settings,
                  enabled_features: {
                    ...settings.enabled_features,
                    chat_logger: e.target.checked
                  }
                })}
              />
              <span>Chat Logger - Log all chat messages</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings.enabled_features?.status_monitor ?? true}
                onChange={(e) => setSettings({
                  ...settings,
                  enabled_features: {
                    ...settings.enabled_features,
                    status_monitor: e.target.checked
                  }
                })}
              />
              <span>Status Monitor - Monitor bot status changes</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings.enabled_features?.auto_respond ?? false}
                onChange={(e) => setSettings({
                  ...settings,
                  enabled_features: {
                    ...settings.enabled_features,
                    auto_respond: e.target.checked
                  }
                })}
              />
              <span>Auto Respond - Automatically respond to messages</span>
            </label>
          </div>
        </div>
      </div>

      <div className="settings-footer">
        <button className="btn btn-secondary" onClick={loadSettings}>
          <RefreshCw size={16} /> Reset
        </button>
        <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
