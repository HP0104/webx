import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { deriveUsernameFromAuthUser } from '../utils/userUtils';

const WORKER_BASE_URL = 'https://web18p-deloy.takarvn.workers.dev';

async function syncUsernameLookup(username, email) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanEmail = String(email || '').trim();
  if (!cleanUsername || !cleanEmail) return;
  try {
    await setDoc(doc(db, 'auth_lookup', cleanUsername), { email: cleanEmail }, { merge: true });
  } catch {
    // Best-effort lookup sync
  }
}

export const authService = {
  // Đăng nhập Google
  async loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Kiểm tra và tạo user profile trong Firestore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const username = deriveUsernameFromAuthUser(user);
      await setDoc(userRef, {
        uid: user.uid,
        username,
        email: user.email || '',
        photoURL: user.photoURL || null,
        balance: 0,
        ownedGames: [],
        role: 'user',
        createdAt: new Date().toISOString()
      });
      await syncUsernameLookup(username, user.email);
    }
    return user;
  },

  // Đăng ký bằng Email
  async registerWithEmail(email, password) {
    const cleanEmail = (email || '').trim();
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    await sendEmailVerification(userCredential.user);
    
    // Tạo profile mặc định
    const username = deriveUsernameFromAuthUser({ email: cleanEmail, uid: userCredential.user.uid });
    const userRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userRef, {
      uid: userCredential.user.uid,
      username,
      email: cleanEmail,
      balance: 0,
      ownedGames: [],
      role: 'user',
      createdAt: new Date().toISOString()
    });
    await syncUsernameLookup(username, cleanEmail);
    
    return userCredential.user;
  },

  // Đăng nhập bằng Email hoặc Username
  async loginWithEmailOrUsername(identifier, password) {
    const cleanId = (identifier || '').trim();
    let email = cleanId;
    
    // Nếu là username (không có @)
    if (!cleanId.includes('@')) {
      let resolvedEmail = '';

      // 1. Thử đọc bảng auth_lookup trước (không làm lộ bảng users)
      try {
        const lookupSnap = await getDoc(doc(db, 'auth_lookup', cleanId.toLowerCase()));
        if (lookupSnap.exists() && lookupSnap.data()?.email) {
          resolvedEmail = lookupSnap.data().email;
        }
      } catch {}

      // 2. Fallback qua Cloudflare Worker cho tài khoản cũ chưa có auth_lookup
      if (!resolvedEmail) {
        try {
          const res = await fetch(`${WORKER_BASE_URL}/resolve-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanId })
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.email) resolvedEmail = data.email;
          }
        } catch {}
      }

      // 3. Fallback đọc users (chỉ chạy nếu rules cũ còn cho phép)
      if (!resolvedEmail) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('username', '==', cleanId));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            resolvedEmail = querySnapshot.docs[0].data().email || '';
          }
        } catch {}
      }

      if (resolvedEmail) {
        email = resolvedEmail;
      } else {
        throw { code: 'auth/user-not-found' };
      }
    }
    
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    return result.user;
  },

  // Quên mật khẩu
  async resetPassword(email) {
    await sendPasswordResetEmail(auth, (email || '').trim());
  },

  // Đăng xuất
  async logout() {
    await signOut(auth);
  }
};
