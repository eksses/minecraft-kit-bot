import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gamepad2 } from 'lucide-react';
import { Card, Input, Button, Alert } from '../components/ui';

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
        <Card>
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-mdb-primary/10 border border-mdb-primary/20 flex items-center justify-center">
              <Gamepad2 size={24} className="text-mdb-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-mdb-text mb-1">MDB Platform</h1>
          <p className="text-sm text-mdb-text-muted text-center mb-8">Minecraft Delivery Bot Management</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error" title={error} />
            )}

            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter username"
              autoComplete="username"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              autoComplete="current-password"
            />

            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              className="w-full mt-6"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
