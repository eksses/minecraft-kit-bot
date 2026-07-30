import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Server,
  Layers,
  Package,
  Settings,
  X,
  LogOut,
  Puzzle,
  ShoppingCart,
} from 'lucide-react';

const moreItems = [
  { path: '/fleet', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/fleet/bots', label: 'Bots', icon: Bot },
  { path: '/fleet/servers', label: 'Servers', icon: Server },
  { path: '/fleet/swarms', label: 'Swarms', icon: Layers },
  { path: '/fleet/tasks', label: 'Tasks', icon: Package },
  { path: '/plugin-store', label: 'Plugin Store', icon: ShoppingCart },
  { path: '/plugins', label: 'Plugins', icon: Puzzle },
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
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-h-[85vh] bg-mdb-surface border-t border-mdb-surface-high overflow-y-auto py-4"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-mdb-surface-high">
          <span className="text-base font-semibold">Navigation</span>
          <button
            className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high"
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
            className={({ isActive }) => `flex items-center gap-2 px-6 h-12 text-sm font-medium no-underline transition-all ${isActive ? 'bg-mdb-surface-high text-mdb-primary' : 'text-mdb-text-secondary hover:bg-mdb-surface-high hover:text-mdb-primary'} [&>svg]:w-5 [&>svg]:h-5`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="px-6 py-4 border-t border-mdb-surface-high mt-2">
          <button
            className="flex items-center gap-2 px-6 h-12 text-sm font-medium w-full text-mdb-status-error bg-transparent border-none cursor-pointer hover:bg-mdb-surface-high"
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
