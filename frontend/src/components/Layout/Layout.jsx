import { useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <Sidebar currentPath={location.pathname} user={user} onLogout={logout} />
      <main className="layout-main">
        <Outlet />
      </main>
      <BottomNav currentPath={location.pathname} onLogout={logout} />
    </div>
  );
}
