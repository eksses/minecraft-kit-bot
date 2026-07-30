import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { Plus, X, Server, Globe, Trash2 } from 'lucide-react';

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
        <button
          className="h-9 px-4 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={16} /> Add Server
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch justify-end animate-fade-in" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-border flex flex-col overflow-y-auto animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-mdb-border">
              <h2 className="text-lg font-semibold">Add Server</h2>
              <button className="h-8 w-8 rounded-lg hover:bg-mdb-surface-high flex items-center justify-center text-mdb-text-muted hover:text-mdb-text transition-colors" onClick={() => setShowAdd(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Server Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="My Server" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Host / IP</label>
                  <input type="text" value={form.host} onChange={(e) => setForm({...form, host: e.target.value})} required placeholder="mc.example.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Port</label>
                    <input type="number" value={form.port} onChange={(e) => setForm({...form, port: parseInt(e.target.value)})} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Version</label>
                    <input type="text" value={form.version} onChange={(e) => setForm({...form, version: e.target.value})} required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Auth Type</label>
                  <select value={form.authType} onChange={(e) => setForm({...form, authType: e.target.value})}>
                    <option value="offline">Offline</option>
                    <option value="microsoft">Microsoft</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4 border-t border-mdb-border">
                  <button type="button" className="flex-1 h-10 rounded-lg border border-mdb-border text-sm font-medium text-mdb-text-secondary hover:bg-mdb-surface-high transition-colors" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="flex-1 h-10 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium transition-colors">Add Server</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-mdb-text-muted">
          <Server size={48} className="mb-4 opacity-30" />
          <div className="text-lg font-medium mb-1 text-mdb-text">No servers</div>
          <div className="text-sm mb-6">Add a Minecraft server to get started</div>
          <button className="h-10 px-5 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium inline-flex items-center gap-2 transition-colors" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Server
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {servers.map((server) => (
            <div key={server.id} className="bg-mdb-surface rounded-xl border border-mdb-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-mdb-surface-high flex items-center justify-center text-mdb-text-secondary">
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-mdb-text">{server.name}</div>
                    <div className="text-xs text-mdb-text-muted font-mono">{server.host}:{server.port}</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-mdb-border">
                <div className="text-xs text-mdb-text-muted">
                  v{server.version} · {server.authType}
                </div>
                <button
                  className="h-7 px-2.5 rounded-lg border border-mdb-border text-xs font-medium text-mdb-text-muted hover:text-red-400 hover:border-red-400/30 transition-colors inline-flex items-center gap-1"
                  onClick={() => handleDelete(server.id)}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
