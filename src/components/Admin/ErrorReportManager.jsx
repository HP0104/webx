import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { AlertTriangle, Gamepad2, Film, User, CheckCircle, Trash2, Clock, Filter, Image as ImageIcon } from 'lucide-react';

function ErrorReportManager() {
  const [errorReports, setErrorReports] = useState([]);
  const [chatReports, setChatReports] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(true);

  // Realtime subscription to error_reports (new system - game/video)
  useEffect(() => {
    const q = query(collection(db, 'error_reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        _collection: 'error_reports',
        ...d.data()
      }));
      setErrorReports(list);
      setLoading(false);
    }, (err) => {
      console.warn('Error reports subscription error:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Realtime subscription to reports (old chat system - player reports)
  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Group chat messages by channelId, take the latest message per channel as summary
      const messagesMap = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        const channelId = data.channelId;
        if (!channelId) return;
        
        // Skip admin replies - only show user messages
        if (data.senderRole === 'admin') return;

        if (!messagesMap[channelId]) {
          messagesMap[channelId] = {
            id: d.id,
            _collection: 'reports',
            _channelId: channelId,
            type: 'player',
            itemId: '',
            itemTitle: '',
            message: data.text || '',
            image: data.image || null,
            senderName: data.senderName || 'Người dùng',
            senderId: data.senderId || '',
            status: 'pending',
            createdAt: data.createdAt,
            _messageCount: 1
          };
        } else {
          // Update with latest message
          messagesMap[channelId].message = data.text || messagesMap[channelId].message;
          messagesMap[channelId].image = data.image || messagesMap[channelId].image;
          messagesMap[channelId].createdAt = data.createdAt || messagesMap[channelId].createdAt;
          messagesMap[channelId]._messageCount += 1;
        }
      });

      setChatReports(Object.values(messagesMap));
      setLoadingChat(false);
    }, (err) => {
      console.warn('Chat reports subscription error:', err);
      setLoadingChat(false);
    });
    return () => unsubscribe();
  }, []);

  // Merge both report sources
  const allReports = [...errorReports, ...chatReports].sort((a, b) => {
    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    return timeB - timeA; // newest first
  });

  const handleMarkResolved = async (report) => {
    try {
      await updateDoc(doc(db, report._collection, report.id), { status: 'resolved' });
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    }
  };

  const handleDelete = async (report) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa báo lỗi này?')) return;
    try {
      if (report._collection === 'reports' && report._channelId) {
        // For chat reports, delete all messages in the channel
        // Just delete the summary doc for now (individual message)
        await deleteDoc(doc(db, 'reports', report.id));
      } else {
        await deleteDoc(doc(db, report._collection, report.id));
      }
    } catch (err) {
      alert('Lỗi xóa: ' + err.message);
    }
  };

  // Filter reports by sub-tab
  const filteredReports = activeSubTab === 'all'
    ? allReports
    : allReports.filter(r => r.type === activeSubTab);

  const counts = {
    all: allReports.length,
    player: allReports.filter(r => r.type === 'player').length,
    game: allReports.filter(r => r.type === 'game').length,
    video: allReports.filter(r => r.type === 'video').length
  };

  const subTabs = [
    { id: 'all', label: 'Tất cả', icon: Filter, color: '#8b5cf6' },
    { id: 'player', label: 'Người chơi', icon: User, color: '#3b82f6' },
    { id: 'game', label: 'Game', icon: Gamepad2, color: '#f8b319' },
    { id: 'video', label: 'Phim', icon: Film, color: '#ec4899' }
  ];

  const getTypeInfo = (type) => {
    switch (type) {
      case 'game': return { label: '🎮 Game', color: '#f8b319', bg: 'rgba(248,179,25,0.1)' };
      case 'video': return { label: '🎬 Phim', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' };
      case 'player': return { label: '👤 Người chơi', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
      default: return { label: '❓ Khác', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isLoading = loading || loadingChat;

  return (
    <div className="error-report-manager">
      {/* Sub-tab navigation */}
      <div className="error-report-subtabs">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`error-report-subtab ${isActive ? 'active' : ''}`}
              style={{
                '--tab-color': tab.color
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <span className="error-report-subtab-count">{counts[tab.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Report List */}
      {isLoading ? (
        <div className="error-report-empty">
          <Clock size={32} className="spin" />
          <p>Đang tải báo lỗi...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="error-report-empty">
          <CheckCircle size={48} />
          <p>Không có báo lỗi nào{activeSubTab !== 'all' ? ` trong mục "${subTabs.find(t => t.id === activeSubTab)?.label}"` : ''}.</p>
          <span>Tất cả đã được xử lý! 🎉</span>
        </div>
      ) : (
        <div className="error-report-list">
          {filteredReports.map(report => {
            const typeInfo = getTypeInfo(report.type);
            const isResolved = report.status === 'resolved';
            const isChatReport = report._collection === 'reports';
            return (
              <div
                key={`${report._collection}-${report.id}`}
                className={`error-report-card ${isResolved ? 'resolved' : ''}`}
              >
                <div className="error-report-card-header">
                  <div className="error-report-card-header-left">
                    <span
                      className="error-report-type-badge"
                      style={{ color: typeInfo.color, backgroundColor: typeInfo.bg }}
                    >
                      {typeInfo.label}
                    </span>
                    {isChatReport && report._messageCount > 1 && (
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.5rem',
                        borderRadius: '10px',
                        background: 'rgba(59,130,246,0.1)',
                        color: '#3b82f6',
                        fontWeight: 700
                      }}>
                        💬 {report._messageCount} tin nhắn
                      </span>
                    )}
                    {report.itemTitle && (
                      <span className="error-report-card-item-title">
                        {report.itemTitle}
                      </span>
                    )}
                  </div>
                  <span className={`error-report-status-badge ${isResolved ? 'resolved' : 'pending'}`}>
                    {isResolved ? '✅ Đã xử lý' : '⏳ Chờ xử lý'}
                  </span>
                </div>

                <div className="error-report-card-body">
                  {report.image && (
                    <img
                      src={report.image}
                      alt="Ảnh báo lỗi"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        borderRadius: '6px',
                        marginBottom: '0.5rem',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        display: 'block'
                      }}
                      onClick={() => window.open(report.image, '_blank')}
                    />
                  )}
                  <p className="error-report-card-message">
                    {report.message || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>(Chỉ có ảnh đính kèm)</span>}
                  </p>
                </div>

                <div className="error-report-card-footer">
                  <div className="error-report-card-meta">
                    <span className="error-report-card-sender">
                      <User size={13} /> {report.senderName}
                    </span>
                    <span className="error-report-card-time">
                      <Clock size={13} /> {formatTime(report.createdAt)}
                    </span>
                    {isChatReport && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                        từ Chat hỗ trợ
                      </span>
                    )}
                  </div>
                  <div className="error-report-card-actions">
                    {!isResolved && (
                      <button
                        onClick={() => handleMarkResolved(report)}
                        className="error-report-action-btn resolve"
                        title="Đánh dấu đã xử lý"
                      >
                        <CheckCircle size={15} /> Đã xử lý
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(report)}
                      className="error-report-action-btn delete"
                      title="Xóa báo lỗi"
                    >
                      <Trash2 size={15} /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ErrorReportManager;
