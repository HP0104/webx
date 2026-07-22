import React, { useState } from 'react';
import { AlertTriangle, X, Send, CheckCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../App';

/**
 * ErrorReportButton – A button + modal component for reporting errors on game/video pages.
 * @param {{ type: 'game' | 'video', itemId: string, itemTitle: string }} props
 */
function ErrorReportButton({ type, itemId, itemTitle }) {
  const { user } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'error_reports'), {
        type,
        itemId: itemId?.toString() || '',
        itemTitle: itemTitle || '',
        message: message.trim(),
        senderName: user.username || user.email,
        senderId: user.id || user.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSent(true);
      setMessage('');
      setTimeout(() => {
        setSent(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Gửi báo lỗi thất bại: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const typeLabel = type === 'game' ? 'game' : 'phim';

  return (
    <>
      <button
        onClick={() => {
          if (!user) {
            alert('Vui lòng đăng nhập để báo lỗi!');
            return;
          }
          setIsOpen(true);
        }}
        className="error-report-trigger-btn"
        title={`Báo lỗi ${typeLabel} này`}
      >
        <AlertTriangle size={16} />
        <span>Báo lỗi</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="error-report-overlay" onClick={() => setIsOpen(false)}>
          <div className="error-report-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="error-report-modal-header">
              <div className="error-report-modal-header-left">
                <AlertTriangle size={20} className="error-report-modal-icon" />
                <h3>Báo lỗi {typeLabel}</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="error-report-close-btn">
                <X size={18} />
              </button>
            </div>

            {/* Item info */}
            <div className="error-report-item-info">
              <span className="error-report-item-type-badge">
                {type === 'game' ? '🎮 Game' : '🎬 Phim'}
              </span>
              <span className="error-report-item-title">{itemTitle}</span>
            </div>

            {/* Success state */}
            {sent ? (
              <div className="error-report-success">
                <CheckCircle size={40} />
                <p>Đã gửi báo lỗi thành công!</p>
                <span>Admin sẽ xem xét và xử lý sớm nhất.</span>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="error-report-form">
                <label className="error-report-label">
                  Mô tả lỗi bạn gặp phải:
                </label>
                <textarea
                  className="error-report-textarea"
                  placeholder={`Ví dụ: Link tải bị lỗi, video không phát được, ${typeLabel} bị crash...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required
                  autoFocus
                />
                <div className="error-report-form-actions">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="error-report-cancel-btn"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="error-report-submit-btn"
                    disabled={sending || !message.trim()}
                  >
                    <Send size={14} />
                    {sending ? 'Đang gửi...' : 'Gửi báo lỗi'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ErrorReportButton;
