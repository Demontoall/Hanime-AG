/* ============================================================
   Hanime AG — Real Anime Image Loader  v2
   Source  : Jikan API v4 (free, no-key MAL wrapper)
   Cache   : sessionStorage — instant on repeat visits / navigation
   Rate    : ≤2 req/sec  (500 ms stagger, respects global last-fetch
             timestamp stored in sessionStorage so rapid page
             navigations don't restart the counter from zero)
   Retry   : single retry after 2 s on HTTP 429 / 5xx
   ============================================================ */

const MAL = {
  /* ── Anime ── */
  'solo-leveling':          58426,
  'jujutsu-kaisen':        40748,
  'demon-slayer':          38000,
  'attack-on-titan':       16498,
  'one-piece':             21,
  'naruto-shippuden':      1735,
  'bleach-tybw':           41467,
  'vinland-saga':          37521,
  'chainsaw-man':          44511,
  'my-hero-academia':      31964,
  /* ── Movies ── */
  'your-name':             32281,
  'suzume':                50265,
  'a-silent-voice':        35247,
  'spirited-away':         199,
  'princess-mononoke':     164,
  'howls-moving-castle':   431,
  'weathering-with-you':   38826,
  'boy-and-the-heron':     57377,
  /* ── Hanime ── */
  'overflow':              40484,
  'redo-of-healer':        41220,
  /* ── Donghua ── */
  'battle-through-heavens': 33361,
  'soul-land':             36779,
  'perfect-world':         36649,
  'kings-avatar':          33225,
};

const IMG_PFX   = 'hag_img_';          // image URL cache key prefix
const FETCH_KEY = 'hag_last_fetch';    // shared last-fetch ms (cross-page)
const MIN_GAP   = 500;                 // ms between Jikan requests

const wait = ms => new Promise(r => setTimeout(r, ms));

function getCached(malId) {
  try { return sessionStorage.getItem(IMG_PFX + malId) || null; } catch { return null; }
}
function setCached(malId, url) {
  try { sessionStorage.setItem(IMG_PFX + malId, url); } catch {}
}
function getLastFetch() {
  try { return parseInt(sessionStorage.getItem(FETCH_KEY) || '0', 10); } catch { return 0; }
}
function setLastFetch() {
  try { sessionStorage.setItem(FETCH_KEY, String(Date.now())); } catch {}
}

/* Fetch one anime image; retries once on 429/5xx after a 2 s pause */
async function fetchImage(malId, retry = true) {
  const cached = getCached(malId);
  if (cached) return cached;

  try {
    const r = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (r.status === 429 || r.status >= 500) {
      if (retry) { await wait(2000); return fetchImage(malId, false); }
      return null;
    }
    if (!r.ok) return null;

    const { data } = await r.json();
    const url = data?.images?.jpg?.large_image_url
             || data?.images?.jpg?.image_url
             || null;
    if (url) setCached(malId, url);
    return url;
  } catch {
    return null;
  }
}

/* Main — find all img[data-anime], fetch real covers, swap in */
async function run() {
  const imgs = [...document.querySelectorAll('img[data-anime]')];
  if (!imgs.length) return;

  /* Collect unique slugs that are (a) known to MAL and (b) not yet cached */
  const slugsSeen  = new Set();
  const toFetch    = [];   // slugs needing a network call
  const slugToMal  = {};   // slug → malId

  imgs.forEach(img => {
    const slug  = img.dataset.anime;
    const malId = MAL[slug];
    if (!malId) return;
    img.classList.add('img-loading');
    slugToMal[slug] = malId;
    if (!slugsSeen.has(slug)) {
      slugsSeen.add(slug);
      if (!getCached(malId)) toFetch.push(slug);
    }
  });

  /* Fire cached lookups immediately (no network needed) */
  const urlMap = {};
  slugsSeen.forEach(slug => {
    const hit = getCached(slugToMal[slug]);
    if (hit) urlMap[slug] = hit;
  });

  /* Stagger uncached fetches, honouring a shared cross-page rate counter */
  for (let i = 0; i < toFetch.length; i++) {
    const slug  = toFetch[i];
    const malId = slugToMal[slug];

    const elapsed = Date.now() - getLastFetch();
    if (elapsed < MIN_GAP) await wait(MIN_GAP - elapsed);

    setLastFetch();
    urlMap[slug] = await fetchImage(malId);
  }

  /* Apply to DOM — preload each image before swapping src */
  imgs.forEach(img => {
    const url = urlMap[img.dataset.anime];
    if (!url) { img.classList.remove('img-loading'); return; }
    const tmp   = new window.Image();
    tmp.onload  = () => { img.src = url; img.classList.remove('img-loading'); };
    tmp.onerror = () => img.classList.remove('img-loading');
    tmp.src = url;
  });
}

/* Expose so app.js can re-trigger after injecting search-result cards */
window._animeImagesRun = run;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run);
} else {
  run();
}
