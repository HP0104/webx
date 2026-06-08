import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

function UserManager({ users }) {
  const [editingUserId, setEditingUserId] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');

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
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--color-bg-main)', borderRadius: '4px', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ color: 'var(--color-text-light)', fontWeight: 'bold' }}>{u.username} {u.role === 'admin' && '⭐'}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{u.email}</div>
              <div style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>{(u.balance || 0).toLocaleString('vi-VN')} VNĐ</div>
            </div>
            {u.role !== 'admin' && (
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
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
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserManager;
