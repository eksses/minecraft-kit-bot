import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { Plus, Globe, Trash2 } from 'lucide-react';
import {
  Card, Button, Input, Select, Drawer, EmptyState, LoadingState, StatusBadge
} from '../components/ui';

const AUTH_OPTIONS = [
  { value: 'offline', label: 'Offline' },
  { value: 'microsoft', label: 'Microsoft' },
];

const VERSION_OPTIONS = [
  { value: '1.17', label: '1.17' },
  { value: '1.18', label: '1.18' },
  { value: '1.19', label: '1.19' },
  { value: '1.20', label: '1.20' },
  { value: '1.21', label: '1.21' },
];

export default function ServerManager() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ name: '', host: '', port: 25565, version: '1.17', authType: 'offline' });
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadServers(); }, []);

  const loadServers = async () => {
    try { setServers(await api.fleet.getServers()); }
    catch (err) { addToast({ type: 'error', title: 'Failed to load servers' }); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.fleet.createServer(form);
      setDrawerOpen(false);
      setForm({ name: '', host: '', port: 25565, version: '1.17', authType: 'offline' });
      loadServers();
      addToast({ type: 'success', title: 'Server created' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create server' });
    } finally {
      setSubmitting(false);
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

  if (loading) return <LoadingState text="Loading servers..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Servers</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">Minecraft server configurations</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setDrawerOpen(true)}>
          Add Server
        </Button>
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add Server">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Server Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="My Server"
          />
          <Input
            label="Host / IP"
            value={form.host}
            onChange={(e) => setForm({ ...form, host: e.target.value })}
            required
            placeholder="mc.example.com"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Port"
              type="number"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })}
              required
            />
            <Select
              label="Version"
              options={VERSION_OPTIONS}
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
            />
          </div>
          <Select
            label="Auth Type"
            options={AUTH_OPTIONS}
            value={form.authType}
            onChange={(e) => setForm({ ...form, authType: e.target.value })}
          />
          <div className="flex gap-4 pt-4 border-t border-mdb-border">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Add Server
            </Button>
          </div>
        </form>
      </Drawer>

      {servers.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No servers"
          description="Add a Minecraft server to get started"
          action={<Button icon={<Plus size={16} />} onClick={() => setDrawerOpen(true)}>Add Server</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {servers.map((server) => (
            <Card key={server.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-mdb-surface-high flex items-center justify-center text-mdb-text-secondary">
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-mdb-text">{server.name}</div>
                    <div className="text-xs text-mdb-text-muted font-mono">{server.host}:{server.port}</div>
                  </div>
                </div>
                {server.status && <StatusBadge status={server.status} />}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-mdb-border">
                <div className="text-xs text-mdb-text-muted">
                  v{server.version} · {server.authType}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={12} />}
                  className="text-mdb-text-muted hover:text-mdb-error hover:border-mdb-error/30"
                  onClick={() => handleDelete(server.id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
