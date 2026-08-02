// favorites-client.js — Firestore favourites & watch history (ES module)
import { db } from './firebase-config.js';
import {
  doc, setDoc, deleteDoc, getDocs,
  collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Favourites ────────────────────────────────────────────
function detailsUrl(slug) {
  return `watch.html?slug=${encodeURIComponent(slug)}`;
}

function titleFromMetadata(slug, metadata, fallbackTitle) {
  return metadata?.titleEn
    || metadata?.titleRomaji
    || metadata?.titleNative
    || fallbackTitle
    || slug.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function usableCover(url) {
  return typeof url === 'string' && url.trim() && !url.includes('picsum.photos');
}

function animeDocument(slug, metadata, fallback = {}) {
  const title = titleFromMetadata(slug, metadata, fallback.title);
  const cover = usableCover(metadata?.cover) ? metadata.cover : null;
  const animeId = metadata?.id ?? fallback.animeId ?? slug;

  return {
    id: animeId,
    slug,
    title,
    titleEn: metadata?.titleEn ?? fallback.titleEn ?? null,
    titleRomaji: metadata?.titleRomaji ?? fallback.titleRomaji ?? null,
    titleNative: metadata?.titleNative ?? fallback.titleNative ?? null,
    cover: cover || (usableCover(fallback.cover) ? fallback.cover : null),
    description: metadata?.description ?? fallback.description ?? null,
    episodes: metadata?.episodes ?? fallback.episodes ?? null,
    status: metadata?.status ?? fallback.status ?? null,
    genres: metadata?.genres ?? fallback.genres ?? [],
    score: metadata?.score ?? fallback.score ?? null,
    season: metadata?.season ?? fallback.season ?? null,
    year: metadata?.year ?? fallback.year ?? null,
    studio: metadata?.studio ?? fallback.studio ?? null
  };
}

function storedFavourite(slug, metadata, fallback = {}) {
  const anime = animeDocument(slug, metadata, fallback);
  return {
    animeId: anime.id,
    slug,
    title: anime.title,
    img: anime.cover,
    cover: anime.cover,
    url: detailsUrl(slug),
    description: anime.description,
    episodes: anime.episodes,
    status: anime.status,
    genres: anime.genres,
    anime
  };
}

export async function buildFavouriteRecord(slug, fallback = {}) {
  const metadata = window._anilistData?.[slug]
    || await loadMetadata(slug)
    || null;
  return storedFavourite(slug, metadata, fallback);
}

async function loadMetadata(slug) {
  if (window._animeImagesLoad) return window._animeImagesLoad(slug);

  // Pages without an image grid can still save a complete known title.
  // The catalogue loader remains the single source of AniList IDs and fields.
  const script = document.createElement('script');
  script.src = 'anime-images.js';
  await new Promise((resolve, reject) => {
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.head.appendChild(script);
  });
  return window._animeImagesLoad?.(slug) || null;
}

export async function addFavourite(uid, slug, fallback = {}) {
  const record = await buildFavouriteRecord(slug, fallback);
  await setDoc(doc(db, 'users', uid, 'favourites', slug), {
    ...record,
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
  return snap.docs.map(d => ({ id: d.id, ...d.data(), slug: d.data().slug || d.id })).sort((a, b) => {
    const ta = a.addedAt?.toMillis?.() ?? 0;
    const tb = b.addedAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

/* Legacy favourites only stored a title, slug, and often a placeholder
   image. Resolve them once, save the complete anime document, and return
   the migrated record for the current render. */
export async function hydrateFavourite(uid, item) {
  const slug = item.slug || item.id;
  const existingAnime = item.anime;
  const metadata = existingAnime?.id
    && usableCover(existingAnime.cover)
    && Object.prototype.hasOwnProperty.call(existingAnime, 'description')
    ? null
    : (window._anilistData?.[slug] || await loadMetadata(slug) || null);
  const record = storedFavourite(slug, metadata, {
    ...item,
    ...(existingAnime || {})
  });
  const needsMigration = !existingAnime
    || item.animeId !== record.animeId
    || item.cover !== record.cover
    || item.url !== record.url
    || item.description !== record.description
    || item.episodes !== record.episodes
    || item.status !== record.status;

  if (needsMigration) {
    await setDoc(doc(db, 'users', uid, 'favourites', slug), record, { merge: true });
  }
  return { ...item, ...record, anime: record.anime };
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
