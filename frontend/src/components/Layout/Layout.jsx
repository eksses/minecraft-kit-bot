import { useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isBotDetail = /^\/fleet\/bots\/[^/]+$/.test(location.pathname);

  return (
    <div className="layout">
      <Sidebar currentPath={location.pathname} user={user} onLogout={logout} />
      <main className="layout-main">
        <Outlet />
      </main>
      {!isBotDetail && <BottomNav currentPath={location.pathname} onLogout={logout} />}
    </div>
  );
}
