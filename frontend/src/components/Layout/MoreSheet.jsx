import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Server,
  Layers,
  Package,
  Box,
  ShoppingBag,
  MessageSquare,
  Settings,
  X,
  LogOut,
} from 'lucide-react';

const moreItems = [
  { path: '/fleet', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/fleet/bots', label: 'Bots', icon: Bot },
  { path: '/fleet/servers', label: 'Servers', icon: Server },
  { path: '/fleet/swarms', label: 'Swarms', icon: Layers },
  { path: '/fleet/tasks', label: 'Tasks', icon: Package },
  { path: '/chests', label: 'Chests', icon: Box },
  { path: '/kits', label: 'Order Kit', icon: ShoppingBag },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function MoreSheet({ isOpen, onClose, currentPath, onLogout }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="more-overlay" onClick={onClose}>
      <div
        className="more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="more-sheet-header">
          <span className="more-sheet-title">Navigation</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {moreItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/fleet'}
            onClick={onClose}
            className={({ isActive }) => `more-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="more-sheet-footer">
          <button
            className="more-nav-item logout-btn"
            onClick={() => { onClose(); onLogout(); }}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
