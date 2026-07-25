import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';

export default function ChestManager() {
  const [chests, setChests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', x: 0, y: 0, z: 0, itemName: '' });
  const { addToast } = useToast();

  useEffect(() => { loadChests(); }, []);

  const loadChests = async () => {
    try { setChests(await api.fleet.getChests()); }
    catch (err) { addToast({ type: 'error', title: 'Failed to load chests' }); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.fleet.createChest(form);
      setShowAdd(false);
      setForm({ name: '', x: 0, y: 0, z: 0, itemName: '' });
      loadChests();
      addToast({ type: 'success', title: 'Chest added' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add chest' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this chest?')) return;
    try {
      await api.fleet.deleteChest(id);
      loadChests();
      addToast({ type: 'success', title: 'Chest deleted' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete chest' });
    }
  };

  if (loading) {
    return <div style={{padding: '48px', textAlign: 'center', color: 'var(--text-muted)'}}>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Chests</h1>
          <p className="page-subtitle">Storage location management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add Chest</button>
      </div>

      {showAdd && (
        <div className="drawer-overlay" onClick={() => setShowAdd(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Add Chest Location</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>X</button>
            </div>
            <div className="drawer-body">
              <form onSubmit={handleAdd}>
                <div className="form-group">
                  <label className="form-label">Chest Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Main Storage" />
                </div>
                <div className="form-group">
                  <label className="form-label">Item Name</label>
                  <input type="text" value={form.itemName} onChange={(e) => setForm({...form, itemName: e.target.value})} required placeholder="diamond" />
                </div>
                <div className="flex gap-sm">
                  <div className="form-group flex-1">
                    <label className="form-label">X</label>
                    <input type="number" value={form.x} onChange={(e) => setForm({...form, x: parseInt(e.target.value)})} required />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Y</label>
                    <input type="number" value={form.y} onChange={(e) => setForm({...form, y: parseInt(e.target.value)})} required />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Z</label>
                    <input type="number" value={form.z} onChange={(e) => setForm({...form, z: parseInt(e.target.value)})} required />
                  </div>
                </div>
                <div className="flex gap-sm mt-md">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Chest</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {chests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No chest locations</div>
          <div className="empty-state-text">Add chest locations to store items for delivery</div>
          <button className="btn btn-primary mt-md" onClick={() => setShowAdd(true)}>Add Chest</button>
        </div>
      ) : (
        <div className="grid-2col">
          {chests.map((chest) => (
            <div key={chest.id} className="bot-card">
              <div className="bot-card-header">
                <span style={{fontWeight: 600}}>{chest.name}</span>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(chest.id)}>Delete</button>
              </div>
              <div className="bot-card-info">
                <div style={{fontFamily: 'var(--font-mono)', fontSize: '13px'}}>
                  {chest.x}, {chest.y}, {chest.z}
                </div>
                <div>{chest.itemName}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
