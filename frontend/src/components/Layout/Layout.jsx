import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/chests', label: 'Chests', icon: '📦' },
  { path: '/kits', label: 'Kits', icon: '⚔️' },
  { path: '/bot', label: 'Bot Control', icon: '🤖' },
  { path: '/chat', label: 'Chat', icon: '💬' },
  { path: '/settings', label: 'Settings', icon: '⚙️', admin: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const filteredNavItems = NAV_ITEMS.filter(item => 
    !item.admin || (user?.role === 'admin')
  );
  
  return (
    <div className="app-layout">
      <header className="header">
        <button 
          className="menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <span className="hamburger"></span>
        </button>
        
        <h1 className="logo">
          <span className="logo-icon">🤖</span>
          MDB Panel
        </h1>
        
        <div className="header-right">
          <div className="user-menu">
            <span className="user-name">{user?.username}</span>
            <span className={`role-badge ${user?.role}`}>{user?.role}</span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          {filteredNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}