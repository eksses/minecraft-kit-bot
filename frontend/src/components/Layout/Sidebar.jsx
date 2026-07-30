import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Server,
  Layers,
  Package,
  Settings,
  LogOut,
  Gamepad2,
  Puzzle,
  ShoppingCart,
  Truck,
} from 'lucide-react';

const navItems = [
  { path: '/fleet', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/fleet/delivery', label: 'Delivery', icon: Truck },
  { path: '/fleet/bots', label: 'Bots', icon: Bot },
  { path: '/fleet/servers', label: 'Servers', icon: Server },
  { path: '/fleet/swarms', label: 'Swarms', icon: Layers },
  { path: '/fleet/tasks', label: 'Tasks', icon: Package },
  { path: '/plugin-store', label: 'Plugin Store', icon: ShoppingCart },
  { path: '/plugins', label: 'Plugins', icon: Puzzle },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ currentPath, user, onLogout }) {
  return (
    <nav className="fixed left-0 top-0 bottom-0 w-[280px] bg-mdb-surface border-r border-mdb-surface-high flex flex-col z-40 max-lg:hidden max-[1025px]:!w-16" role="navigation" aria-label="Main navigation">
      <div className="p-6 border-b border-mdb-surface-high flex items-center gap-2 max-[1025px]:p-2 max-[1025px]:justify-center">
        <Gamepad2 size={24} className="text-mdb-primary text-2xl" />
        <span className="text-base font-bold text-mdb-primary max-[1025px]:hidden">MDB</span>
      </div>

      <div className="flex-1 py-2 overflow-y-auto max-[1025px]:px-0 max-[1025px]:mt-4">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `flex items-center gap-2 px-6 h-12 text-sm font-medium transition-all cursor-pointer border-l-[3px] no-underline max-[1025px]:justify-center max-[1025px]:px-0 max-[1025px]:gap-0 ${isActive ? 'bg-mdb-surface-high text-mdb-primary border-l-mdb-primary font-semibold' : 'text-mdb-text-secondary hover:bg-mdb-surface-high hover:text-mdb-primary border-l-transparent'} [&>svg]:w-5 [&>svg]:h-5 [&>svg]:shrink-0`}
          >
            <Icon size={20} />
            <span className="max-[1025px]:hidden">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="p-4 px-6 border-t border-mdb-surface-high max-[1025px]:p-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-mdb-surface-high flex items-center justify-center text-sm font-bold text-mdb-primary shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0 max-[1025px]:hidden">
            <div className="text-sm font-semibold text-mdb-text truncate">{user?.username}</div>
            <div className="text-xs text-mdb-text-muted">{user?.role}</div>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high max-[1025px]:hidden"
            onClick={onLogout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
