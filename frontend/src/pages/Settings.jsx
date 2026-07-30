import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { Button, Card, CardHeader, Input, Select, Tabs, Modal, SettingsSection, ConfirmAction } from '../components/ui';

const TAB_ITEMS = [
  { id: 'general', label: 'General' },
  { id: 'bot', label: 'Bot' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'whitelist', label: 'Whitelist' },
  { id: 'users', label: 'Users' },
];

const VERSION_OPTIONS = [
  { value: 'auto', label: 'Auto Detect' },
  { value: '1.21.4', label: '1.21.4' },
  { value: '1.21.3', label: '1.21.3' },
  { value: '1.21.2', label: '1.21.2' },
  { value: '1.21.1', label: '1.21.1' },
  { value: '1.21', label: '1.21' },
  { value: '1.20.6', label: '1.20.6' },
  { value: '1.20.4', label: '1.20.4' },
  { value: '1.20.2', label: '1.20.2' },
  { value: '1.20.1', label: '1.20.1' },
  { value: '1.20', label: '1.20' },
  { value: '1.19.4', label: '1.19.4' },
  { value: '1.19.3', label: '1.19.3' },
  { value: '1.18.2', label: '1.18.2' },
  { value: '1.17.1', label: '1.17.1' },
  { value: '1.16.5', label: '1.16.5' },
  { value: '1.12.2', label: '1.12.2' },
];

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

  const [whitelist, setWhitelist] = useState([]);
  const [showAddWhitelist, setShowAddWhitelist] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [whitelistForm, setWhitelistForm] = useState({ playerName: '', role: 'user' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [usersData, generalData, deliveryData, whitelistData] = await Promise.all([
        api.fleet.getUsers().catch(() => []),
        api.settings.get().catch(() => ({})),
        api.fleet.getDeliveryConfig().catch(() => null),
        api.fleet.getWhitelist().catch(() => []),
      ]);
      setUsers(usersData);
      setWhitelist(whitelistData || []);
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

  const handleAddWhitelist = async (e) => {
    e.preventDefault();
    try {
      if (editingPlayer) {
        await api.fleet.updateWhitelist(editingPlayer.playerName, { role: whitelistForm.role });
        addToast({ type: 'success', title: 'Player role updated' });
      } else {
        await api.fleet.addWhitelist(whitelistForm);
        addToast({ type: 'success', title: 'Player added to whitelist' });
      }
      setShowAddWhitelist(false);
      setEditingPlayer(null);
      setWhitelistForm({ playerName: '', role: 'user' });
      setWhitelist(await api.fleet.getWhitelist());
    } catch (err) {
      addToast({ type: 'error', title: err.error || 'Failed to save whitelist player' });
    }
  };

  const handleDeleteWhitelist = async (playerName) => {
    try {
      await api.fleet.deleteWhitelist(playerName);
      setWhitelist(await api.fleet.getWhitelist());
      addToast({ type: 'success', title: 'Player removed from whitelist' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to remove player' });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-mdb-text tracking-tight">Settings</h1>
        <p className="text-sm text-mdb-text-muted mt-0.5">Manage your server configuration</p>
      </div>

      <Tabs items={TAB_ITEMS} value={activeTab} onChange={setActiveTab} variant="pills" />

      {activeTab === 'general' && (
        <GeneralTab form={generalForm} setForm={setGeneralForm} saving={savingGeneral} onSave={handleSaveGeneral} />
      )}
      {activeTab === 'bot' && (
        <BotTab form={botForm} setForm={setBotForm} saving={savingBot} onSave={handleSaveBot} />
      )}
      {activeTab === 'delivery' && (
        <DeliveryTab form={deliveryForm} setForm={setDeliveryForm} saving={savingDelivery} onSave={handleSaveDelivery} />
      )}
      {activeTab === 'whitelist' && (
        <WhitelistTab
          whitelist={whitelist}
          onAdd={handleAddWhitelist}
          onDelete={handleDeleteWhitelist}
          showAdd={showAddWhitelist}
          setShowAdd={setShowAddWhitelist}
          editingPlayer={editingPlayer}
          setEditingPlayer={setEditingPlayer}
          form={whitelistForm}
          setForm={setWhitelistForm}
        />
      )}
      {activeTab === 'users' && (
        <UsersTab users={users} onAdd={handleAdd} onDelete={handleDelete} showAdd={showAdd} setShowAdd={setShowAdd} form={form} setForm={setForm} />
      )}
    </div>
  );
}

function GeneralTab({ form, setForm, saving, onSave }) {
  return (
    <Card padding="none">
      <CardHeader title="General Settings" subtitle="Server connection ports" />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Server Port"
            type="number"
            value={form.SERVER_PORT}
            onChange={(e) => setForm({ ...form, SERVER_PORT: e.target.value })}
            placeholder="8081"
          />
          <Input
            label="WebSocket Port"
            type="number"
            value={form.WS_PORT}
            onChange={(e) => setForm({ ...form, WS_PORT: e.target.value })}
            placeholder="3000"
          />
        </div>
        <div className="mt-5">
          <Button variant="primary" size="lg" loading={saving} onClick={onSave}>
            Save General Settings
          </Button>
        </div>
      </div>
    </Card>
  );
}

function BotTab({ form, setForm, saving, onSave }) {
  return (
    <Card padding="none">
      <CardHeader title="Default Bot Settings" subtitle="Default connection parameters for new bots" />
      <div className="p-6 space-y-4">
        <Input
          label="Default Host"
          value={form.IP}
          onChange={(e) => setForm({ ...form, IP: e.target.value })}
          placeholder="6b6t.org"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Default Port"
            type="number"
            value={form.PORT}
            onChange={(e) => setForm({ ...form, PORT: e.target.value })}
            placeholder="25565"
          />
          <Select
            label="Default Version"
            value={form.VERSION}
            onChange={(e) => setForm({ ...form, VERSION: e.target.value })}
            options={VERSION_OPTIONS}
          />
        </div>
        <div className="pt-2">
          <Button variant="primary" size="lg" loading={saving} onClick={onSave}>
            Save Bot Defaults
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DeliveryTab({ form, setForm, saving, onSave }) {
  return (
    <Card padding="none">
      <CardHeader title="Delivery Configuration" subtitle="Kit delivery behavior and coordinates" />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Delivery Mode"
            value={form.DELIVERY_MODE}
            onChange={(e) => setForm({ ...form, DELIVERY_MODE: e.target.value })}
            options={[
              { value: 'TPA', label: 'TPA (Teleport Request)' },
              { value: 'ELYTRA', label: 'ELYTRA (Autonomous Flight)' },
            ]}
          />
          <Select
            label="Target Coord Mode"
            value={form.TARGET_COORD_MODE}
            onChange={(e) => setForm({ ...form, TARGET_COORD_MODE: e.target.value })}
            options={[
              { value: 'USER', label: 'USER (Direct Coordinates)' },
              { value: 'RANDOM_REGION', label: 'RANDOM_REGION (Bounded Region)' },
            ]}
          />
        </div>
        <Select
          label="Post Delivery Action"
          value={form.POST_DELIVERY_ACTION}
          onChange={(e) => setForm({ ...form, POST_DELIVERY_ACTION: e.target.value })}
          options={[
            { value: 'FLY_HOME', label: 'FLY_HOME (Fly back to base)' },
            { value: 'ECHEST_SAVE_AND_DIE', label: 'ECHEST_SAVE_AND_DIE (Stash gear then suicide)' },
            { value: 'DIRECT_DIE', label: 'DIRECT_DIE (Skip stashing, immediate suicide)' },
          ]}
        />

        <SettingsSection title="Advanced Delivery Settings" defaultOpen={false}>
          <div className="space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted mb-4">Storage Keys</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Ender Chest Key"
                  value={form.STORAGE_KEYS?.ender || 'ender'}
                  onChange={(e) => setForm({ ...form, STORAGE_KEYS: { ...form.STORAGE_KEYS, ender: e.target.value } })}
                />
                <Input
                  label="Standard Chest Key"
                  value={form.STORAGE_KEYS?.chest || 'chest'}
                  onChange={(e) => setForm({ ...form, STORAGE_KEYS: { ...form.STORAGE_KEYS, chest: e.target.value } })}
                />
                <Input
                  label="Elytra Key"
                  value={form.STORAGE_KEYS?.elytra || 'elytra'}
                  onChange={(e) => setForm({ ...form, STORAGE_KEYS: { ...form.STORAGE_KEYS, elytra: e.target.value } })}
                />
                <Input
                  label="Rocket Key"
                  value={form.STORAGE_KEYS?.rocket || 'rocket'}
                  onChange={(e) => setForm({ ...form, STORAGE_KEYS: { ...form.STORAGE_KEYS, rocket: e.target.value } })}
                />
              </div>
            </div>

            <div className="border-t border-mdb-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted mb-4">Base Coordinates</div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="X"
                  type="number"
                  value={form.BASE_COORDINATES?.x ?? 0}
                  onChange={(e) => setForm({ ...form, BASE_COORDINATES: { ...form.BASE_COORDINATES, x: parseInt(e.target.value) || 0 } })}
                />
                <Input
                  label="Y"
                  type="number"
                  value={form.BASE_COORDINATES?.y ?? 64}
                  onChange={(e) => setForm({ ...form, BASE_COORDINATES: { ...form.BASE_COORDINATES, y: parseInt(e.target.value) || 0 } })}
                />
                <Input
                  label="Z"
                  type="number"
                  value={form.BASE_COORDINATES?.z ?? 0}
                  onChange={(e) => setForm({ ...form, BASE_COORDINATES: { ...form.BASE_COORDINATES, z: parseInt(e.target.value) || 0 } })}
                />
              </div>
            </div>

            <div className="border-t border-mdb-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted mb-4">Random Region Bounds</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input
                  label="X1"
                  type="number"
                  value={form.RANDOM_REGION_BOUNDS?.x1 ?? -1000}
                  onChange={(e) => setForm({ ...form, RANDOM_REGION_BOUNDS: { ...form.RANDOM_REGION_BOUNDS, x1: parseInt(e.target.value) || 0 } })}
                />
                <Input
                  label="Z1"
                  type="number"
                  value={form.RANDOM_REGION_BOUNDS?.z1 ?? -1000}
                  onChange={(e) => setForm({ ...form, RANDOM_REGION_BOUNDS: { ...form.RANDOM_REGION_BOUNDS, z1: parseInt(e.target.value) || 0 } })}
                />
                <Input
                  label="X2"
                  type="number"
                  value={form.RANDOM_REGION_BOUNDS?.x2 ?? 1000}
                  onChange={(e) => setForm({ ...form, RANDOM_REGION_BOUNDS: { ...form.RANDOM_REGION_BOUNDS, x2: parseInt(e.target.value) || 0 } })}
                />
                <Input
                  label="Z2"
                  type="number"
                  value={form.RANDOM_REGION_BOUNDS?.z2 ?? 1000}
                  onChange={(e) => setForm({ ...form, RANDOM_REGION_BOUNDS: { ...form.RANDOM_REGION_BOUNDS, z2: parseInt(e.target.value) || 0 } })}
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        <div className="pt-2">
          <Button variant="primary" size="lg" loading={saving} onClick={onSave}>
            Save Delivery Settings
          </Button>
        </div>
      </div>
    </Card>
  );
}

function UsersTab({ users, onAdd, onDelete, showAdd, setShowAdd, form, setForm }) {
  return (
    <>
      <Card padding="none">
        <CardHeader
          title="Users"
          subtitle={`${users.length} user${users.length !== 1 ? 's' : ''}`}
          action={
            <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
              Add User
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-5 h-10 border-b border-mdb-border">Username</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-5 h-10 border-b border-mdb-border">Role</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-5 h-10 border-b border-mdb-border">Created</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-5 h-10 border-b border-mdb-border"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mdb-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-mdb-surface-high transition-colors">
                  <td className="font-medium px-5 h-12 text-sm">{u.username}</td>
                  <td className="px-5 h-12 text-sm">
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${u.role === 'admin' ? 'bg-mdb-primary/15 text-mdb-primary' : u.role === 'operator' ? 'bg-mdb-success/15 text-mdb-success' : 'bg-mdb-surface-high text-mdb-text-muted'}`}>{u.role}</span>
                  </td>
                  <td className="text-mdb-text-muted text-sm px-5 h-12">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="text-right px-5 h-12">
                    <ConfirmAction
                      title="Delete User"
                      message={`Are you sure you want to delete user "${u.username}"?`}
                      confirmLabel="Delete"
                      onConfirm={() => onDelete(u.id)}
                    >
                      <Button variant="danger" size="sm">
                        Delete
                      </Button>
                    </ConfirmAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New User" size="sm">
        <form onSubmit={onAdd} className="space-y-4">
          <Input
            label="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={[
              { value: 'viewer', label: 'Viewer' },
              { value: 'operator', label: 'Operator' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <div className="flex gap-4 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add User
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function WhitelistTab({ whitelist, onAdd, onDelete, showAdd, setShowAdd, editingPlayer, setEditingPlayer, form, setForm }) {
  const handleOpenAdd = () => {
    setEditingPlayer(null);
    setForm({ playerName: '', role: 'user' });
    setShowAdd(true);
  };

  const handleOpenEdit = (p) => {
    setEditingPlayer(p);
    setForm({ playerName: p.playerName, role: p.role });
    setShowAdd(true);
  };

  return (
    <>
      <Card padding="none">
        <CardHeader
          title="In-Game Whitelist"
          subtitle={`${whitelist.length} whitelisted player${whitelist.length !== 1 ? 's' : ''}`}
          action={
            <Button variant="primary" size="sm" onClick={handleOpenAdd}>
              Add Player
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-5 h-10 border-b border-mdb-border">Minecraft Username</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-5 h-10 border-b border-mdb-border">In-Game Role</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-5 h-10 border-b border-mdb-border">Added By</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-5 h-10 border-b border-mdb-border">Date Added</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted border-b border-mdb-border"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mdb-border">
              {whitelist.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-mdb-text-muted">
                    No players in-game whitelisted yet. Click "Add Player" to grant access.
                  </td>
                </tr>
              ) : (
                whitelist.map((p) => (
                  <tr key={p.id || p.playerName} className="hover:bg-mdb-surface-high transition-colors">
                    <td className="font-medium px-5 h-12 text-sm text-mdb-text">{p.playerName}</td>
                    <td className="px-5 h-12 text-sm">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        p.role === 'admin'
                          ? 'bg-mdb-primary/15 text-mdb-primary'
                          : p.role === 'vip'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-mdb-surface-high text-mdb-text-muted'
                      }`}>
                        {p.role ? p.role.toUpperCase() : 'USER'}
                      </span>
                    </td>
                    <td className="text-mdb-text-muted text-sm px-5 h-12">{p.addedBy || 'system'}</td>
                    <td className="text-mdb-text-muted text-sm px-5 h-12">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="text-right px-5 h-12 space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEdit(p)}
                      >
                        Edit Role
                      </Button>
                      <ConfirmAction
                        title="Remove Player"
                        message={`Remove ${p.playerName} from whitelist?`}
                        confirmLabel="Delete"
                        onConfirm={() => onDelete(p.playerName)}
                      >
                        <Button
                          variant="danger"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </ConfirmAction>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setEditingPlayer(null); }} title={editingPlayer ? `Edit Role: ${editingPlayer.playerName}` : 'Add Player to Whitelist'} size="sm">
        <form onSubmit={onAdd} className="space-y-4">
          <Input
            label="Minecraft Username"
            value={form.playerName}
            onChange={(e) => setForm({ ...form, playerName: e.target.value })}
            placeholder="e.g. FitMC"
            disabled={!!editingPlayer}
            required
          />
          <Select
            label="In-Game Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={[
              { value: 'user', label: 'User (Standard kit orders)' },
              { value: 'vip', label: 'VIP (Priority kit orders)' },
              { value: 'admin', label: 'Admin (In-game whitelist control)' },
            ]}
          />
          <div className="flex gap-4 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setShowAdd(false); setEditingPlayer(null); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingPlayer ? 'Save Role' : 'Add to Whitelist'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
