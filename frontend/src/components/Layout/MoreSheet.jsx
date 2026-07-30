import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from '../ui';
import {
  Settings,
  ShoppingCart,
  Puzzle,
  LogOut,
} from 'lucide-react';

const moreItems = [
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/plugin-store', label: 'Plugin Store', icon: ShoppingCart },
  { path: '/plugins', label: 'Plugins', icon: Puzzle },
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
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className="relative w-full bg-mdb-surface rounded-t-2xl overflow-y-auto animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideUp 0.25s ease-out',
        }}
      >
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-mdb-surface-high" />
        </div>
        <div className="px-4 pb-6">
          {moreItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/fleet'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 h-12 px-4 rounded-xl text-sm font-medium no-underline transition-all duration-150 ${
                  isActive
                    ? 'bg-mdb-surface-high text-mdb-primary'
                    : 'text-mdb-text-secondary hover:bg-mdb-surface-high hover:text-mdb-text'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
          <Button
            variant="danger"
            size="lg"
            icon={LogOut}
            onClick={() => { onClose(); onLogout(); }}
            className="w-full justify-start"
          >
            Logout
          </Button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
