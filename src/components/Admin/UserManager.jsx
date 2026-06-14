import { useMemo, useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, ChevronDown, ChevronRight, Clock, Gamepad2, XCircle } from 'lucide-react';
import { formatOwnershipDate, isOwnershipActive, normalizeOwnedGames } from '../../utils/ownership';

function UserManager({ users, games }) {
  const [editingUserId, setEditingUserId] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');

  const gamesById = useMemo(() => {
    return new Map((games || []).map(game => [game.id?.toString(), game]));
  }, [games]);

  const getUserOwnedGameRows = (ownedGames = []) => {
    return normalizeOwnedGames(ownedGames).map(ownership => ({
      ownership,
      game: gamesById.get(ownership.id)
    }));
  };

  const handleAddBalance = async (userId, currentBalance) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: (currentBalance || 0) + 500000
      });
    } catch (error) {
      alert('Lỗi nạp tiền: ' + error.message);
    }
  };

  const handleUpdateBalance = async (userId, currentBalance, type) => {
    if (!balanceAmount || isNaN(balanceAmount) || Number(balanceAmount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }
    
    try {
      const amount = Number(balanceAmount);
      const newBalance = type === 'add' ? (currentBalance || 0) + amount : (currentBalance || 0) - amount;
      
      if (newBalance < 0) {
        alert('Số dư không được phép âm!');
        return;
      }
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: newBalance
      });
      
      setEditingUserId(null);
      setBalanceAmount('');
      alert('Cập nhật tiền thành công!');
    } catch (error) {
      alert('Lỗi cập nhật tiền: ' + error.message);
    }
  };

  return (
    <div className="card">
      <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Quản lý Người dùng</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {users.map(u => {
          const ownedGameRows = getUserOwnedGameRows(u.ownedGames);
          const activeOwnedCount = ownedGameRows.filter(({ ownership }) => isOwnershipActive(ownership)).length;
          const isExpanded = expandedUserId === u.id;

          return (
          <div key={u.id} style={{ padding: '1rem', backgroundColor: 'var(--color-bg-main)', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <div style={{ color: 'var(--color-text-light)', fontWeight: 'bold' }}>{u.username} {u.role === 'admin' && '⭐'}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{u.email}</div>
                <div style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>{(u.balance || 0).toLocaleString('vi-VN')} VNĐ</div>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Xem game người dùng sở hữu"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Gamepad2 size={14} />
                  {activeOwnedCount}/{ownedGameRows.length}
                </button>
                {u.role !== 'admin' && (
                  <>
                    {editingUserId === u.id ? (
                      <>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="Số tiền"
                          value={balanceAmount}
                          onChange={e => setBalanceAmount(e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', width: '70px', margin: 0 }}
                        />
                        <button
                          onClick={() => handleUpdateBalance(u.id, u.balance, 'add')}
                          className="btn btn-success"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--color-success)', color: 'white' }}
                        >
                          Cộng
                        </button>
                        <button
                          onClick={() => handleUpdateBalance(u.id, u.balance, 'subtract')}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#ff4d4f' }}
                        >
                          Trừ
                        </button>
                        <button
                          onClick={() => {
                            setEditingUserId(null);
                            setBalanceAmount('');
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingUserId(u.id);
                            setBalanceAmount('');
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                        >
                          ±
                        </button>
                        <button
                          onClick={() => handleAddBalance(u.id, u.balance)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                        >
                          +500k
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: '0.9rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.9rem' }}>
                {ownedGameRows.length === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <XCircle size={15} />
                    Chưa sở hữu game nào.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {ownedGameRows.map(({ game, ownership }) => {
                      const isActive = isOwnershipActive(ownership);
                      const purchasedAtText = formatOwnershipDate(ownership.purchasedAt);
                      const expiresAtText = formatOwnershipDate(ownership.expiresAt);

                      return (
                        <div
                          key={ownership.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '42px 1fr',
                            gap: '0.75rem',
                            alignItems: 'center',
                            padding: '0.65rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px'
                          }}
                        >
                          {game?.image ? (
                            <img
                              src={game.image}
                              alt={game.title}
                              style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          ) : (
                            <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '4px', color: 'var(--color-text-muted)' }}>
                              <Gamepad2 size={18} />
                            </div>
                          )}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <div style={{ color: 'var(--color-text-light)', fontWeight: 700, fontSize: '0.9rem' }}>
                                {game?.title || `Game ID: ${ownership.id}`}
                              </div>
                              <span style={{ color: isActive ? 'var(--color-success)' : '#ff7875', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                {isActive ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                                {isActive ? 'CÒN HẠN' : 'HẾT HẠN'}
                              </span>
                            </div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.74rem', marginTop: '0.3rem' }}>
                              {purchasedAtText && `Mua: ${purchasedAtText}`}
                              {purchasedAtText && expiresAtText && ' · '}
                              {expiresAtText && `${isActive ? 'Hạn đến' : 'Đã hết hạn'}: ${expiresAtText}`}
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
        })}
      </div>
    </div>
  );
}

export default UserManager;
