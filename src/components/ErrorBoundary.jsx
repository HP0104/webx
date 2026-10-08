import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          color: 'var(--color-text-light, #fff)'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            maxWidth: '520px',
            width: '100%',
            backdropFilter: 'blur(8px)'
          }}>
            <AlertTriangle size={52} color="#ef4444" style={{ marginBottom: '1.2rem' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: 700 }}>
              Đã xảy ra lỗi tải trang
            </h2>
            <p style={{ color: 'var(--color-text-muted, #94a3b8)', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Hệ thống đã ghi nhận sự cố khi hiển thị nội dung này. Bạn vui lòng thử tải lại trang hoặc quay về trang chủ.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.25rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} /> Tải lại trang
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.25rem',
                  cursor: 'pointer'
                }}
              >
                <Home size={16} /> Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
