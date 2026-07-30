// favorites-client.js — Firestore favourites & watch history (ES module)
import { db } from './firebase-config.js';
import {
  doc, setDoc, deleteDoc, getDocs,
  collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Favourites ────────────────────────────────────────────
export async function addFavourite(uid, slug, { title, img, url }) {
  await setDoc(doc(db, 'users', uid, 'favourites', slug), {
    slug, title, img, url,
    addedAt: serverTimestamp()
  });
}

export async function removeFavourite(uid, slug) {
  await deleteDoc(doc(db, 'users', uid, 'favourites', slug));
}

export async function getFavouriteSlugs(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'favourites'));
  return new Set(snap.docs.map(d => d.id));
}

export async function getAllFavourites(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'favourites'));
  return snap.docs.map(d => d.data()).sort((a, b) => {
    const ta = a.addedAt?.toMillis?.() ?? 0;
    const tb = b.addedAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

// ── Watch History ─────────────────────────────────────────
export async function addToHistory(uid, slug, { title, img, url }) {
  await setDoc(doc(db, 'users', uid, 'history', slug), {
    slug, title, img, url,
    lastWatched: serverTimestamp()
  }, { merge: true });
}

export async function getAllHistory(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'history'));
  return snap.docs.map(d => d.data()).sort((a, b) => {
    const ta = a.lastWatched?.toMillis?.() ?? 0;
    const tb = b.lastWatched?.toMillis?.() ?? 0;
    return tb - ta;
  });
}
