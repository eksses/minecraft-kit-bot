import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';

export default function Settings() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer' });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try { setUsers(await api.fleet.getUsers()); }
    catch (err) { addToast({ type: 'error', title: 'Failed to load users' }); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.fleet.createUser(form);
      setShowAdd(false);
      setForm({ username: '', password: '', role: 'viewer' });
      loadUsers();
      addToast({ type: 'success', title: 'User added' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add user' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.fleet.deleteUser(id);
      loadUsers();
      addToast({ type: 'success', title: 'User deleted' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete user' });
    }
  };

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">User management and configuration</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add User</button>
      </div>

      <div className="section">
        <div className="section-header">Users</div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="user-row-name">{u.username}</td>
                  <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                  <td className="user-row-date">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="user-row-actions">
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="drawer-overlay" onClick={() => setShowAdd(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Add New User</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>X</button>
            </div>
            <div className="drawer-body">
              <form onSubmit={handleAdd}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                    <option value="viewer">Viewer</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-sm mt-md">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add User</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
