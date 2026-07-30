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
    return <div className="p-12 text-center text-mdb-text-muted">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Servers</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">Minecraft server configurations</p>
        </div>
        <button className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary" onClick={() => setShowAdd(true)}>Add Server</button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-stretch justify-end" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-surface-high flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-mdb-surface-high">
              <span className="text-lg font-bold">Add Server</span>
              <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={() => setShowAdd(false)}>X</button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <form onSubmit={handleAdd}>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Server Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="My Server" />
                </div>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Host / IP</label>
                  <input type="text" value={form.host} onChange={(e) => setForm({...form, host: e.target.value})} required placeholder="mc.example.com" />
                </div>
                <div className="flex gap-2">
                  <div className="mb-4 flex-1">
                    <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Port</label>
                    <input type="number" value={form.port} onChange={(e) => setForm({...form, port: parseInt(e.target.value)})} required />
                  </div>
                  <div className="mb-4 flex-1">
                    <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Version</label>
                    <input type="text" value={form.version} onChange={(e) => setForm({...form, version: e.target.value})} required />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Auth Type</label>
                  <select value={form.authType} onChange={(e) => setForm({...form, authType: e.target.value})}>
                    <option value="offline">Offline</option>
                    <option value="microsoft">Microsoft</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary">Add Server</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
          <div className="text-lg font-semibold mb-2">No servers</div>
          <div className="text-sm text-mdb-text-muted mb-4">Add a Minecraft server to get started</div>
          <button className="inline-flex items-center gap-2 px-5 h-12 text-sm font-bold bg-mdb-primary text-mdb-on-primary mt-4" onClick={() => setShowAdd(true)}>Add Server</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {servers.map((server) => (
            <div key={server.id} className="bg-mdb-surface border border-mdb-surface-high p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="status-badge inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-widest status-online">
                    <span className="status-dot w-2 h-2 shrink-0"></span>
                    <span>Online</span>
                  </span>
                  <span className="font-semibold">{server.name}</span>
                </div>
                <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-status-error text-mdb-status-error hover:bg-mdb-status-error/10" onClick={() => handleDelete(server.id)}>Delete</button>
              </div>
              <div className="flex flex-col gap-1 text-mdb-text-secondary text-sm mb-4">
                <div className="font-mono text-sm">{server.host}:{server.port}</div>
                <div>v{server.version}</div>
                <div className="capitalize">{server.authType}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
