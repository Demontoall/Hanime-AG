// firebase-config.js — Firebase v10 initialisation (ES module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB4EYtibp4h_l6u8t46LUcefaM0kpQLTD4",
  authDomain: "hanime-ag.firebaseapp.com",
  projectId: "hanime-ag",
  storageBucket: "hanime-ag.firebasestorage.app",
  messagingSenderId: "909723660128",
  appId: "1:909723660128:web:e564e79e451d156db1b805",
  measurementId: "G-64T58DDWC9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
