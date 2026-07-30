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
      <main className="flex-1 ml-[280px] p-8 overflow-y-auto max-md:ml-0 max-md:p-4 max-md:pb-[calc(var(--bottom-nav-height)+24px)]">
        <Outlet />
      </main>
      {!isBotDetail && <BottomNav currentPath={location.pathname} onLogout={logout} />}
    </div>
  );
}
