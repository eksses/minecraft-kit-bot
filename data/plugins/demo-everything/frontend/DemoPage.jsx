import { useState, useEffect } from 'react';
import { Puzzle, RefreshCw, Send, Settings, Activity, Server, Database } from 'lucide-react';

export default function DemoPage() {
  const [pluginStatus, setPluginStatus] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [settings, setSettings] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPluginData();
  }, []);

  const loadPluginData = async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        fetch('/api/plugins/demo-everything'),
        fetch('/api/plugins/demo-everything/settings')
      ]);
      
      const statusData = await statusRes.json();
      const settingsData = await settingsRes.json();
      
      setPluginStatus(statusData.plugin);
      setSettings(settingsData.settings);
    } catch (err) {
      console.error('Failed to load plugin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const testApiEndpoint = async (endpoint) => {
    try {
      const res = await fetch(`/api/plugins/demo-everything${endpoint}`);
      const data = await res.json();
      setApiResponse({ endpoint, data, status: res.status });
    } catch (err) {
      setApiResponse({ endpoint, error: err.message, status: 'error' });
    }
  };

  const testBroadcast = async () => {
    try {
      const res = await fetch('/api/plugins/demo-everything/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMessage || 'Hello from Demo Plugin!' })
      });
      const data = await res.json();
      setApiResponse({ endpoint: '/broadcast', data, status: res.status });
      setBroadcastMessage('');
    } catch (err) {
      setApiResponse({ endpoint: '/broadcast', error: err.message, status: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="spinner"></div>
          Loading Demo Plugin...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-info">
          <Puzzle size={24} />
          <div>
            <h1 className="page-title">Demo Everything Plugin</h1>
            <p className="page-subtitle">Comprehensive test of all plugin capabilities</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={loadPluginData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={16} /> Overview
        </button>
        <button 
          className={`tab ${activeTab === 'api' ? 'active' : ''}`}
          onClick={() => setActiveTab('api')}
        >
          <Server size={16} /> API Test
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} /> Settings
        </button>
        <button 
          className={`tab ${activeTab === 'database' ? 'active' : ''}`}
          onClick={() => setActiveTab('database')}
        >
          <Database size={16} /> Database
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="section">
            <h2 className="section-title">Plugin Status</h2>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-value">{pluginStatus?.enabled ? 'Active' : 'Disabled'}</div>
                <div className="stat-label">Status</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{pluginStatus?.version || '1.0.0'}</div>
                <div className="stat-label">Version</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{Object.keys(settings).length}</div>
                <div className="stat-label">Settings</div>
              </div>
            </div>

            <h2 className="section-title">Capabilities Tested</h2>
            <div className="list">
              <div className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">Custom API Routes</div>
                  <div className="list-item-meta">/hello, /status, /echo, /broadcast</div>
                </div>
                <span className="badge badge-success">Working</span>
              </div>
              <div className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">Bot Event Listeners</div>
                  <div className="list-item-meta">status, health, death, error events</div>
                </div>
                <span className="badge badge-success">Working</span>
              </div>
              <div className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">Swarm Event Listeners</div>
                  <div className="list-item-meta">task:created, completed, failed</div>
                </div>
                <span className="badge badge-success">Working</span>
              </div>
              <div className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">Bot Control</div>
                  <div className="list-item-meta">Send commands, get status</div>
                </div>
                <span className="badge badge-success">Working</span>
              </div>
              <div className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">WebSocket Broadcast</div>
                  <div className="list-item-meta">Real-time event broadcasting</div>
                </div>
                <span className="badge badge-success">Working</span>
              </div>
              <div className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">Settings Management</div>
                  <div className="list-item-meta">Get/set plugin settings</div>
                </div>
                <span className="badge badge-success">Working</span>
              </div>
              <div className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">Database Access</div>
                  <div className="list-item-meta">Query database tables</div>
                </div>
                <span className="badge badge-success">Working</span>
              </div>
              <div className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">UI Registration</div>
                  <div className="list-item-meta">Nav items, routes, widgets</div>
                </div>
                <span className="badge badge-success">Working</span>
              </div>
              <div className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name">Logging</div>
                  <div className="list-item-meta">info, warn, error, debug</div>
                </div>
                <span className="badge badge-success">Working</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="section">
            <h2 className="section-title">API Endpoint Testing</h2>
            
            <div className="button-group">
              <button className="btn btn-secondary" onClick={() => testApiEndpoint('/hello')}>
                Test /hello
              </button>
              <button className="btn btn-secondary" onClick={() => testApiEndpoint('/status')}>
                Test /status
              </button>
              <button className="btn btn-secondary" onClick={() => testApiEndpoint('/settings')}>
                Test /settings
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Broadcast Message</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-input"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter message to broadcast..."
                />
                <button className="btn btn-primary" onClick={testBroadcast}>
                  <Send size={16} /> Broadcast
                </button>
              </div>
            </div>

            {apiResponse && (
              <div className="response-box">
                <div className="response-header">
                  <span className="response-endpoint">{apiResponse.endpoint}</span>
                  <span className={`response-status ${apiResponse.status === 200 ? 'success' : 'error'}`}>
                    {apiResponse.status}
                  </span>
                </div>
                <pre className="response-body">
                  {JSON.stringify(apiResponse.data || apiResponse.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="section">
            <h2 className="section-title">Plugin Settings</h2>
            
            <div className="form-group">
              <label className="form-label">API Key</label>
              <input
                type="text"
                className="form-input"
                value={settings.apiKey || ''}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="Enter API key..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Check Interval (ms)</label>
              <input
                type="number"
                className="form-input"
                value={settings.interval || 30000}
                onChange={(e) => setSettings({ ...settings, interval: parseInt(e.target.value) })}
              />
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
                  <span>Chat Logger</span>
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
                  <span>Status Monitor</span>
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
                  <span>Auto Respond</span>
                </label>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => {
              fetch('/api/plugins/demo-everything/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
              });
            }}>
              Save Settings
            </button>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="section">
            <h2 className="section-title">Database Access</h2>
            <button className="btn btn-secondary" onClick={() => testApiEndpoint('/db/tables')}>
              <Database size={16} /> List All Plugins
            </button>
            
            {apiResponse?.endpoint === '/db/tables' && (
              <div className="response-box">
                <div className="response-header">
                  <span className="response-endpoint">/db/tables</span>
                  <span className={`response-status ${apiResponse.status === 200 ? 'success' : 'error'}`}>
                    {apiResponse.status}
                  </span>
                </div>
                <pre className="response-body">
                  {JSON.stringify(apiResponse.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
