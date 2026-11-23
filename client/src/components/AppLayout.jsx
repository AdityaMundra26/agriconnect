import { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Sprout,
  Store,
  ShoppingBag,
  ClipboardList,
  BarChart3,
  Bot,
  ShieldCheck,
  UserCircle,
  LogOut,
  Menu,
  Moon,
  Sun,
  Leaf,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import { Avatar } from './ui.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['farmer', 'buyer', 'admin'] },
  { to: '/farm', label: 'My Farm', icon: Sprout, roles: ['farmer'] },
  { to: '/marketplace', label: 'Marketplace', icon: Store, roles: ['farmer', 'buyer', 'admin'] },
  { to: '/orders', label: 'Orders', icon: ShoppingBag, roles: ['farmer', 'buyer', 'admin'] },
  { to: '/reports', label: 'Field Reports', icon: ClipboardList, roles: ['farmer', 'admin'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['farmer', 'buyer', 'admin'] },
  { to: '/assistant', label: 'AI Assistant', icon: Bot, roles: ['farmer', 'buyer'] },
  { to: '/admin', label: 'Admin Console', icon: ShieldCheck, roles: ['admin'] },
];

export function BrandLogo({ to = '/' }) {
  return (
    <Link to={to} className="brand">
      <span className="brand-mark">
        <Leaf size={19} />
      </span>
      <span className="brand-name">
        Agri<span>Connect</span>
      </span>
    </Link>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="btn btn-ghost btn-icon" onClick={toggle} aria-label="Toggle dark mode" title="Toggle theme">
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu whenever the route changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
  }

  const items = NAV.filter((n) => n.roles.includes(user.role));
  const current = [...NAV, { to: '/profile', label: 'Profile' }].find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <BrandLogo to="/dashboard" />
        <nav className="nav">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-section">Account</div>
        <nav className="nav">
          <NavLink to="/profile">
            <UserCircle size={18} /> Profile
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <Avatar name={user.name} />
            <div className="meta">
              <div className="name">{user.name}</div>
              <div className="role">{user.role}</div>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={logout} title="Log out" aria-label="Log out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className={`sidebar-backdrop ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="topbar-title">{current?.label}</span>
          <div className="topbar-actions">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
