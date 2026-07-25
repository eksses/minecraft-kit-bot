import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastContainer } from './components/ToastContainer';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import FleetDashboard from './pages/FleetDashboard';
import ChestManager from './pages/ChestManager';
import KitOrder from './pages/KitOrder';
import BotControl from './pages/BotControl';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import SwarmController from './pages/SwarmController';
import ServerManager from './pages/ServerManager';
import TaskQueue from './pages/TaskQueue';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        Loading...
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route path="/" element={<Navigate to="/fleet" replace />} />
          <Route path="/fleet" element={<FleetDashboard />} />
          <Route path="/fleet/bots" element={<BotControl />} />
          <Route path="/fleet/servers" element={<ServerManager />} />
          <Route path="/fleet/swarms" element={<SwarmController />} />
          <Route path="/fleet/tasks" element={<TaskQueue />} />
          <Route path="/chests" element={<ChestManager />} />
          <Route path="/kits" element={<KitOrder />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/fleet" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;