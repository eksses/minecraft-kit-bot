import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Settings() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await api.config.get();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load config');
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.config.update(config);
      setResult({ success: true, message: 'Settings saved' });
    } catch (err) {
      setResult({ success: false, message: 'Failed to save' });
    }
    setSaving(false);
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <h1>Settings</h1>
      
      <div className="card">
        <form onSubmit={handleSave}>
          <h3>Bot Configuration</h3>
          
          <div className="form-group">
            <label>Server IP</label>
            <input value={config.IP || ''} onChange={(e) => setConfig({...config, IP: e.target.value})} />
          </div>
          
          <div className="form-group">
            <label>Server Port</label>
            <input value={config.PORT || ''} onChange={(e) => setConfig({...config, PORT: e.target.value})} />
          </div>
          
          <div className="form-group">
            <label>Bot Username</label>
            <input value={config.BOTNAME || ''} onChange={(e) => setConfig({...config, BOTNAME: e.target.value})} />
          </div>
          
          <div className="form-group">
            <label>Bot Password</label>
            <input type="password" value={config.PASSWORD || ''} onChange={(e) => setConfig({...config, PASSWORD: e.target.value})} />
          </div>
          
          <div className="form-group">
            <label>Minecraft Version</label>
            <input value={config.VERSION || ''} onChange={(e) => setConfig({...config, VERSION: e.target.value})} />
          </div>
          
          <h3>API Server</h3>
          
          <div className="form-group">
            <label>Server Port</label>
            <input value={config.SERVER_PORT || ''} onChange={(e) => setConfig({...config, SERVER_PORT: e.target.value})} />
          </div>
          
          <h3>UI Credentials</h3>
          
          <div className="form-group">
            <label>Username</label>
            <input value={config.UI_USER || ''} onChange={(e) => setConfig({...config, UI_USER: e.target.value})} />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={config.UI_PASSWORD || ''} onChange={(e) => setConfig({...config, UI_PASSWORD: e.target.value})} />
          </div>
          
          {result && (
            <div className={`alert ${result.success ? 'success' : 'error'}`}>
              {result.message}
            </div>
          )}
          
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}