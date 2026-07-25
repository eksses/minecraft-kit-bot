import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';

export default function ServerManager() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', host: '', port: 25565, version: '1.17', authType: 'offline' });
  const { addToast } = useToast();

  useEffect(() => { loadServers(); }, []);

  const loadServers = async () => {
    try { setServers(await api.fleet.getServers()); }
    catch (err) { addToast({ type: 'error', title: 'Failed to load servers' }); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.fleet.createServer(form);
      setShowAdd(false);
      setForm({ name: '', host: '', port: 25565, version: '1.17', authType: 'offline' });
      loadServers();
      addToast({ type: 'success', title: 'Server created' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create server' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this server?')) return;
    try {
      await api.fleet.deleteServer(id);
      loadServers();
      addToast({ type: 'success', title: 'Server deleted' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete server' });
    }
  };

  if (loading) {
    return <div style={{padding: '48px', textAlign: 'center', color: 'var(--text-muted)'}}>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Servers</h1>
          <p className="page-subtitle">Minecraft server configurations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add Server</button>
      </div>

      {showAdd && (
        <div className="drawer-overlay" onClick={() => setShowAdd(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Add Server</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>X</button>
            </div>
            <div className="drawer-body">
              <form onSubmit={handleAdd}>
                <div className="form-group">
                  <label className="form-label">Server Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="My Server" />
                </div>
                <div className="form-group">
                  <label className="form-label">Host / IP</label>
                  <input type="text" value={form.host} onChange={(e) => setForm({...form, host: e.target.value})} required placeholder="mc.example.com" />
                </div>
                <div className="flex gap-sm">
                  <div className="form-group flex-1">
                    <label className="form-label">Port</label>
                    <input type="number" value={form.port} onChange={(e) => setForm({...form, port: parseInt(e.target.value)})} required />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Version</label>
                    <input type="text" value={form.version} onChange={(e) => setForm({...form, version: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Auth Type</label>
                  <select value={form.authType} onChange={(e) => setForm({...form, authType: e.target.value})}>
                    <option value="offline">Offline</option>
                    <option value="microsoft">Microsoft</option>
                  </select>
                </div>
                <div className="flex gap-sm mt-md">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Server</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {servers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No servers</div>
          <div className="empty-state-text">Add a Minecraft server to get started</div>
          <button className="btn btn-primary mt-md" onClick={() => setShowAdd(true)}>Add Server</button>
        </div>
      ) : (
        <div className="grid-2col">
          {servers.map((server) => (
            <div key={server.id} className="bot-card">
              <div className="bot-card-header">
                <div className="flex items-center gap-sm">
                  <span className="status-dot" style={{background: 'var(--status-online)'}}></span>
                  <span style={{fontWeight: 600}}>{server.name}</span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(server.id)}>Delete</button>
              </div>
              <div className="bot-card-info">
                <div style={{fontFamily: 'var(--font-mono)', fontSize: '13px'}}>{server.host}:{server.port}</div>
                <div>v{server.version}</div>
                <div style={{textTransform: 'capitalize'}}>{server.authType}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
