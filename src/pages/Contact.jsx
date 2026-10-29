import { useState } from 'react';
import { Mail, Send, MessageSquare, Clock, MapPin, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem 5rem', maxWidth: '960px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Quay lại trang chủ
        </Link>
      </div>

      <div className="card" style={{ padding: '2.5rem 2rem', borderRadius: '14px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(102, 192, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
            <Mail size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--color-text-light)', fontWeight: 800 }}>
              Liên Hệ & Hỗ Trợ - WEB18P
            </h1>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Kênh tiếp nhận đóng góp ý kiến, phản hồi kỹ thuật và khiếu nại bản quyền chính thức
            </p>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '1.5rem 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ padding: '1.2rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-accent)', marginBottom: '0.6rem' }}>
              <Mail size={18} />
              <strong style={{ fontSize: '1rem' }}>Email Liên Hệ Trực Tiếp</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
              Hỗ trợ chung: <a href="mailto:contact@web18p.xyz" style={{ color: '#66c0f4', textDecoration: 'underline' }}>contact@web18p.xyz</a><br />
              Bản quyền / DMCA: <a href="mailto:dmca@web18p.xyz" style={{ color: '#66c0f4', textDecoration: 'underline' }}>dmca@web18p.xyz</a>
            </p>
          </div>

          <div style={{ padding: '1.2rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#2ecc71', marginBottom: '0.6rem' }}>
              <MessageSquare size={18} />
              <strong style={{ fontSize: '1rem' }}>Kênh Hỗ Trợ Telegram</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
              Hỗ trợ kỹ thuật 24/7 và giao lưu cộng đồng game thủ qua Telegram chính thức:<br />
              <a href="https://t.me/web18p" target="_blank" rel="noopener noreferrer" style={{ color: '#2ecc71', fontWeight: 600 }}>
                @web18p (t.me/web18p)
              </a>
            </p>
          </div>

          <div style={{ padding: '1.2rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f39c12', marginBottom: '0.6rem' }}>
              <Clock size={18} />
              <strong style={{ fontSize: '1rem' }}>Thời Gian Phản Hồi</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
              Yêu cầu bản quyền DMCA: &le; 24 giờ làm việc.<br />
              Thắc mắc kỹ thuật & link tải: &le; 48 giờ làm việc.
            </p>
          </div>

          <div style={{ padding: '1.2rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#9b59b6', marginBottom: '0.6rem' }}>
              <MapPin size={18} />
              <strong style={{ fontSize: '1rem' }}>Địa Chỉ Đại Diện</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
              18 Nguyễn Huệ, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam (Mã bưu điện: 70000).
            </p>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-light)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={20} color="var(--color-accent)" /> Gửi Tin Nhắn Trực Tiếp Cho Ban Quản Trị
          </h2>

          {submitted ? (
            <div style={{ padding: '1.5rem', backgroundColor: 'rgba(46, 204, 113, 0.12)', border: '1px solid rgba(46, 204, 113, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#2ecc71' }}>
              <CheckCircle2 size={24} />
              <div>
                <strong>Gửi thông tin thành công!</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                  Cảm ơn bạn đã liên hệ. Đội ngũ quản trị WEB18P sẽ phản hồi qua email của bạn trong thời gian sớm nhất.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                    Tên của bạn / Tổ chức *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="input"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                    Địa chỉ Email liên hệ *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="input"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'white' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                  Phân loại yêu cầu
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'white' }}
                >
                  <option value="general">Thắc mắc chung & Góp ý phát triển</option>
                  <option value="bug">Báo cáo lỗi kỹ thuật hoặc sự cố xem phim / tải game</option>
                  <option value="dmca">Khiếu nại bản quyền & Sở hữu trí tuệ (DMCA Notice)</option>
                  <option value="partnership">Hợp tác nội dung / Quảng cáo</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                  Nội dung chi tiết *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Vui lòng cung cấp chi tiết câu hỏi, link bài viết liên quan hoặc thông tin bản quyền cần xử lý..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'white', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.8rem', fontWeight: 600 }}
              >
                {loading ? 'Đang gửi...' : <><Send size={16} /> Gửi Yêu Cầu</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

