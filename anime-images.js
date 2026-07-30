/* ============================================================
   Hanime AG — AniList Image & Metadata Loader  v4
   ============================================================
   DATA SOURCE : AniList GraphQL API (https://graphql.anilist.co)
                 No API key required. Replaces Jikan v3.
   FAST PATH   : Known AniList IDs resolved with a single query
   DYNAMIC     : Unknown slugs searched by title via AniList search
   CACHE       : sessionStorage — instant on repeat page visits
   RATE LIMIT  : AniList allows 90 req/min; 700ms gate + shared
                 cross-page timestamp keeps us well under the limit
   RETRY       : Single auto-retry after 2.5s on 429 / 5xx
   METADATA    : window._anilistData[slug] holds full metadata
                 (title, description, genres, score, banner, etc.)
   BANNER      : Applied to [data-anime-banner="slug"] elements;
                 falls back to cover image when no banner exists
   ============================================================ */

/* ── AniList endpoint ───────────────────────────────────────── */
const AL_URL = 'https://graphql.anilist.co';

/* ── Known AniList IDs (fast path — no search call needed) ──── */
const AL = {
  /* Anime */
  'solo-leveling':          151807,
  'jujutsu-kaisen':         113415,
  'demon-slayer':           101922,
  'attack-on-titan':        16498,
  'one-piece':              21,
  'naruto-shippuden':       1735,
  'bleach-tybw':            116674,
  'vinland-saga':           101348,
  'chainsaw-man':           127230,
  'my-hero-academia':       21459,
  /* Movies */
  'your-name':              21519,
  'suzume':                 142770,
  'a-silent-voice':         20954,
  'spirited-away':          199,
  'princess-mononoke':      164,
  'howls-moving-castle':    431,
  'weathering-with-you':    106286,
  'boy-and-the-heron':      109979,
  /* Hanime */
  'overflow':               113417,
  'redo-of-healer':         113425,
  /* Donghua */
  'soul-land':              101920,
  'kings-avatar':           98861,
  'stellar-transformations': 105626,
  'tales-of-demons-and-gods': 101916,
  'isekai-harem-monogatari': 118166,
  /* battle-through-heavens / perfect-world: not on AniList →
     falls through to dynamic title search (picsum fallback on miss) */
};

/* ── Cache key prefixes (hag2_ prefix avoids stale Jikan keys) ─ */
const PFX      = 'hag2_';
const IMG_PFX  = PFX + 'img_';   // IMG_PFX + alId  → cover URL
const BAN_PFX  = PFX + 'ban_';   // BAN_PFX + alId  → banner URL
const MID_PFX  = PFX + 'mid_';   // MID_PFX + slug  → alId (searched)
const META_PFX = PFX + 'met_';   // META_PFX + alId → JSON metadata
const LAST_KEY = PFX + 'last';   // last API call timestamp (ms)

const MIN_GAP  = 700;    // ms between any AniList request
const RETRY_MS = 2500;   // ms to wait before retry on 429/5xx

/* ── Metadata store (slug → object) exposed globally ───────── */
window._anilistData = window._anilistData || {};

const wait = ms => new Promise(r => setTimeout(r, ms));

const ss = {
  get: k      => { try { return sessionStorage.getItem(k) || null; } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, String(v));     } catch {} },
};

/* ── Slug → human-readable title override map ───────────────── */
const TITLE_OVERRIDES = {
  'bleach-tybw':               'Bleach Thousand Year Blood War',
  'a-silent-voice':            'Koe no Katachi',
  'boy-and-the-heron':         'Kimitachi wa Dou Ikiru ka',
  'howls-moving-castle':       "Howl's Moving Castle",
  'my-hero-academia':          'Boku no Hero Academia',
  'redo-of-healer':            'Redo of Healer',
  'your-name':                 'Your Name',
  'spirited-away':             'Spirited Away',
  'princess-mononoke':         'Princess Mononoke',
  'stellar-transformations':   'Stellar Transformations',
  'tales-of-demons-and-gods':  'Tales of Demons and Gods',
  'isekai-harem-monogatari':   'Isekai Harem Monogatari',
  'battle-through-heavens':    'Battle Through the Heavens',
  'soul-land':                 'Douluo Dalu',
  'kings-avatar':              "The King's Avatar",
  'perfect-world':             'Perfect World',
};

function slugToTitle(slug) {
  return TITLE_OVERRIDES[slug]
    || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/* ── Rate gate ───────────────────────────────────────────────── */
async function rateGate() {
  const sinceMs = Date.now() - (+ss.get(LAST_KEY) || 0);
  if (sinceMs < MIN_GAP) await wait(MIN_GAP - sinceMs);
  ss.set(LAST_KEY, Date.now());
}

/* ── Core AniList GraphQL fetch ─────────────────────────────── */
const MEDIA_FIELDS = `
  id
  title { english romaji native }
  coverImage { extraLarge large }
  bannerImage
  description(asHtml: false)
  genres
  averageScore
  episodes
  status
  season
  seasonYear
  studios(isMain: true) { nodes { name isAnimationStudio } }
`;

async function alFetch(body, retry = true) {
  try {
    await rateGate();
    const r = await fetch(AL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (r.status === 429 || r.status >= 500) {
      if (retry) { await wait(RETRY_MS); return alFetch(body, false); }
      return null;
    }
    if (!r.ok) return null;
    const json = await r.json();
    if (json.errors) return null;
    return json.data?.Media || null;
  } catch { return null; }
}

/* ── Fetch by AniList ID ─────────────────────────────────────── */
async function fetchById(alId) {
  /* Check image cache first */
  const cachedImg = ss.get(IMG_PFX + alId);
  if (cachedImg) return buildFromCache(alId, cachedImg);

  const data = await alFetch({
    query: `query($id:Int){Media(id:$id,type:ANIME){${MEDIA_FIELDS}}}`,
    variables: { id: alId },
  });
  if (!data) return null;
  return storeAndReturn(data);
}

/* ── Search AniList by title → returns alId or null ─────────── */
async function searchAlId(title) {
  const data = await alFetch({
    query: `query($s:String){Media(search:$s,type:ANIME,sort:SEARCH_MATCH){${MEDIA_FIELDS}}}`,
    variables: { s: title },
  });
  if (!data) return null;
  storeAndReturn(data);
  return data.id;
}

/* ── Persist media data to sessionStorage & metadata store ───── */
function storeAndReturn(data) {
  const alId  = data.id;
  const cover = data.coverImage?.extraLarge || data.coverImage?.large || null;
  /* Banner falls back to cover when absent */
  const banner = data.bannerImage || cover;

  if (cover)  ss.set(IMG_PFX + alId, cover);
  if (banner) ss.set(BAN_PFX + alId, banner);

  /* Build metadata object */
  const studio = (data.studios?.nodes || [])
    .find(n => n.isAnimationStudio)?.name
    || data.studios?.nodes?.[0]?.name
    || null;

  const meta = {
    id:          alId,
    titleEn:     data.title?.english  || null,
    titleRomaji: data.title?.romaji   || null,
    titleNative: data.title?.native   || null,
    cover,
    banner,
    description: data.description     || null,
    genres:      data.genres          || [],
    score:       data.averageScore    || null,
    episodes:    data.episodes        || null,
    status:      data.status          || null,
    season:      data.season          || null,
    year:        data.seasonYear      || null,
    studio,
  };

  /* Cache serialised metadata */
  try { ss.set(META_PFX + alId, JSON.stringify(meta)); } catch {}

  return meta;
}

/* ── Rebuild metadata from cache (image only path) ───────────── */
function buildFromCache(alId, cachedImg) {
  try {
    const raw = ss.get(META_PFX + alId);
    if (raw) return JSON.parse(raw);
  } catch {}
  /* Partial cache hit — at least return cover */
  return {
    id: alId, cover: cachedImg,
    banner: ss.get(BAN_PFX + alId) || cachedImg,
    titleEn: null, titleRomaji: null, titleNative: null,
    description: null, genres: [], score: null,
    episodes: null, status: null, season: null, year: null, studio: null,
  };
}

/* ── Resolve slug → full metadata object ────────────────────── */
async function resolveSlug(slug) {
  /* 1. Fast path — known AniList ID */
  let alId = AL[slug] || null;

  /* 2. Previously searched + cached */
  if (!alId) {
    const hit = ss.get(MID_PFX + slug);
    if (hit) alId = +hit;
  }

  /* 3. Serve from full metadata cache (covers repeated calls) */
  if (alId) {
    const cachedImg = ss.get(IMG_PFX + alId);
    if (cachedImg) return buildFromCache(alId, cachedImg);
  }

  /* 4. Fetch by known ID */
  if (alId) {
    const meta = await fetchById(alId);
    return meta;
  }

  /* 5. Dynamic title search */
  const title = slugToTitle(slug);
  const foundId = await searchAlId(title);
  if (foundId) {
    ss.set(MID_PFX + slug, foundId);
    const cachedImg = ss.get(IMG_PFX + foundId);
    if (cachedImg) return buildFromCache(foundId, cachedImg);
  }
  return null;
}

/* ── Apply resolved metadata to DOM ─────────────────────────── */
function applyMeta(slug, meta) {
  if (!meta) return;

  /* Cover images */
  document.querySelectorAll(`img[data-anime="${slug}"]`).forEach(img => {
    if (!meta.cover) { img.classList.remove('img-loading'); return; }
    const tmp    = new window.Image();
    tmp.onload   = () => { img.src = meta.cover; img.classList.remove('img-loading'); };
    tmp.onerror  = () => img.classList.remove('img-loading');
    tmp.src      = meta.cover;
  });

  /* Banner images (data-anime-banner="slug") */
  document.querySelectorAll(`[data-anime-banner="${slug}"]`).forEach(el => {
    const url = meta.banner || meta.cover;
    if (!url) return;
    if (el.tagName === 'IMG') {
      el.src = url;
    } else {
      el.style.backgroundImage = `url('${url}')`;
    }
  });

  /* Expose metadata globally */
  window._anilistData[slug] = meta;
}

/* ── Main entry point ────────────────────────────────────────── */
async function run() {
  /* Collect all unique slugs from both cover and banner targets */
  const slugSet = new Set();
  document.querySelectorAll('img[data-anime], [data-anime-banner]').forEach(el => {
    const slug = el.dataset.anime || el.dataset.animeBanner;
    if (slug) {
      slugSet.add(slug);
      if (el.tagName === 'IMG') el.classList.add('img-loading');
    }
  });
  if (!slugSet.size) return;

  for (const slug of slugSet) {
    /* Quick full-cache check — skip async resolveSlug entirely */
    const alId = AL[slug] || (+ss.get(MID_PFX + slug) || null);
    if (alId) {
      const cachedImg = ss.get(IMG_PFX + alId);
      if (cachedImg) {
        applyMeta(slug, buildFromCache(alId, cachedImg));
        continue;
      }
    }
    const meta = await resolveSlug(slug);
    applyMeta(slug, meta);
  }
}

/* ── Public API ─────────────────────────────────────────────── */
/* Re-trigger after injecting dynamic cards (search overlay etc.) */
window._animeImagesRun = run;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run);
} else {
  run();
}
