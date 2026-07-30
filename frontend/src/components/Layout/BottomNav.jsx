import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bot, Package, MoreHorizontal } from 'lucide-react';
import MoreSheet from './MoreSheet';

const bottomNavItems = [
  { path: '/fleet', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/fleet/bots', label: 'Bots', icon: Bot },
  { path: '/fleet/tasks', label: 'Tasks', icon: Package },
];

export default function BottomNav({ currentPath, onLogout }) {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <nav className="hidden max-md:flex fixed bottom-0 left-0 right-0 h-16 bg-mdb-surface border-t border-mdb-surface-high z-50 items-center justify-around pb-[env(safe-area-inset-bottom)]" role="navigation" aria-label="Main navigation">
        {bottomNavItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/fleet'}
            className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 min-w-12 min-h-12 text-mdb-text-muted text-[10px] font-medium no-underline transition-colors border-b-2 border-transparent p-1 ${isActive ? 'text-mdb-primary border-b-mdb-primary' : ''}`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          className="flex flex-col items-center justify-center gap-0.5 min-w-12 min-h-12 text-mdb-text-muted text-[10px] font-medium border-none bg-transparent cursor-pointer p-1 border-b-2 border-transparent"
          onClick={() => setShowMore(true)}
          aria-label="More options"
        >
          <MoreHorizontal size={22} />
          <span>More</span>
        </button>
      </nav>
      <MoreSheet
        isOpen={showMore}
        onClose={() => setShowMore(false)}
        currentPath={currentPath}
        onLogout={onLogout}
      />
    </>
  );
}
