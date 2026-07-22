import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { AlertTriangle, Gamepad2, Film, User, CheckCircle, Trash2, Clock, Filter } from 'lucide-react';

function ErrorReportManager() {
  const [reports, setReports] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [loading, setLoading] = useState(true);

  // Realtime subscription to error_reports
  useEffect(() => {
    const q = query(collection(db, 'error_reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(list);
      setLoading(false);
    }, (err) => {
      console.warn('Error reports subscription error:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleMarkResolved = async (reportId) => {
    try {
      await updateDoc(doc(db, 'error_reports', reportId), { status: 'resolved' });
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa báo lỗi này?')) return;
    try {
      await deleteDoc(doc(db, 'error_reports', reportId));
    } catch (err) {
      alert('Lỗi xóa: ' + err.message);
    }
  };

  // Filter reports by sub-tab
  const filteredReports = activeSubTab === 'all'
    ? reports
    : reports.filter(r => r.type === activeSubTab);

  const counts = {
    all: reports.length,
    player: reports.filter(r => r.type === 'player').length,
    game: reports.filter(r => r.type === 'game').length,
    video: reports.filter(r => r.type === 'video').length
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
      {loading ? (
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
            return (
              <div
                key={report.id}
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
                  <p className="error-report-card-message">{report.message}</p>
                </div>

                <div className="error-report-card-footer">
                  <div className="error-report-card-meta">
                    <span className="error-report-card-sender">
                      <User size={13} /> {report.senderName}
                    </span>
                    <span className="error-report-card-time">
                      <Clock size={13} /> {formatTime(report.createdAt)}
                    </span>
                  </div>
                  <div className="error-report-card-actions">
                    {!isResolved && (
                      <button
                        onClick={() => handleMarkResolved(report.id)}
                        className="error-report-action-btn resolve"
                        title="Đánh dấu đã xử lý"
                      >
                        <CheckCircle size={15} /> Đã xử lý
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(report.id)}
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
