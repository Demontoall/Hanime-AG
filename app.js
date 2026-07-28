const menu = document.getElementById("menu");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

menu.onclick = () => {
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
};

overlay.onclick = () => {
  sidebar.classList.remove("active");
  overlay.classList.remove("active");
};

// --- Cover resolver & integrator -------------------------------------------------
// Purpose: Dynamically resolve official cover art for every visible title on the
// static site using Jikan (MyAnimeList) as primary source, with AniList as a
// fallback. Store only provider image URLs in localStorage as a non-destructive
// cache. If a confident match cannot be found, leave the title untouched and
// record it for manual review.

/* Usage notes:
 - This runs client-side and progressively replaces placeholder images (picsum)
   and inserts cover images for title-only cards.
 - It is safe (non-destructive): existing files are not modified on the server.
 - Confidence threshold is conservative to avoid incorrect matches.
*/

document.addEventListener('DOMContentLoaded', () => {
  runCoverIntegration().catch(err => console.error('Cover integration failed', err));
});

// Configuration
const CONFIG = {
  jikanSearchUrl: 'https://api.jikan.moe/v4/anime',
  anilistUrl: 'https://graphql.anilist.co',
  cacheKey: 'hanime_cover_cache_v1',
  confidenceThreshold: 0.68, // conservative threshold for automatic assignment
  maxParallelRequests: 6
};

// Simple utility: normalize titles for comparison
function normalizeTitle(s){
  return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
}

// Simple similarity: ratio of common characters in order (not optimal but lightweight)
function similarity(a,b){
  a = normalizeTitle(a);
  b = normalizeTitle(b);
  if(!a.length || !b.length) return 0;
  let matches = 0, j = 0;
  for(let i=0;i<a.length;i++){
    while(j<b.length && b[j]!==a[i]) j++;
    if(j<b.length && b[j]===a[i]){ matches++; j++; }
  }
  return (2*matches)/(a.length+b.length);
}

// cache helpers
function loadCache(){
  try{ return JSON.parse(localStorage.getItem(CONFIG.cacheKey) || '{}'); }
  catch(e){ return {}; }
}
function saveCache(cache){
  try{ localStorage.setItem(CONFIG.cacheKey, JSON.stringify(cache)); }
  catch(e){ console.warn('Failed to save cover cache', e); }
}

// Public: resolve cover for a title string. Returns {url, source, sourceId, confidence} or null
async function resolveCoverForTitle(title, typeHint){
  const cache = loadCache();
  const key = normalizeTitle(title) + (typeHint?`|${typeHint}`:'');
  if(cache[key]) return cache[key];

  // Primary: Jikan search
  try{
    const jikan = await jikanSearch(title, typeHint);
    if(jikan && jikan.confidence>=CONFIG.confidenceThreshold){
      cache[key] = { url: jikan.url, source: 'jikan', sourceId: jikan.id, confidence: jikan.confidence };
      saveCache(cache);
      return cache[key];
    }
  }catch(e){ console.warn('Jikan search failed for',title,e); }

  // Fallback: AniList GraphQL
  try{
    const ali = await anilistSearch(title, typeHint);
    if(ali && ali.confidence>=CONFIG.confidenceThreshold){
      cache[key] = { url: ali.url, source: 'anilist', sourceId: ali.id, confidence: ali.confidence };
      saveCache(cache);
      return cache[key];
    }
  }catch(e){ console.warn('AniList search failed for',title,e); }

  // No confident match
  cache[key] = null;
  saveCache(cache);
  return null;
}

async function jikanSearch(title, typeHint){
  const q = encodeURIComponent(title);
  const url = `${CONFIG.jikanSearchUrl}?q=${q}&limit=6`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Jikan API error ' + res.status);
  const data = await res.json();
  if(!data || !data.data || !data.data.length) return null;

  // Evaluate candidates
  let best = null;
  for(const item of data.data){
    // item: fields include mal_id, title, title_english, title_japanese, images
    const candidates = [];
    candidates.push(item.title);
    if(item.title_english) candidates.push(item.title_english);
    if(item.title_japanese) candidates.push(item.title_japanese);
    const bestLocal = candidates.map(c=>similarity(title,c)).reduce((a,b)=>Math.max(a,b),0);
    const confidence = bestLocal;
    const imageUrl = (item.images && item.images.jpg && (item.images.jpg.large_image_url || item.images.jpg.image_url)) || null;
    if(!imageUrl) continue;
    if(!best || confidence>best.confidence){
      best = { id: item.mal_id, url: imageUrl, confidence };
    }
  }
  return best;
}

async function anilistSearch(title, typeHint){
  const query = `query ($search: String) {
    Media(search: $search, type: ANIME) { id title { romaji english native } coverImage { large extraLarge medium } siteUrl }
  }`;
  const variables = { search: title };
  const res = await fetch(CONFIG.anilistUrl, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ query, variables })
  });
  if(!res.ok) throw new Error('AniList API error ' + res.status);
  const json = await res.json();
  if(!json || !json.data || !json.data.Media) return null;
  const media = json.data.Media;
  const titles = [media.title.romaji, media.title.english, media.title.native].filter(Boolean);
  const bestLocal = titles.map(c=>similarity(title,c)).reduce((a,b)=>Math.max(a,b),0);
  const imageUrl = media.coverImage.extraLarge || media.coverImage.large || media.coverImage.medium || null;
  if(!imageUrl) return null;
  return { id: media.id, url: imageUrl, confidence: bestLocal };
}

// Update DOM elements: find all cards/categories and apply covers
async function runCoverIntegration(){
  const toProcess = [];
  const seen = new Set();

  // Find .card h3 titles
  document.querySelectorAll('.card').forEach(card=>{
    // title could be in h3 or h1/h2
    const titleEl = card.querySelector('h3, h2, h1');
    if(titleEl){
      const title = titleEl.innerText.trim();
      if(title && !seen.has(title)){
        seen.add(title);
        toProcess.push({title, container:card, titleEl});
      }
    }
  });

  // Find .category h2
  document.querySelectorAll('.category').forEach(cat=>{
    const titleEl = cat.querySelector('h2, h3');
    if(titleEl){
      const title = titleEl.innerText.trim();
      if(title && !seen.has(title)){
        seen.add(title);
        toProcess.push({title, container:cat, titleEl});
      }
    }
  });

  // Page-specific: watch page h1
  const pageTitleEl = document.querySelector('main h1') || document.querySelector('h1');
  if(pageTitleEl){
    const title = pageTitleEl.innerText.trim();
    if(title && !seen.has(title)){
      seen.add(title);
      toProcess.push({title, container:pageTitleEl.parentElement || document.body, titleEl: pageTitleEl});
    }
  }

  // Titles that are plain lists (anime.html has multiple .card elements but simple structure)
  // We'll process toProcess in parallel with throttling
  const results = [];
  let index = 0;

  async function worker(){
    while(true){
      let item;
      // grab next
      if(index < toProcess.length) item = toProcess[index++];
      else break;
      try{
        const res = await resolveCoverForTitle(item.title);
        results.push({item, res});
        if(res){
          applyCoverToContainer(item.container, item.titleEl, res.url);
        } else {
          console.warn('No confident cover for', item.title);
        }
      }catch(e){
        console.error('Error processing', item.title, e);
      }
    }
  }

  const workers = [];
  const parallel = Math.min(CONFIG.maxParallelRequests, Math.max(2, Math.floor(navigator.hardwareConcurrency/2 || 2)));
  for(let i=0;i<parallel;i++) workers.push(worker());
  await Promise.all(workers);

  // After processing: print verification report to console and store report in localStorage for review
  const report = results.filter(r=>!r.res).map(r=>r.item.title);
  if(report.length) console.info('Cover Resolver: titles needing manual review:', report);
  localStorage.setItem('hanime_cover_pending_review', JSON.stringify(report));
}

function applyCoverToContainer(container, titleEl, imageUrl){
  // If there's already an <img> inside container, replace its src
  let img = container.querySelector('img');
  if(!img){
    // create an img element and insert before the titleEl
    img = document.createElement('img');
    // Add styling class consistent with site
    img.style.width = '100%';
    img.style.height = '220px';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    img.style.transition = 'transform .3s';
    // Insert at top of container
    container.insertBefore(img, container.firstChild);
  }
  // Assign the official cover URL
  img.src = imageUrl;
  // Ensure images have alt for accessibility
  try{ img.alt = titleEl.innerText.trim() + ' cover'; }catch(e){}
}
