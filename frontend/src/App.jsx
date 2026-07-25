import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FleetDashboard from './pages/FleetDashboard';
import ChestManager from './pages/ChestManager';
import KitOrder from './pages/KitOrder';
import BotControl from './pages/BotControl';
import Chat from './pages/Chat';
import Settings from './pages/Settings';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route path="/" element={<Navigate to="/fleet" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/fleet" element={<FleetDashboard />} />
        <Route path="/fleet/bots" element={<BotControl />} />
        <Route path="/fleet/swarms" element={<div>Swarm Controller</div>} />
        <Route path="/chests" element={<ChestManager />} />
        <Route path="/kits" element={<KitOrder />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/fleet" replace />} />
    </Routes>
  );
}

export default App;