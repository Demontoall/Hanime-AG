// Playback progress is local-first and syncs to Firestore when authenticated.
import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { PROGRESS_STORAGE_KEY, progressKey, normalizeProgress } from './playback-progress-utils.js';

function uidOf(user) { return typeof user === 'string' ? user : user?.uid || null; }
function localRead() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}'); } catch { return {}; }
}
function localWrite(data) {
  try { localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export { progressKey, normalizeProgress };

export async function savePlaybackProgress(user, record) {
  const normalized = normalizeProgress(record);
  const key = progressKey(normalized.contentId, normalized.episodeNumber);
  const local = localRead();
  local[key] = normalized;
  localWrite(local);

  const uid = uidOf(user);
  if (!uid) return normalized;
  try {
    await setDoc(doc(db, 'users', uid, 'progress', key), {
      ...normalized,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('[HAG] Progress sync unavailable:', error);
  }
  return normalized;
}

export async function getPlaybackProgress(user, contentId, episodeNumber) {
  const key = progressKey(contentId, episodeNumber);
  const local = localRead()[key] || null;
  const uid = uidOf(user);
  if (!uid) return local;
  try {
    const snapshot = await getDoc(doc(db, 'users', uid, 'progress', key));
    if (snapshot.exists()) {
      const remote = { ...snapshot.data(), updatedAt: snapshot.data().updatedAt?.toMillis?.() || snapshot.data().updatedAt };
      const merged = normalizeProgress(remote);
      if (!local || new Date(merged.updatedAt || 0) >= new Date(local.updatedAt || 0)) {
        const next = localRead(); next[key] = merged; localWrite(next);
        return merged;
      }
    }
  } catch (error) {
    console.warn('[HAG] Progress read unavailable:', error);
  }
  return local;
}

export async function getContinueWatching(user) {
  const local = Object.values(localRead());
  const uid = uidOf(user);
  let records = local;
  if (uid) {
    try {
      const snapshot = await getDocs(collection(db, 'users', uid, 'progress'));
      records = snapshot.docs.map(item => normalizeProgress({
        ...item.data(),
        updatedAt: item.data().updatedAt?.toMillis?.() || item.data().updatedAt
      }));
      const merged = localRead();
      records.forEach(item => { merged[progressKey(item.contentId, item.episodeNumber)] = item; });
      localWrite(merged);
    } catch (error) {
      console.warn('[HAG] Continue Watching sync unavailable:', error);
    }
  }
  return records
    .filter(item => item.position > 0 && !item.completed)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}