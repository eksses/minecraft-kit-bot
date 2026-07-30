import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, Loader2 } from 'lucide-react';

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
      <div className="w-full max-w-[400px]">
        <div className="bg-mdb-surface rounded-xl border border-mdb-border p-8 shadow-xl">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-mdb-primary/10 border border-mdb-primary/20 flex items-center justify-center">
              <Gamepad2 size={24} className="text-mdb-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-mdb-text mb-1">MDB Platform</h1>
          <p className="text-sm text-mdb-text-muted text-center mb-8">Minecraft Delivery Bot Management</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Logging in...
                </>
              ) : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
