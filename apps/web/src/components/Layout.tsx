import {
  BarChart3,
  Bell,
  Boxes,
  Home,
  LogOut,
  Menu,
  Package,
  Plus,
  ShoppingBag,
  User,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/auth';

const navItems = [
  { to: '/dashboard', label: 'Главная', icon: Home },
  { to: '/orders', label: 'Заказы', icon: ShoppingBag },
  { to: '/customers', label: 'Клиенты', icon: Users },
  { to: '/products', label: 'Продукты', icon: Boxes },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { to: '/reminders', label: 'Напоминания', icon: Bell },
];

export function AppShell() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();
  const visibleNav = user?.role === 'SUPER_ADMIN' ? [...navItems, { to: '/users', label: 'Пользователи', icon: User }] : navItems;

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      clearSession();
      navigate('/login');
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Package size={22} />
          <div>
            <strong>Cosmetics CRM</strong>
            <span>BYN / склад / продажи</span>
          </div>
        </div>
        <nav className="side-nav">
          {visibleNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx('nav-link', isActive && 'active')}>
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="ghost-button logout" onClick={logout}>
          <LogOut size={18} />
          Выйти
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="mobile-title">
            <Menu size={20} />
            <span>Cosmetics CRM</span>
          </div>
          <div className="topbar-user">
            <span>{user?.login}</span>
            <span className="role-pill">{user?.role === 'SUPER_ADMIN' ? 'Суперадмин' : 'Менеджер'}</span>
          </div>
        </header>
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {visibleNav.slice(0, 4).map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx('bottom-link', isActive && 'active')}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink to="/reminders" className={({ isActive }) => clsx('bottom-link', isActive && 'active')}>
          <Bell size={18} />
          <span>Еще</span>
        </NavLink>
      </nav>

      <NavLink to="/orders/new" className="floating-action">
        <Plus size={20} />
        Новый заказ
      </NavLink>
    </div>
  );
}
