// auth.js — Authentication operations (ES module)
import { auth, db, googleProvider } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Create/merge a user document in Firestore
async function upsertUserDoc(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    displayName: data.displayName || '',
    email:       data.email       || '',
    photoURL:    data.photoURL    || null,
    createdAt:   serverTimestamp()
  }, { merge: true });
}

// ── Email / Password ──────────────────────────────────────
export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await upsertUserDoc(cred.user.uid, { displayName, email, photoURL: null });
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Google Sign-In ────────────────────────────────────────
export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));
  if (!snap.exists()) {
    await upsertUserDoc(cred.user.uid, {
      displayName: cred.user.displayName,
      email:       cred.user.email,
      photoURL:    cred.user.photoURL
    });
  }
  return cred.user;
}

// ── Sign Out ──────────────────────────────────────────────
export async function logOut() {
  await fbSignOut(auth);
}

// ── Password Reset ────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Friendly error messages ───────────────────────────────
export function friendlyError(code) {
  const map = {
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/invalid-credential':      'Incorrect email or password.',
    'auth/email-already-in-use':    'An account with this email already exists.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/too-many-requests':       'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user':    'Sign-in window was closed. Please try again.',
    'auth/network-request-failed':  'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

export { auth, onAuthStateChanged };
