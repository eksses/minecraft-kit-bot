import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bot, Truck, MoreHorizontal } from 'lucide-react';
import MoreSheet from './MoreSheet';

const bottomNavItems = [
  { path: '/fleet', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/fleet/bots', label: 'Bots', icon: Bot },
  { path: '/fleet/delivery', label: 'Delivery', icon: Truck },
];

export default function BottomNav({ currentPath, onLogout }) {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <nav
        className="hidden max-md:flex fixed bottom-0 left-0 right-0 h-[56px] bg-mdb-surface border-t border-mdb-border z-50 items-center justify-around pb-[env(safe-area-inset-bottom)]"
        role="navigation"
        aria-label="Main navigation"
      >
        {bottomNavItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/fleet'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 text-[10px] font-medium no-underline transition-colors duration-150 ${
                isActive ? 'text-mdb-primary' : 'text-mdb-text-muted'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          className="flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 text-mdb-text-muted text-[10px] font-medium border-none bg-transparent cursor-pointer"
          onClick={() => setShowMore(true)}
          aria-label="More options"
        >
          <MoreHorizontal size={20} />
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
