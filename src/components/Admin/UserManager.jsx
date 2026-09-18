import React, { useMemo, useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  CheckCircle2, ChevronDown, ChevronRight, Clock, Gamepad2, XCircle, Search, 
  Film, Users, Shield, Wallet, Copy, Check, Plus, Minus, ArrowUpDown, 
  Calendar, Mail, UserCheck, ChevronLeft, ChevronsLeft, ChevronsRight, X
} from 'lucide-react';
import { formatOwnershipDate, isOwnershipActive, normalizeOwnedGames } from '../../utils/ownership';

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];
const USERS_PER_PAGE = 15;

const getAvatarGradient = (username = '') => {
  const gradients = [
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)'
  ];
  let hash = 0;
  for (let i = 0; i < (username || '').length; i++) hash += username.charCodeAt(i);
  return gradients[Math.abs(hash) % gradients.length];
};

function UserManager({ users = [], games = [] }) {
  const [editingUserId, setEditingUserId] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('highest_balance');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedUid, setCopiedUid] = useState(null);

  const gamesById = useMemo(() => {
    return new Map((games || []).map(game => [game.id?.toString(), game]));
  }, [games]);

  const getUserOwnedGameRows = (ownedGames = []) => {
    return normalizeOwnedGames(ownedGames).map(ownership => ({
      ownership,
      game: gamesById.get(ownership.id?.toString())
    }));
  };

  // Summary statistics
  const stats = useMemo(() => {
    let totalBalance = 0;
    let uploaderCount = 0;
    let adminCount = 0;
    let activeGamers = 0;

    users.forEach(u => {
      totalBalance += Number(u.balance) || 0;
      if (u.role === 'admin') adminCount++;
      else if (u.role === 'uploader') uploaderCount++;
      if (Array.isArray(u.ownedGames) && u.ownedGames.length > 0) activeGamers++;
    });

    return {
      total: users.length,
      totalBalance,
      uploaderCount,
      adminCount,
      userCount: users.length - uploaderCount - adminCount,
      activeGamers
    };
  }, [users]);

  // Filtering & Sorting
  const processedUsers = useMemo(() => {
    let list = users.filter(u => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesUsername = (u.username || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesUid = (u.id || u.uid || '').toLowerCase().includes(q);
        if (!matchesUsername && !matchesEmail && !matchesUid) return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        const currentRole = u.role || 'user';
        if (currentRole !== roleFilter) return false;
      }

      // Balance filter
      const bal = Number(u.balance) || 0;
      if (balanceFilter === 'has_balance' && bal <= 0) return false;
      if (balanceFilter === 'zero_balance' && bal > 0) return false;

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      const balA = Number(a.balance) || 0;
      const balB = Number(b.balance) || 0;
      if (sortBy === 'highest_balance') return balB - balA;
      if (sortBy === 'lowest_balance') return balA - balB;
      if (sortBy === 'name_asc') return (a.username || '').localeCompare(b.username || '');
      if (sortBy === 'most_games') {
        return (b.ownedGames?.length || 0) - (a.ownedGames?.length || 0);
      }
      // default: newest
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }, [users, searchTerm, roleFilter, balanceFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedUsers.length / USERS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return processedUsers.slice(start, start + USERS_PER_PAGE);
  }, [processedUsers, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 150, behavior: 'smooth' });
    }
  };

  const handleCopyUid = (uid) => {
    if (!uid) return;
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const handleQuickAdd = async (userId, currentBalance, addAmount) => {
    try {
      const userRef = doc(db, 'users', userId);
      const newBal = (currentBalance || 0) + addAmount;
      await updateDoc(userRef, { balance: newBal });
      alert(`Đã nạp +${addAmount.toLocaleString('vi-VN')} VNĐ vào tài khoản!`);
    } catch (error) {
      alert('Lỗi nạp tiền: ' + error.message);
    }
  };

  const handleUpdateBalance = async (userId, currentBalance, type) => {
    const amount = Number(balanceAmount);
    if (!balanceAmount || isNaN(amount) || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ (> 0)!');
      return;
    }
    
    try {
      const newBalance = type === 'add' ? (currentBalance || 0) + amount : (currentBalance || 0) - amount;
      
      if (newBalance < 0) {
        alert('Số dư tài khoản không được phép âm!');
        return;
      }
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { balance: newBalance });
      
      setEditingUserId(null);
      setBalanceAmount('');
      alert(`Cập nhật thành công! Số dư mới: ${newBalance.toLocaleString('vi-VN')} VNĐ`);
    } catch (error) {
      alert('Lỗi cập nhật tiền: ' + error.message);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'uploader' ? 'user' : 'uploader';
    const roleLabel = nextRole === 'uploader' ? 'Uploader (Người đăng video)' : 'Thành viên thường (User)';
    if (!window.confirm(`Bạn có chắc muốn chuyển vai trò tài khoản này thành "${roleLabel}"?`)) {
      return;
    }
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: nextRole });
      alert('Đổi quyền thành công!');
    } catch (error) {
      alert('Lỗi đổi quyền: ' + error.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Quick Stats Overview Bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '1rem' 
      }}>
        <div className="card" style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Tổng Người dùng</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-light)' }}>{stats.total}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Tổng Tiền Trong Ví</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>{stats.totalBalance.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(0, 210, 211, 0.12)', color: '#00d2d3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Uploader Studio</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00d2d3' }}>{stats.uploaderCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Quản trị viên (Admin)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>{stats.adminCount}</div>
          </div>
        </div>
      </div>

      {/* 2. Search, Filter & Sort Toolbar */}
      <div className="card" style={{ padding: '1.2rem 1.4rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Tìm theo Username, Email hoặc UID..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '36px', paddingRight: '12px', margin: 0, width: '100%', fontSize: '0.88rem' }}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', flex: '2 1 340px', justifyContent: 'flex-end' }}>
            {/* Role Filter */}
            <select
              className="input-field"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.84rem', margin: 0, minWidth: '140px', flex: '1 1 120px' }}
            >
              <option value="all">Tất cả vai trò</option>
              <option value="uploader">🎬 Uploader ({stats.uploaderCount})</option>
              <option value="admin">⭐ Admin ({stats.adminCount})</option>
              <option value="user">👤 User thường ({stats.userCount})</option>
            </select>

            {/* Balance Filter */}
            <select
              className="input-field"
              value={balanceFilter}
              onChange={(e) => { setBalanceFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.84rem', margin: 0, minWidth: '140px', flex: '1 1 120px' }}
            >
              <option value="all">Tất cả số dư</option>
              <option value="has_balance">💰 Có tiền (&gt; 0đ)</option>
              <option value="zero_balance">Ví 0đ</option>
            </select>

            {/* Sort Filter */}
            <select
              className="input-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.84rem', margin: 0, minWidth: '150px', flex: '1 1 130px' }}
            >
              <option value="highest_balance">💵 Số dư cao nhất</option>
              <option value="lowest_balance">💵 Số dư thấp nhất</option>
              <option value="most_games">🎮 Nhiều game nhất</option>
              <option value="name_asc">🔤 Tên A-Z</option>
              <option value="newest">⏱️ Mới nhất</option>
            </select>
          </div>
        </div>

        {/* Results summary bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <div>
            Hiển thị <strong>{processedUsers.length}</strong> / {users.length} tài khoản
            {searchTerm && <span> cho từ khóa "<em>{searchTerm}</em>"</span>}
          </div>
          <div>
            Trang {currentPage} / {totalPages}
          </div>
        </div>
      </div>

      {/* 3. User List Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {paginatedUsers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>Không tìm thấy người dùng nào phù hợp.</div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.3rem' }}>Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.</div>
          </div>
        ) : (
          paginatedUsers.map((u) => {
            const ownedGameRows = getUserOwnedGameRows(u.ownedGames);
            const activeOwnedCount = ownedGameRows.filter(({ ownership }) => isOwnershipActive(ownership)).length;
            const isExpanded = expandedUserId === u.id;
            const isEditingBalance = editingUserId === u.id;
            const userBal = Number(u.balance) || 0;
            const userId = u.id || u.uid || '';

            return (
              <div key={u.id} className="user-row-card">
                {/* Main Card Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Left: Avatar & Identity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px', flex: '1 1 250px' }}>
                    {u.photoURL ? (
                      <img 
                        src={u.photoURL} 
                        alt={u.username} 
                        className="user-avatar-circle" 
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div 
                      className="user-avatar-circle" 
                      style={{ 
                        background: getAvatarGradient(u.username),
                        display: u.photoURL ? 'none' : 'flex'
                      }}
                    >
                      {(u.username || 'U')[0].toUpperCase()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--color-text-light)', fontWeight: 700, fontSize: '0.96rem' }}>
                          {u.username || 'Không tên'}
                        </span>

                        {u.role === 'admin' && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            ⭐ Admin
                          </span>
                        )}
                        {u.role === 'uploader' && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(0, 210, 211, 0.2)', color: '#00d2d3', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            🎬 Uploader
                          </span>
                        )}
                        {(!u.role || u.role === 'user') && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 500, padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.06)', color: 'var(--color-text-muted)' }}>
                            User
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Mail size={12} />
                          {u.email || 'Chưa cập nhật email'}
                        </span>

                        {userId && (
                          <button
                            type="button"
                            onClick={() => handleCopyUid(userId)}
                            className="user-uid-pill"
                            title="Click để sao chép UID"
                          >
                            {copiedUid === userId ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                            <span>{userId.slice(0, 8)}...</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center: Balance & Assets */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Số dư tài khoản</div>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 800, 
                        color: userBal > 0 ? '#10b981' : 'var(--color-text-muted)' 
                      }}>
                        {userBal.toLocaleString('vi-VN')} VNĐ
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                      className="btn btn-outline"
                      style={{ 
                        fontSize: '0.78rem', 
                        padding: '0.35rem 0.65rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.35rem',
                        borderColor: activeOwnedCount > 0 ? 'rgba(248, 179, 25, 0.4)' : 'var(--color-border)',
                        color: activeOwnedCount > 0 ? '#f8b319' : 'var(--color-text-muted)'
                      }}
                      title="Xem danh sách game đã mua"
                    >
                      <Gamepad2 size={15} />
                      <span>Game ({activeOwnedCount}/{ownedGameRows.length})</span>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingBalance) {
                          setEditingUserId(null);
                          setBalanceAmount('');
                        } else {
                          setEditingUserId(u.id);
                          setBalanceAmount('');
                        }
                      }}
                      className="btn btn-outline"
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.4rem 0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        borderColor: isEditingBalance ? 'var(--color-accent)' : 'rgba(59, 130, 246, 0.4)',
                        color: isEditingBalance ? 'var(--color-accent)' : '#60a5fa'
                      }}
                    >
                      <Wallet size={14} />
                      {isEditingBalance ? 'Đóng nạp' : 'Nạp / Trừ'}
                    </button>

                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleToggleRole(u.id, u.role)}
                        className="btn btn-outline"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.4rem 0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          borderColor: u.role === 'uploader' ? 'rgba(0, 210, 211, 0.4)' : 'var(--color-border)',
                          color: u.role === 'uploader' ? '#00d2d3' : 'var(--color-text-muted)'
                        }}
                        title={u.role === 'uploader' ? 'Chuyển về User thông thường' : 'Cấp quyền đăng video'}
                      >
                        <Film size={14} />
                        {u.role === 'uploader' ? 'Hạ quyền' : 'Cấp Uploader'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Balance Editor Box (Expanded when clicking Nạp/Trừ) */}
                {isEditingBalance && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(102, 192, 244, 0.3)',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Wallet size={16} color="var(--color-accent)" />
                        Điều chỉnh số dư ví cho <u>{u.username}</u> (Hiện tại: <span style={{ color: '#10b981' }}>{userBal.toLocaleString('vi-VN')} đ</span>)
                      </div>
                      <button
                        type="button"
                        onClick={() => { setEditingUserId(null); setBalanceAmount(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', alignSelf: 'center', marginRight: '0.3rem' }}>Nạp nhanh:</span>
                      {PRESET_AMOUNTS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleQuickAdd(u.id, u.balance, amt)}
                          className="quick-tag-chip"
                          style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}
                        >
                          +{amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}
                        </button>
                      ))}
                    </div>

                    {/* Custom Input & Action buttons */}
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="Nhập số tiền VNĐ (VD: 100000)"
                          value={balanceAmount}
                          onChange={(e) => setBalanceAmount(e.target.value)}
                          style={{ margin: 0, padding: '0.55rem 0.85rem', fontSize: '0.85rem' }}
                        />
                      </div>

                      {balanceAmount && !isNaN(Number(balanceAmount)) && Number(balanceAmount) > 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', minWidth: '120px' }}>
                          ≈ {Number(balanceAmount).toLocaleString('vi-VN')} đ
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleUpdateBalance(u.id, u.balance, 'add')}
                        className="btn btn-success"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.55rem 1rem',
                          backgroundColor: 'var(--color-success)',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Plus size={14} />
                        Cộng tiền
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateBalance(u.id, u.balance, 'subtract')}
                        className="btn btn-outline"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.55rem 1rem',
                          borderColor: 'rgba(239, 68, 68, 0.5)',
                          color: '#ef4444',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Minus size={14} />
                        Trừ tiền
                      </button>
                    </div>
                  </div>
                )}

                {/* Owned Games Expanded Drawer */}
                {isExpanded && (
                  <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Gamepad2 size={15} color="var(--color-accent)" />
                      Danh sách game {u.username} đang sở hữu ({ownedGameRows.length}):
                    </div>

                    {ownedGameRows.length === 0 ? (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <XCircle size={15} />
                        Tài khoản này chưa mua game nào trên hệ thống.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem' }}>
                        {ownedGameRows.map(({ game, ownership }) => {
                          const isActive = isOwnershipActive(ownership);
                          const purchasedAtText = formatOwnershipDate(ownership.purchasedAt);
                          const expiresAtText = formatOwnershipDate(ownership.expiresAt);

                          return (
                            <div
                              key={ownership.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.65rem',
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px'
                              }}
                            >
                              {game?.image ? (
                                <img
                                  src={game.image}
                                  alt={game.title}
                                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                                />
                              ) : (
                                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '6px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                  <Gamepad2 size={20} />
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                                  <div style={{ color: 'var(--color-text-light)', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {game?.title || `Game #${ownership.id}`}
                                  </div>
                                  <span style={{ 
                                    color: isActive ? '#10b981' : '#ff4d4f', 
                                    fontSize: '0.68rem', 
                                    fontWeight: 700, 
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 77, 79, 0.15)',
                                    flexShrink: 0 
                                  }}>
                                    {isActive ? 'CÒN HẠN' : 'HẾT HẠN'}
                                  </span>
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                                  {purchasedAtText && `Mua: ${purchasedAtText}`}
                                  {expiresAtText && ` · Hạn: ${expiresAtText}`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Pagination Navigation Bar */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
            title="Trang đầu"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
            title="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .map((pageNum, idx, arr) => {
              const showEllipsisBefore = idx > 0 && pageNum - arr[idx - 1] > 1;
              return (
                <React.Fragment key={pageNum}>
                  {showEllipsisBefore && <span style={{ color: 'var(--color-text-muted)', padding: '0 0.3rem' }}>...</span>}
                  <button
                    type="button"
                    className={`btn ${currentPage === pageNum ? 'btn-success' : 'btn-outline'}`}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.82rem',
                      fontWeight: currentPage === pageNum ? 700 : 500,
                      backgroundColor: currentPage === pageNum ? 'var(--color-accent)' : 'transparent',
                      color: currentPage === pageNum ? '#000' : 'var(--color-text-light)',
                      borderColor: currentPage === pageNum ? 'var(--color-accent)' : 'var(--color-border)'
                    }}
                  >
                    {pageNum}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
            title="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
            title="Trang cuối"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default UserManager;
