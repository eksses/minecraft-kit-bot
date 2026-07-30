import { NavLink } from 'react-router-dom';
import { IconButton } from '../ui';
import {
  LayoutDashboard,
  Bot,
  Layers,
  Settings,
  LogOut,
  Gamepad2,
  Puzzle,
  ShoppingCart,
  Truck,
  Server,
  ListTodo,
} from 'lucide-react';

const navItems = [
  { path: '/fleet', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/fleet/delivery', label: 'Delivery', icon: Truck },
  { path: '/fleet/bots', label: 'Bots', icon: Bot },
  { path: '/fleet/swarms', label: 'Swarms', icon: Layers },
  { path: '/fleet/servers', label: 'Servers', icon: Server },
  { path: '/fleet/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/plugin-store', label: 'Plugins', icon: ShoppingCart },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ currentPath, user, onLogout }) {
  return (
    <nav
      className="fixed left-0 top-0 bottom-0 hidden lg:flex flex-col w-[260px] bg-mdb-surface border-r border-mdb-border z-40"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="px-5 py-5 border-b border-mdb-border flex items-center gap-2.5 max-[1025px]:justify-center max-[1025px]:px-0">
        <Gamepad2 size={22} className="text-mdb-primary shrink-0" />
        <span className="text-sm font-semibold text-mdb-primary tracking-tight max-[1025px]:hidden">
          MinecraftKit
        </span>
      </div>

      <div className="flex-1 py-3 overflow-y-auto max-[1025px]:py-2">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 h-10 mx-2 px-3.5 rounded-lg text-sm font-medium no-underline transition-all duration-150 max-[1025px]:justify-center max-[1025px]:mx-0 max-[1025px]:px-0 ${
                isActive
                  ? 'bg-mdb-surface-high text-mdb-primary'
                  : 'text-mdb-text-secondary hover:bg-mdb-surface-high hover:text-mdb-text'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className="max-[1025px]:hidden">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-3 py-3 border-t border-mdb-border max-[1025px]:px-0 max-[1025px]:flex max-[1025px]:justify-center">
        <div className="flex items-center gap-3 max-[1025px]:hidden px-2">
          <div className="w-8 h-8 rounded-full bg-mdb-surface-high flex items-center justify-center text-xs font-medium text-mdb-primary shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-mdb-text truncate leading-tight">
              {user?.username}
            </div>
            <div className="text-xs text-mdb-text-muted truncate">{user?.role}</div>
          </div>
          <IconButton
            icon={LogOut}
            size="sm"
            onClick={onLogout}
            className="text-mdb-text-muted hover:text-mdb-error"
            tooltip="Logout"
          />
        </div>
        <div className="hidden max-[1025px]:flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-mdb-surface-high flex items-center justify-center text-xs font-medium text-mdb-primary">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </nav>
  );
}
