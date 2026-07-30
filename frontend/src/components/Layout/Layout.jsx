import { useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isBotDetail = /^\/fleet\/bots\/[^/]+$/.test(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPath={location.pathname} user={user} onLogout={logout} />
      <main className="flex-1 lg:ml-[260px] ml-0 p-4 sm:p-6 lg:p-8 pb-[calc(var(--bottom-nav-height)+24px)] lg:pb-8 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav currentPath={location.pathname} onLogout={logout} />
    </div>
  );
}
