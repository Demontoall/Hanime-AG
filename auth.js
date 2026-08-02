// auth.js — Authentication operations (ES module)
import { auth, db, googleProvider, storage } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
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
// Tries popup first (fast UX). If the browser blocks it (common inside iframes
// like Replit's preview pane), falls back to a full-page redirect.
export async function loginWithGoogle() {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await _afterGoogle(cred.user);
    return cred.user;
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-blocked-by-browser') {
      // Popup was blocked — fall back to redirect flow.
      // handleGoogleRedirect() on the next page load will finish the sign-in.
      await signInWithRedirect(auth, googleProvider);
      return null; // page navigates away; no return value needed
    }
    throw err; // re-throw real errors (wrong domain, user closed popup, etc.)
  }
}

// Call this on page load for any page that has a Google sign-in button.
// Handles the result when the browser returns from the Google redirect page.
// Returns the signed-in user, or null if there was no pending redirect.
export async function handleGoogleRedirect() {
  const cred = await getRedirectResult(auth);
  if (cred?.user) {
    await _afterGoogle(cred.user);
    return cred.user;
  }
  return null;
}

async function _afterGoogle(user) {
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) {
    await upsertUserDoc(user.uid, {
      displayName: user.displayName,
      email:       user.email,
      photoURL:    user.photoURL
    });
  }
}

// ── Sign Out ──────────────────────────────────────────────
export async function logOut() {
  await fbSignOut(auth);
}

// ── Password Reset ────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function updateAccountProfile(user, { displayName, photoURL, avatarFile }) {
  // Preserve an existing provider/avatar photo when only the display name changes.
  let nextPhotoURL = photoURL === undefined ? (user.photoURL || '') : photoURL.trim();
  if (avatarFile) {
    const avatarRef = ref(storage, `users/${user.uid}/avatar`);
    await uploadBytes(avatarRef, avatarFile, { contentType: avatarFile.type });
    nextPhotoURL = await getDownloadURL(avatarRef);
  }
  await updateProfile(user, {
    displayName: displayName.trim(),
    photoURL: nextPhotoURL || null
  });
  await upsertUserDoc(user.uid, {
    displayName: displayName.trim(),
    email: user.email,
    photoURL: nextPhotoURL || null
  });
  return { displayName: user.displayName, photoURL: user.photoURL };
}

// ── Friendly error messages ───────────────────────────────
export function friendlyError(code) {
  const map = {
    'auth/user-not-found':            'No account found with this email.',
    'auth/wrong-password':            'Incorrect password. Please try again.',
    'auth/invalid-credential':        'Incorrect email or password.',
    'auth/email-already-in-use':      'An account with this email already exists.',
    'auth/weak-password':             'Password must be at least 6 characters.',
    'auth/invalid-email':             'Please enter a valid email address.',
    'auth/too-many-requests':         'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user':      'Sign-in window was closed. Please try again.',
    'auth/cancelled-popup-request':   'Sign-in cancelled. Please try again.',
    'auth/popup-blocked':             'Popup was blocked by your browser. Trying redirect…',
    'auth/popup-blocked-by-browser':  'Popup was blocked by your browser. Trying redirect…',
    'auth/unauthorized-domain':       'This domain is not authorised in Firebase. Add it under Authentication → Authorized Domains.',
    'auth/network-request-failed':    'Network error. Check your connection.',
    'auth/internal-error':            'An internal error occurred. Please try again.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

export { auth, onAuthStateChanged };
