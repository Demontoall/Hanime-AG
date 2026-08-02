/* ============================================================
   Hanime AG — AniList Image & Metadata Loader  v5
   ============================================================
   DATA SOURCE : AniList GraphQL API (https://graphql.anilist.co)
                 No API key required.

   STRATEGY
   ────────
   1. On page load, collect every unique slug from img[data-anime]
      and [data-anime-banner] elements.
   2. Slugs that map to a known AniList ID (the AL map below) are
      fetched in ONE batched Page query (id_in:[…]).  A single
      network call delivers all covers simultaneously instead of
      one call per image.
   3. Slugs NOT in the AL map (rare dynamic entries) are resolved
      via individual title-search queries, processed in sequence.
   4. All results are cached in sessionStorage so repeat visits /
      cross-page navigation are instant (zero API calls).
   5. Images are applied directly via img.src — no new Image()
      preload wrapper that can lose its reference before onload.

   CACHE KEY PREFIX : hag2_   (changed from hag_ to drop Jikan data)
   RATE LIMIT       : AniList allows 90 req/min; the batch approach
                      typically uses ≤2 requests per page.
   METADATA         : window._anilistData[slug] holds the full
                      object (title, description, genres, score,
                      episodes, status, season, year, studio,
                      cover, banner).
   BANNER           : [data-anime-banner="slug"] elements receive
                      the wide banner (falls back to cover).
   ============================================================ */

/* ── AniList endpoint ───────────────────────────────────────── */
const AL_URL = 'https://graphql.anilist.co';

/* ── Known AniList IDs — fast-path, included in batch query ─── */
const AL = {
  /* Anime */
  'solo-leveling':           151807,
  'jujutsu-kaisen':          113415,
  'demon-slayer':            101922,
  'attack-on-titan':         16498,
  'one-piece':               21,
  'naruto-shippuden':        1735,
  'bleach-tybw':             116674,
  'vinland-saga':            101348,
  'chainsaw-man':            127230,
  'my-hero-academia':        21459,
  /* Movies */
  'your-name':               21519,
  'suzume':                  142770,
  'a-silent-voice':          20954,
  'spirited-away':           199,
  'princess-mononoke':       164,
  'howls-moving-castle':     431,
  'weathering-with-you':     106286,
  'boy-and-the-heron':       109979,
  /* Hanime */
  'overflow':                113417,
  'redo-of-healer':          113425,
  /* Donghua */
  'soul-land':               101920,
  'kings-avatar':            98861,
  'stellar-transformations': 105626,
  'tales-of-demons-and-gods':101916,
  'isekai-harem-monogatari': 118166,
  /* battle-through-heavens / perfect-world : not on AniList —
     will fall through to title-search (picsum on miss)          */
};

/* ── sessionStorage helpers ─────────────────────────────────── */
const PFX      = 'hag2_';
const IMG_PFX  = PFX + 'img_';   // + alId  → cover URL
const BAN_PFX  = PFX + 'ban_';   // + alId  → banner URL
const MID_PFX  = PFX + 'mid_';   // + slug  → alId (searched slugs)
const META_PFX = PFX + 'met_';   // + alId  → JSON metadata blob

const ss = {
  get: k      => { try { return sessionStorage.getItem(k) || null; } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, String(v));     } catch {} },
};

/* ── Metadata store exposed globally ─────────────────────────── */
window._anilistData = window._anilistData || {};

const wait = ms => new Promise(r => setTimeout(r, ms));

/* ── GraphQL fields requested for every media entry ────────── */
const FIELDS = `
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

/* ── Slug → search title overrides ─────────────────────────── */
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

/* ── Low-level GraphQL POST ─────────────────────────────────── */
async function gqlFetch(query, variables, retry = true) {
  try {
    const r = await fetch(AL_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify({ query, variables }),
      signal:  AbortSignal.timeout(12000),
    });
    if (r.status === 429 || r.status >= 500) {
      if (retry) { await wait(2500); return gqlFetch(query, variables, false); }
      return null;
    }
    if (!r.ok) return null;
    const json = await r.json();
    /* Return data even when there are partial errors */
    return json.data || null;
  } catch { return null; }
}

/* ── Persist one media object → sessionStorage + metadata map ─ */
function ingest(mediaObj) {
  if (!mediaObj?.id) return null;
  const alId  = mediaObj.id;
  const cover = mediaObj.coverImage?.extraLarge
             || mediaObj.coverImage?.large
             || null;
  const banner = mediaObj.bannerImage || cover;

  if (cover)  ss.set(IMG_PFX + alId, cover);
  if (banner) ss.set(BAN_PFX + alId, banner);

  const studio = (mediaObj.studios?.nodes || [])
    .find(n => n.isAnimationStudio)?.name
    || mediaObj.studios?.nodes?.[0]?.name
    || null;

  const meta = {
    id: alId,
    titleEn:     mediaObj.title?.english  || null,
    titleRomaji: mediaObj.title?.romaji   || null,
    titleNative: mediaObj.title?.native   || null,
    cover,
    banner,
    description: mediaObj.description    || null,
    genres:      mediaObj.genres         || [],
    score:       mediaObj.averageScore   || null,
    episodes:    mediaObj.episodes       || null,
    status:      mediaObj.status         || null,
    season:      mediaObj.season         || null,
    year:        mediaObj.seasonYear     || null,
    studio,
  };

  try { ss.set(META_PFX + alId, JSON.stringify(meta)); } catch {}
  return meta;
}

/* ── Rebuild metadata from sessionStorage cache ─────────────── */
function fromCache(alId) {
  try {
    const raw = ss.get(META_PFX + alId);
    if (raw) return JSON.parse(raw);
  } catch {}
  const cover  = ss.get(IMG_PFX + alId) || null;
  const banner = ss.get(BAN_PFX + alId) || cover;
  return cover ? { id: alId, cover, banner, titleEn: null, titleRomaji: null,
    titleNative: null, description: null, genres: [], score: null,
    episodes: null, status: null, season: null, year: null, studio: null } : null;
}

/* ── BATCH fetch: all known IDs in one Page query ─────────────
   AniList Page query with id_in returns up to 50 entries.
   We split into chunks of 50 just in case future AL map grows. */
async function batchFetchIds(ids) {
  const results = new Map(); // alId → meta
  const CHUNK   = 50;

  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const data  = await gqlFetch(
      `query($ids:[Int]){Page(perPage:${CHUNK}){media(id_in:$ids,type:ANIME){${FIELDS}}}}`,
      { ids: chunk }
    );
    const mediaList = data?.Page?.media || [];
    mediaList.forEach(m => {
      const meta = ingest(m);
      if (meta) results.set(m.id, meta);
    });
    if (i + CHUNK < ids.length) await wait(700); // only delay if more chunks remain
  }
  return results;
}

/* ── Single title-search → ingest → return meta or null ─────── */
async function searchOne(slug) {
  const title = slugToTitle(slug);
  const data  = await gqlFetch(
    `query($s:String){Media(search:$s,type:ANIME,sort:SEARCH_MATCH){${FIELDS}}}`,
    { s: title }
  );
  const m = data?.Media;
  if (!m) return null;
  const meta = ingest(m);
  if (meta) ss.set(MID_PFX + slug, m.id);
  return meta;
}

/* ── Public metadata loaders ────────────────────────────────────
   Favourites and other user-scoped features can request complete
   metadata without manufacturing a placeholder card first. */
async function loadSlugs(slugs) {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
  const result = new Map();
  const idsToFetch = [];
  const idToSlugs = new Map();
  const unknownSlugs = [];

  for (const slug of uniqueSlugs) {
    const alId = AL[slug] || (+ss.get(MID_PFX + slug) || null);
    if (!alId) {
      unknownSlugs.push(slug);
      continue;
    }

    const cached = fromCache(alId);
    if (cached) {
      result.set(slug, cached);
    } else {
      idsToFetch.push(alId);
      if (!idToSlugs.has(alId)) idToSlugs.set(alId, []);
      idToSlugs.get(alId).push(slug);
    }
  }

  if (idsToFetch.length) {
    const fetched = await batchFetchIds([...new Set(idsToFetch)]);
    for (const [alId, meta] of fetched) {
      for (const slug of idToSlugs.get(alId) || []) result.set(slug, meta);
    }
  }

  for (const slug of unknownSlugs) {
    const cachedId = +ss.get(MID_PFX + slug) || null;
    const cached = cachedId ? fromCache(cachedId) : null;
    const meta = cached || await searchOne(slug);
    if (meta) result.set(slug, meta);
    if (!cached && unknownSlugs.length > 1) await wait(700);
  }

  return result;
}

async function loadSlug(slug) {
  return (await loadSlugs([slug])).get(slug) || null;
}

/* ── Apply metadata to DOM elements for one slug ─────────────── */
function applyMeta(slug, meta) {
  if (!meta) return;
  window._anilistData[slug] = meta;

  /* Cover images — set src directly; picsum placeholder visible until load */
  if (meta.cover) {
    document.querySelectorAll(`img[data-anime="${CSS.escape(slug)}"]`).forEach(img => {
      img.src = meta.cover;
      img.classList.remove('img-loading');
    });
  } else {
    document.querySelectorAll(`img[data-anime="${CSS.escape(slug)}"]`).forEach(img => {
      img.classList.remove('img-loading');
    });
  }

  /* Banner images */
  const bannerUrl = meta.banner || meta.cover;
  if (bannerUrl) {
    document.querySelectorAll(`[data-anime-banner="${CSS.escape(slug)}"]`).forEach(el => {
      if (el.tagName === 'IMG') { el.src = bannerUrl; }
      else { el.style.backgroundImage = `url('${bannerUrl}')`; }
    });
  }
}

/* ── Main entry point ────────────────────────────────────────── */
async function run() {
  /* 1. Collect unique slugs from the page */
  const slugSet = new Set();
  document.querySelectorAll('img[data-anime], [data-anime-banner]').forEach(el => {
    const slug = el.dataset.anime || el.dataset.animeBanner;
    if (slug) {
      slugSet.add(slug);
      if (el.tagName === 'IMG') el.classList.add('img-loading');
    }
  });
  if (!slugSet.size) return;

  /* 2. Partition: cached | known-id (batch) | unknown (search) */
  const toFetch   = [];   // alIds to fetch in batch
  const toSearch  = [];   // slugs needing title-search
  const slugToId  = {};   // slug → alId (for mapping results back)

  for (const slug of slugSet) {
    const alId = AL[slug] || (+ss.get(MID_PFX + slug) || null);

    if (alId) {
      const cached = fromCache(alId);
      if (cached) {
        applyMeta(slug, cached);          // instant — no network needed
      } else {
        toFetch.push(alId);
        slugToId[alId] = slugToId[alId] || [];
        slugToId[alId].push(slug);
      }
    } else {
      toSearch.push(slug);
    }
  }

  /* 3. Batch-fetch all known IDs in one (or two) requests */
  if (toFetch.length) {
    const idSet    = [...new Set(toFetch)];   // dedupe
    const fetched  = await batchFetchIds(idSet);

    /* Map results back to slugs */
    for (const [alId, meta] of fetched) {
      const slugs = slugToId[alId] || [];
      /* Also handle slugs that share the same alId */
      for (const slug of slugSet) {
        if ((AL[slug] || +ss.get(MID_PFX + slug)) === alId) {
          applyMeta(slug, meta);
        }
      }
    }

    /* Slugs whose ID was in toFetch but got no result → clear shimmer */
    for (const alId of idSet) {
      if (!fetched.has(alId)) {
        (slugToId[alId] || []).forEach(slug => {
          document.querySelectorAll(`img[data-anime="${CSS.escape(slug)}"]`)
            .forEach(img => img.classList.remove('img-loading'));
        });
      }
    }
  }

  /* 4. Search for unknown slugs one at a time (rare) */
  for (const slug of toSearch) {
    const cached = ss.get(MID_PFX + slug)
      ? fromCache(+ss.get(MID_PFX + slug)) : null;

    if (cached) {
      applyMeta(slug, cached);
    } else {
      const meta = await searchOne(slug);
      applyMeta(slug, meta);             // applyMeta handles null gracefully
      if (!meta) {
        /* Clear shimmer for this slug so picsum fallback shows cleanly */
        document.querySelectorAll(`img[data-anime="${CSS.escape(slug)}"]`)
          .forEach(img => img.classList.remove('img-loading'));
      }
      await wait(700);                   // rate-gate between individual searches
    }
  }
}

/* ── Public API ─────────────────────────────────────────────── */
window._animeImagesRun = run;
window._animeImagesLoad = loadSlug;
window._animeImagesLoadMany = loadSlugs;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run);
} else {
  run();
}
