import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';

const TABS = ['general', 'bot', 'delivery', 'users'];

export default function Settings() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer' });

  const [generalForm, setGeneralForm] = useState({ SERVER_PORT: '8081', WS_PORT: '3000' });
  const [botForm, setBotForm] = useState({ IP: '6b6t.org', PORT: '25565', VERSION: '1.17' });
  const [deliveryForm, setDeliveryForm] = useState({
    DELIVERY_MODE: 'TPA',
    TARGET_COORD_MODE: 'USER',
    POST_DELIVERY_ACTION: 'FLY_HOME',
    STORAGE_KEYS: { ender: 'ender', chest: 'chest', elytra: 'elytra', rocket: 'rocket' },
    BASE_COORDINATES: { x: 0, y: 64, z: 0 },
    RANDOM_REGION_BOUNDS: { x1: -1000, z1: -1000, x2: 1000, z2: 1000 },
  });
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingBot, setSavingBot] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [usersData, generalData, deliveryData] = await Promise.all([
        api.fleet.getUsers().catch(() => []),
        api.settings.get().catch(() => ({})),
        api.fleet.getDeliveryConfig().catch(() => null),
      ]);
      setUsers(usersData);
      if (generalData?.SERVER_PORT) setGeneralForm(prev => ({ ...prev, SERVER_PORT: generalData.SERVER_PORT }));
      if (generalData?.WS_PORT) setGeneralForm(prev => ({ ...prev, WS_PORT: generalData.WS_PORT }));
      if (generalData?.IP) setBotForm(prev => ({ ...prev, IP: generalData.IP }));
      if (generalData?.PORT) setBotForm(prev => ({ ...prev, PORT: generalData.PORT }));
      if (generalData?.VERSION) setBotForm(prev => ({ ...prev, VERSION: generalData.VERSION }));
      if (deliveryData) setDeliveryForm(deliveryData);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.fleet.createUser(form);
      setShowAdd(false);
      setForm({ username: '', password: '', role: 'viewer' });
      setUsers(await api.fleet.getUsers());
      addToast({ type: 'success', title: 'User added' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add user' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.fleet.deleteUser(id);
      setUsers(await api.fleet.getUsers());
      addToast({ type: 'success', title: 'User deleted' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete user' });
    }
  };

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      await api.settings.update(generalForm);
      addToast({ type: 'success', title: 'General settings saved' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save' });
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveBot = async () => {
    setSavingBot(true);
    try {
      await api.settings.update(botForm);
      addToast({ type: 'success', title: 'Bot defaults saved' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save' });
    } finally {
      setSavingBot(false);
    }
  };

  const handleSaveDelivery = async () => {
    setSavingDelivery(true);
    try {
      await api.fleet.updateDeliveryConfig(deliveryForm);
      addToast({ type: 'success', title: 'Delivery settings saved' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save' });
    } finally {
      setSavingDelivery(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-mdb-text-muted">Loading...</div>;
  }

  const renderGeneral = () => (
    <div className="bg-mdb-surface border border-mdb-surface-high p-6">
      <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant">General Settings</div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Server Port</label>
          <input type="number" value={generalForm.SERVER_PORT} onChange={(e) => setGeneralForm({ ...generalForm, SERVER_PORT: e.target.value })} placeholder="8081" />
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">WebSocket Port</label>
          <input type="number" value={generalForm.WS_PORT} onChange={(e) => setGeneralForm({ ...generalForm, WS_PORT: e.target.value })} placeholder="3000" />
        </div>
      </div>
      <button className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary mt-2" onClick={handleSaveGeneral} disabled={savingGeneral}>
        {savingGeneral ? 'Saving...' : 'Save General Settings'}
      </button>
    </div>
  );

  const renderBot = () => (
    <div className="bg-mdb-surface border border-mdb-surface-high p-6">
      <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant">Default Bot Settings</div>
      <div className="mb-4">
        <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Default Host</label>
        <input type="text" value={botForm.IP} onChange={(e) => setBotForm({ ...botForm, IP: e.target.value })} placeholder="6b6t.org" />
      </div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Default Port</label>
          <input type="number" value={botForm.PORT} onChange={(e) => setBotForm({ ...botForm, PORT: e.target.value })} placeholder="25565" />
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Default Version</label>
          <select value={botForm.VERSION} onChange={(e) => setBotForm({ ...botForm, VERSION: e.target.value })}>
            <option value="auto">Auto Detect</option>
            <option value="1.21.4">1.21.4</option>
            <option value="1.21.3">1.21.3</option>
            <option value="1.21.2">1.21.2</option>
            <option value="1.21.1">1.21.1</option>
            <option value="1.21">1.21</option>
            <option value="1.20.6">1.20.6</option>
            <option value="1.20.4">1.20.4</option>
            <option value="1.20.2">1.20.2</option>
            <option value="1.20.1">1.20.1</option>
            <option value="1.20">1.20</option>
            <option value="1.19.4">1.19.4</option>
            <option value="1.19.3">1.19.3</option>
            <option value="1.18.2">1.18.2</option>
            <option value="1.17.1">1.17.1</option>
            <option value="1.16.5">1.16.5</option>
            <option value="1.12.2">1.12.2</option>
          </select>
        </div>
      </div>
      <button className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary mt-2" onClick={handleSaveBot} disabled={savingBot}>
        {savingBot ? 'Saving...' : 'Save Bot Defaults'}
      </button>
    </div>
  );

  const renderDelivery = () => (
    <div className="bg-mdb-surface border border-mdb-surface-high p-6">
      <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant">Delivery Configuration</div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Delivery Mode</label>
          <select value={deliveryForm.DELIVERY_MODE} onChange={(e) => setDeliveryForm({ ...deliveryForm, DELIVERY_MODE: e.target.value })}>
            <option value="TPA">TPA (Teleport Request)</option>
            <option value="ELYTRA">ELYTRA (Autonomous Flight)</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Target Coord Mode</label>
          <select value={deliveryForm.TARGET_COORD_MODE} onChange={(e) => setDeliveryForm({ ...deliveryForm, TARGET_COORD_MODE: e.target.value })}>
            <option value="USER">USER (Direct Coordinates)</option>
            <option value="RANDOM_REGION">RANDOM_REGION (Bounded Region)</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Post Delivery Action</label>
        <select value={deliveryForm.POST_DELIVERY_ACTION} onChange={(e) => setDeliveryForm({ ...deliveryForm, POST_DELIVERY_ACTION: e.target.value })}>
          <option value="FLY_HOME">FLY_HOME (Fly back to base)</option>
          <option value="ECHEST_SAVE_AND_DIE">ECHEST_SAVE_AND_DIE (Stash gear in EChest then suicide)</option>
          <option value="DIRECT_DIE">DIRECT_DIE (Skip stashing, immediate suicide)</option>
        </select>
      </div>

      <div className="text-[13px] font-semibold text-mdb-text-muted uppercase tracking-wider mb-2 mt-6 pb-2 border-t border-mdb-outline-variant pt-4">Storage Keys</div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Ender Chest Key</label>
          <input type="text" value={deliveryForm.STORAGE_KEYS?.ender || 'ender'} onChange={(e) => setDeliveryForm({ ...deliveryForm, STORAGE_KEYS: { ...deliveryForm.STORAGE_KEYS, ender: e.target.value } })} />
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Standard Chest Key</label>
          <input type="text" value={deliveryForm.STORAGE_KEYS?.chest || 'chest'} onChange={(e) => setDeliveryForm({ ...deliveryForm, STORAGE_KEYS: { ...deliveryForm.STORAGE_KEYS, chest: e.target.value } })} />
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Elytra Key</label>
          <input type="text" value={deliveryForm.STORAGE_KEYS?.elytra || 'elytra'} onChange={(e) => setDeliveryForm({ ...deliveryForm, STORAGE_KEYS: { ...deliveryForm.STORAGE_KEYS, elytra: e.target.value } })} />
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Rocket Key</label>
          <input type="text" value={deliveryForm.STORAGE_KEYS?.rocket || 'rocket'} onChange={(e) => setDeliveryForm({ ...deliveryForm, STORAGE_KEYS: { ...deliveryForm.STORAGE_KEYS, rocket: e.target.value } })} />
        </div>
      </div>

      <div className="text-[13px] font-semibold text-mdb-text-muted uppercase tracking-wider mb-2 mt-6 pb-2 border-t border-mdb-outline-variant pt-4">Base Coordinates</div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">X</label>
          <input type="number" value={deliveryForm.BASE_COORDINATES?.x ?? 0} onChange={(e) => setDeliveryForm({ ...deliveryForm, BASE_COORDINATES: { ...deliveryForm.BASE_COORDINATES, x: parseInt(e.target.value) || 0 } })} />
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Y</label>
          <input type="number" value={deliveryForm.BASE_COORDINATES?.y ?? 64} onChange={(e) => setDeliveryForm({ ...deliveryForm, BASE_COORDINATES: { ...deliveryForm.BASE_COORDINATES, y: parseInt(e.target.value) || 0 } })} />
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Z</label>
          <input type="number" value={deliveryForm.BASE_COORDINATES?.z ?? 0} onChange={(e) => setDeliveryForm({ ...deliveryForm, BASE_COORDINATES: { ...deliveryForm.BASE_COORDINATES, z: parseInt(e.target.value) || 0 } })} />
        </div>
      </div>

      <div className="text-[13px] font-semibold text-mdb-text-muted uppercase tracking-wider mb-2 mt-6 pb-2 border-t border-mdb-outline-variant pt-4">Random Region Bounds</div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">X1</label>
          <input type="number" value={deliveryForm.RANDOM_REGION_BOUNDS?.x1 ?? -1000} onChange={(e) => setDeliveryForm({ ...deliveryForm, RANDOM_REGION_BOUNDS: { ...deliveryForm.RANDOM_REGION_BOUNDS, x1: parseInt(e.target.value) || 0 } })} />
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Z1</label>
          <input type="number" value={deliveryForm.RANDOM_REGION_BOUNDS?.z1 ?? -1000} onChange={(e) => setDeliveryForm({ ...deliveryForm, RANDOM_REGION_BOUNDS: { ...deliveryForm.RANDOM_REGION_BOUNDS, z1: parseInt(e.target.value) || 0 } })} />
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">X2</label>
          <input type="number" value={deliveryForm.RANDOM_REGION_BOUNDS?.x2 ?? 1000} onChange={(e) => setDeliveryForm({ ...deliveryForm, RANDOM_REGION_BOUNDS: { ...deliveryForm.RANDOM_REGION_BOUNDS, x2: parseInt(e.target.value) || 0 } })} />
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Z2</label>
          <input type="number" value={deliveryForm.RANDOM_REGION_BOUNDS?.z2 ?? 1000} onChange={(e) => setDeliveryForm({ ...deliveryForm, RANDOM_REGION_BOUNDS: { ...deliveryForm.RANDOM_REGION_BOUNDS, z2: parseInt(e.target.value) || 0 } })} />
        </div>
      </div>

      <button className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary mt-2" onClick={handleSaveDelivery} disabled={savingDelivery}>
        {savingDelivery ? 'Saving...' : 'Save Delivery Settings'}
      </button>
    </div>
  );

  const renderUsers = () => (
    <>
      <div className="bg-mdb-surface border border-mdb-surface-high p-6">
        <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant flex items-center justify-between">
          <span>Users</span>
          <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-primary text-mdb-on-primary" onClick={() => setShowAdd(true)}>Add User</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="font-mono text-[10px] font-medium uppercase tracking-widest text-mdb-text-muted text-left px-4 h-10 border-b border-mdb-surface-high">Username</th>
                <th className="font-mono text-[10px] font-medium uppercase tracking-widest text-mdb-text-muted text-left px-4 h-10 border-b border-mdb-surface-high">Role</th>
                <th className="font-mono text-[10px] font-medium uppercase tracking-widest text-mdb-text-muted text-left px-4 h-10 border-b border-mdb-surface-high">Created</th>
                <th className="font-mono text-[10px] font-medium uppercase tracking-widest text-mdb-text-muted text-left px-4 h-10 border-b border-mdb-surface-high"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold px-4 h-12 border-b border-mdb-outline-variant text-sm">{u.username}</td>
                  <td className="px-4 h-12 border-b border-mdb-outline-variant text-sm">
                    <span className={`inline-block px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ${u.role === 'admin' ? 'bg-mdb-surface-high text-mdb-primary' : u.role === 'operator' ? 'bg-mdb-surface-high text-mdb-online' : 'bg-mdb-surface-high text-mdb-text-muted'}`}>{u.role}</span>
                  </td>
                  <td className="text-mdb-text-muted text-[13px] px-4 h-12 border-b border-mdb-outline-variant">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="text-right px-4 h-12 border-b border-mdb-outline-variant">
                    <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-status-error text-mdb-status-error hover:bg-mdb-status-error/10" onClick={() => handleDelete(u.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-stretch justify-end" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-surface-high flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-mdb-surface-high">
              <span className="text-lg font-bold">Add New User</span>
              <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={() => setShowAdd(false)}>X</button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <form onSubmit={handleAdd}>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Username</label>
                  <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required />
                </div>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
                </div>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Role</label>
                  <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                    <option value="viewer">Viewer</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary">Add User</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Settings</h1>
        <p className="text-sm text-mdb-text-muted mt-0.5">Server, bot, and delivery configuration</p>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium whitespace-nowrap transition-all border ${activeTab === tab ? 'bg-mdb-primary text-mdb-on-primary border-mdb-primary' : 'bg-mdb-surface border-mdb-surface-high text-mdb-text-secondary hover:border-mdb-text-muted'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'general' && renderGeneral()}
      {activeTab === 'bot' && renderBot()}
      {activeTab === 'delivery' && renderDelivery()}
      {activeTab === 'users' && renderUsers()}
    </div>
  );
}
