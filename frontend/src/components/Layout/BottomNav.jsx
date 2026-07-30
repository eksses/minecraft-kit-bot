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
        className="flex lg:hidden fixed bottom-0 left-0 right-0 h-[56px] bg-mdb-surface/85 backdrop-blur-md border-t border-mdb-border/80 z-50 items-center justify-around pb-[env(safe-area-inset-bottom)] shadow-lg"
        role="navigation"
        aria-label="Main navigation"
      >
        {bottomNavItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/fleet'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 rounded-lg text-[10px] font-medium no-underline transition-all duration-150 ${
                isActive ? 'text-mdb-primary bg-mdb-primary/10' : 'text-mdb-text-muted hover:text-mdb-text'
              }`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          className="flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 rounded-lg text-mdb-text-muted hover:text-mdb-text text-[10px] font-medium border-none bg-transparent cursor-pointer transition-colors duration-150"
          onClick={() => setShowMore(true)}
          aria-label="More options"
        >
          <MoreHorizontal size={19} />
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
