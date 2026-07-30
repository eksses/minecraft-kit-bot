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
    <nav className="layout-sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-header">
        <Gamepad2 size={24} className="sidebar-logo" />
        <span className="sidebar-brand">MDB</span>
      </div>

      <div className="sidebar-nav">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.username}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
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
