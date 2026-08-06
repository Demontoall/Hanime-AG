// Firestore-managed content overrides with a backwards-compatible JSON fallback.
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { contentIdForSlug, getContentBySlug } from './content-catalog.js';

let authReady;
function waitForAuth() {
  if (authReady) return authReady;
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  authReady = new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    });
  });
  return authReady;
}

export async function loadManagedContent(slug) {
  const fallback = await getContentBySlug(slug);
  // Firestore is user/administrator data in this project. Public visitors
  // should render from the checked-in catalogue without producing permission
  // noise while Firebase Auth is still resolving.
  const user = await waitForAuth();
  if (!user) return fallback;
  try {
    const snapshot = await getDoc(doc(db, 'catalog', fallback.contentId));
    return snapshot.exists() ? { ...fallback, ...snapshot.data(), slug: snapshot.data().slug || slug } : fallback;
  } catch (error) {
    console.warn('[HAG] Managed content unavailable; using catalogue fallback:', error);
    return fallback;
  }
}

export async function loadManagedEpisodeManifest(slug, season = 1) {
  const fallbackResponse = await fetch('episodes.json', { cache: 'no-store' });
  if (!fallbackResponse.ok) throw new Error(`Manifest request failed: ${fallbackResponse.status}`);
  const fallbackManifest = await fallbackResponse.json();
  const fallbackAnime = fallbackManifest.anime?.[slug] || null;
  const fallbackEntry = fallbackAnime?.seasons?.[String(season)] || fallbackAnime;
  const content = await loadManagedContent(slug);
  if (!auth.currentUser) return { content, manifest: fallbackEntry };
  try {
    const snapshot = await getDocs(collection(db, 'catalog', content.contentId, 'episodes'));
    const managedEpisodes = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .sort((a, b) => Number(a.episodeNumber) - Number(b.episodeNumber));
    if (managedEpisodes.length || (await getDoc(doc(db, 'catalog', content.contentId))).exists()) {
      return {
        content,
        manifest: {
          title: content.title,
          season: Number(season) || content.season || fallbackEntry?.season || 1,
          episodeCount: content.episodeCount || managedEpisodes.length || fallbackEntry?.episodeCount,
          episodes: managedEpisodes.length ? managedEpisodes : (fallbackEntry?.episodes || [])
        }
      };
    }
  } catch (error) {
    console.warn('[HAG] Managed episodes unavailable; using JSON fallback:', error);
  }
  return { content, manifest: fallbackEntry };
}

export { contentIdForSlug };