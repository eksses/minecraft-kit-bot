import { useState, useEffect } from 'react';
import { useChestStore } from '../store';
import { api } from '../services/api';

export default function ChestManager() {
  const { chests, fetchChests } = useChestStore();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', x: 0, y: 0, z: 0, item: '' });

  useEffect(() => {
    fetchChests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.chests.create(form);
      fetchChests();
      setShowAdd(false);
      setForm({ name: '', x: 0, y: 0, z: 0, item: '' });
    } catch (err) {
      alert('Failed to add chest');
    }
  };

  const handleDelete = async (name) => {
    if (confirm(`Delete chest "${name}"?`)) {
      await api.chests.delete(name);
      fetchChests();
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Chest Manager</h1>
        <button className="btn primary" onClick={() => setShowAdd(true)}>
          Add Chest
        </button>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Chest</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>X</label>
                  <input type="number" value={form.x} onChange={(e) => setForm({...form, x: parseInt(e.target.value)})} required />
                </div>
                <div className="form-group">
                  <label>Y</label>
                  <input type="number" value={form.y} onChange={(e) => setForm({...form, y: parseInt(e.target.value)})} required />
                </div>
                <div className="form-group">
                  <label>Z</label>
                  <input type="number" value={form.z} onChange={(e) => setForm({...form, z: parseInt(e.target.value)})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Item</label>
                <input value={form.item} onChange={(e) => setForm({...form, item: e.target.value})} required />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Item</th>
              <th>Position</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(chests).map(([name, data]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{data.item}</td>
                <td>{data.x}, {data.y}, {data.z}</td>
                <td>
                  <button className="btn danger small" onClick={() => handleDelete(name)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}