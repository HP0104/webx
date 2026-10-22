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

export const authService = {
  // Đăng nhập Google
  async loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Kiểm tra và tạo user profile trong Firestore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        username: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL,
        balance: 0,
        ownedGames: [],
        role: 'user',
        createdAt: new Date().toISOString()
      });
    }
    return user;
  },

  // Đăng ký bằng Email
  async registerWithEmail(email, password) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    
    // Tạo profile mặc định
    const userRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userRef, {
      uid: userCredential.user.uid,
      username: email.split('@')[0],
      email: email,
      balance: 0,
      ownedGames: [],
      role: 'user',
      createdAt: new Date().toISOString()
    });
    
    return userCredential.user;
  },

  // Đăng nhập bằng Email hoặc Username
  async loginWithEmailOrUsername(identifier, password) {
    let email = identifier;
    
    // Nếu là username (không có @)
    if (!identifier.includes('@')) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', identifier));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        email = querySnapshot.docs[0].data().email;
      } else {
        throw { code: 'auth/user-not-found' };
      }
    }
    
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  // Quên mật khẩu
  async resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  },

  // Đăng xuất
  async logout() {
    await signOut(auth);
  }
};
