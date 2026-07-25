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
      <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
        {bottomNavItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/fleet'}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          className="bottom-nav-item"
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
