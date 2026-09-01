import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Wallet, User, BookOpen } from 'lucide-react';
import { useAppContext } from '../App';

function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAppContext();

  const navItems = [
    { path: '/', label: 'Trang chủ', icon: Home },
    { path: '/games', label: 'Tìm kiếm', icon: Search },
    { path: '/manga', label: 'Truyện', icon: BookOpen },
    { path: '/wallet', label: 'Ví', icon: Wallet, requireAuth: true },
    { path: '/profile', label: 'Hồ sơ', icon: User, requireAuth: true }
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        
        const destination = item.requireAuth && !user ? '/auth' : item.path;

        return (
          <Link
            key={index}
            to={destination}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={24} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
