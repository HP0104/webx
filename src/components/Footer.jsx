import { Link } from 'react-router-dom';
import DMCABadge from './DMCABadge';

export default function Footer() {
  return (
    <footer style={{ marginTop: '3rem', padding: '1.5rem 1rem 3rem', textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '1.2rem', marginBottom: '1.2rem' }}>
        <Link to="/about" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none', transition: 'color 0.2s' }}>
          Về Chúng Tôi
        </Link>
        <span style={{ opacity: 0.3 }}>•</span>
        <Link to="/contact" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none', transition: 'color 0.2s' }}>
          Liên Hệ & Hỗ Trợ
        </Link>
        <span style={{ opacity: 0.3 }}>•</span>
        <Link to="/privacy" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none', transition: 'color 0.2s' }}>
          Chính Sách Quyền Riêng Tư
        </Link>
        <span style={{ opacity: 0.3 }}>•</span>
        <Link to="/report" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none', transition: 'color 0.2s' }}>
          Báo Lỗi & DMCA
        </Link>
        <span style={{ opacity: 0.3 }}>•</span>
        <a href="/llms.txt" target="_blank" rel="noopener noreferrer" style={{ color: '#66c0f4', textDecoration: 'none' }}>
          Agent Guide (llms.txt)
        </a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <DMCABadge />
      </div>

      <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.45)' }}>
        &copy; {new Date().getFullYear()} WEB18P (web18p.xyz) - Kho Game Việt Hóa, Phim Bộ & Truyện Tranh Online. All rights reserved.
      </p>
    </footer>
  );
}

