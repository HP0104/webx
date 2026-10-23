import { Link } from 'react-router-dom';
import { Ghost, Home, Gamepad2 } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '3rem 1.5rem'
    }}>
      <div style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'rgba(102, 192, 244, 0.08)',
        border: '1px solid rgba(102, 192, 244, 0.25)',
        marginBottom: '2rem',
        boxShadow: '0 0 30px rgba(102, 192, 244, 0.15)'
      }}>
        <Ghost size={56} color="var(--color-accent)" />
      </div>

      <h1 style={{
        fontSize: '4.5rem',
        fontWeight: '900',
        lineHeight: 1,
        margin: '0 0 0.5rem 0',
        background: 'linear-gradient(135deg, var(--color-accent) 0%, #a855f7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '2px'
      }}>
        404
      </h1>

      <h2 style={{
        color: 'var(--color-text-light)',
        fontSize: '1.6rem',
        fontWeight: 700,
        margin: '0 0 1rem 0'
      }}>
        Trang Không Tồn Tại
      </h2>

      <p style={{
        color: 'var(--color-text-muted)',
        maxWidth: '460px',
        lineHeight: 1.6,
        fontSize: '0.95rem',
        margin: '0 0 2rem 0'
      }}>
        Đường dẫn bạn vừa truy cập có thể đã bị thay đổi, di chuyển hoặc không còn tồn tại trên WEB18P.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <Home size={18} /> Về Trang Chủ
        </Link>
        <Link to="/games" className="btn btn-outline" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Gamepad2 size={18} /> Khám Phá Kho Game
        </Link>
      </div>
    </div>
  );
}
