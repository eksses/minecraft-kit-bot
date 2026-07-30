import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gamepad2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
      navigate('/fleet', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-mdb-bg">
      <div className="w-full max-w-[400px] bg-mdb-surface border border-mdb-surface-high p-8">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Gamepad2 size={28} className="text-mdb-primary text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-center text-mdb-text">MDB Platform</h1>
        <p className="text-sm text-mdb-text-muted text-center mt-1 mb-8">Minecraft Delivery Bot Management</p>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-mdb-error/10 border border-mdb-error rounded-none p-2 px-4 mb-4 text-mdb-error text-[13px]">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter username"
              autoComplete="username"
            />
          </div>
          
          <div className="mb-4">
            <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>
          
          <button type="submit" className="inline-flex items-center justify-center gap-2 w-full h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
