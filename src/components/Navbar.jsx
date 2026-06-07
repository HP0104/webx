import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Wallet, User, LogOut, ShieldAlert, Menu, X, ChevronDown, Search } from 'lucide-react';
import { useAppContext } from '../App';
import { getGamePath } from '../utils/gameRoutes';

function Navbar() {
  const { user, logout, balance, games } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/games?search=${encodeURIComponent(navSearch.trim())}`);
  };

  const handleLinkClick = (e, link) => {
    if (link.isUnderDevelopment) {
      e.preventDefault();
      alert("Tính năng xem Phim đang trong quá trình phát triển. Vui lòng quay lại sau!");
      return;
    }
    if (!link.dropdown) {
      setIsMenuOpen(false);
    }
  };

  const handleDropdownItemClick = (e, item) => {
    if (item.isUnderDevelopment) {
      e.preventDefault();
      alert("Tính năng xem Phim đang trong quá trình phát triển. Vui lòng quay lại sau!");
      return;
    }
    setIsMenuOpen(false);
  };

  const navLinks = [
    { name: 'Trang Chủ', path: '/' },
    { 
      name: 'Game Hot', 
      path: '/category/hot',
      dropdown: [
        { name: 'Game Mới Nhất', path: '/category/new' },
        { name: 'Game Nhiều Người Chơi', path: '/category/popular' },
        { name: 'Game Đánh Giá Cao', path: '/category/top-rated' }
      ]
    },
    { 
      name: 'Game 18+', 
      path: '/category/18-plus',
      dropdown: [
        { name: 'Tất cả game', path: '/category/18-all' },
        { name: 'Việt hoá 18', path: '/category/18-vn' },
        { name: 'Không che', path: '/category/18-uncensored' },
        { name: 'PC', path: '/category/18-pc' },
        { name: 'Android', path: '/category/18-android' }
      ]
    },
    { 
      name: 'Phim', 
      path: '#',
      isUnderDevelopment: true,
      dropdown: [
        { name: 'VAM', path: '#', isUnderDevelopment: true },
        { name: '3D', path: '#', isUnderDevelopment: true }
      ]
    },
    { name: 'Blog', path: '/blog' },
    { name: '🤖 AI Search', path: '/ai-search' },
    { name: 'Báo Lỗi', path: '/report' }
  ];

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand" onClick={() => setIsMenuOpen(false)}>
        <img src="/favicon.svg" alt="WEB18P" className="brand-logo" />
        WEB18P
      </Link>

      <button className="mobile-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      <ul className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
        {navLinks.map((link, index) => (
          <li key={index} className={`nav-item ${location.pathname === link.path ? 'active' : ''}`}>
            {link.isUnderDevelopment ? (
              <a 
                href="#" 
                className="nav-link"
                onClick={(e) => handleLinkClick(e, link)}
              >
                {link.name}
                {link.dropdown && <ChevronDown size={14} style={{ marginLeft: '4px' }} />}
              </a>
            ) : (
              <Link 
                to={link.path} 
                className="nav-link"
                onClick={(e) => handleLinkClick(e, link)}
              >
                {link.name}
                {link.dropdown && <ChevronDown size={14} style={{ marginLeft: '4px' }} />}
              </Link>
            )}
            
            {link.dropdown && (
              <ul className="dropdown-menu">
                {link.dropdown.map((item, idx) => (
                  <li key={idx}>
                    {item.isUnderDevelopment ? (
                      <a 
                        href="#" 
                        className="dropdown-item"
                        onClick={(e) => handleDropdownItemClick(e, item)}
                      >
                        {item.name}
                      </a>
                    ) : (
                      <Link 
                        to={item.path} 
                        className="dropdown-item"
                        onClick={(e) => handleDropdownItemClick(e, item)}
                      >
                        {item.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSearchSubmit} className="nav-search-form" style={{ position: 'relative', display: 'flex', alignItems: 'center', margin: '0 1rem' }}>
        <input 
          type="text" 
          placeholder="Tìm game..." 
          value={navSearch} 
          onChange={e => {
            setNavSearch(e.target.value);
            setShowSuggestions(true);
          }} 
          style={{
            padding: '0.4rem 1rem',
            paddingRight: '2.5rem',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-light)',
            fontSize: '0.85rem',
            outline: 'none',
            transition: 'all 0.3s ease',
            width: navSearch ? '220px' : '160px',
            borderColor: navSearch ? 'var(--color-accent)' : 'var(--color-border)'
          }}
          onFocus={e => {
            e.target.style.width = '220px';
            e.target.style.borderColor = 'var(--color-accent)';
            setShowSuggestions(true);
          }}
          onBlur={e => {
            setTimeout(() => {
              setShowSuggestions(false);
            }, 250);
            if (!navSearch) {
              e.target.style.width = '160px';
              e.target.style.borderColor = 'var(--color-border)';
            }
          }}
        />
        <button type="submit" style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
          <Search size={16} />
        </button>

        {/* Live Search Suggestions Dropdown Overlay */}
        {showSuggestions && navSearch.trim() && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '320px',
            backgroundColor: '#1b2838', // Steam Dark Blue Theme
            border: '1px solid #1a9fff',
            borderRadius: '4px',
            maxHeight: '380px',
            overflowY: 'auto',
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
            padding: '0.5rem 0'
          }}>
            <div style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#1a9fff', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.5px' }}>
              KẾT QUẢ TÌM KIẾM
            </div>
            
            {(() => {
              const matches = games.filter(g => 
                g.title?.toLowerCase().includes(navSearch.toLowerCase()) ||
                g.developer?.toLowerCase().includes(navSearch.toLowerCase())
              ).slice(0, 5);

              if (matches.length === 0) {
                return (
                  <div style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                    Không tìm thấy trò chơi nào
                  </div>
                );
              }

              return matches.map(game => (
                <Link
                  key={game.id}
                  to={getGamePath(game)}
                  onClick={() => {
                    setNavSearch('');
                    setShowSuggestions(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '0.6rem 0.8rem',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    color: 'var(--color-text-light)',
                    textDecoration: 'none',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(26, 159, 255, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Thumbnail Cover */}
                  <div style={{ width: '80px', height: '45px', overflow: 'hidden', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                    <img 
                      src={game.thumbnail || game.image} 
                      alt={game.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>

                  {/* Title & Price Column */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {game.title}
                    </div>
                    <div>
                      {game.price === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: '#a3a3a3' }}>Miễn phí</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {game.discount > 0 && (
                            <span style={{ backgroundColor: '#4c6b22', color: '#a3cf06', fontSize: '0.7rem', padding: '0.05rem 0.2rem', borderRadius: '2px', fontWeight: 'bold' }}>
                              -{game.discount}%
                            </span>
                          )}
                          {game.discount > 0 && (
                            <span style={{ fontSize: '0.7rem', textDecoration: 'line-through', color: '#626366' }}>
                              {game.price.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                          <span style={{ fontSize: '0.8rem', color: '#acb2b8', fontWeight: 'bold' }}>
                            {(game.discount > 0 ? (game.price * (1 - game.discount / 100)) : game.price).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ));
            })()}
          </div>
        )}
      </form>

      <div className="nav-actions">
        {user ? (
          <>
            <Link to="/wallet" className="balance-tag">
              <Wallet size={18} />
              <span>{balance.toLocaleString('vi-VN')} đ</span>
            </Link>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              {user.role === 'admin' && (
                <Link to="/admin" style={{ color: '#ff4d4f', display: 'flex', alignItems: 'center' }} title="Admin Panel">
                  <ShieldAlert size={20} />
                </Link>
              )}
              
              <div className="user-profile" onClick={() => navigate('/profile')}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="avatar" className="avatar" />
                ) : (
                  <User size={20} />
                )}
              </div>
            </div>

            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <Link to="/auth" className="btn btn-primary">
            Đăng nhập
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
