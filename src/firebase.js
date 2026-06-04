import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBu21BND7UH8gbWEWYYJw2Ih02MJ_twz5A",
  authDomain: "webk-a064e.firebaseapp.com",
  projectId: "webk-a064e",
  storageBucket: "webk-a064e.firebasestorage.app",
  messagingSenderId: "656477371839",
  appId: "1:656477371839:web:ea4e31c3062a26ddc5f50a",
  measurementId: "G-TK96SLS2MH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
