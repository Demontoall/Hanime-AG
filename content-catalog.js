// Shared catalogue and canonical route helpers.
// This is intentionally independent from AniList and episodes.json so local
// originals and future admin-managed records have the same stable contract.
const LOCAL_IDS = {
  'solo-leveling': '151807', 'jujutsu-kaisen': '113415', 'demon-slayer': '101922',
  'attack-on-titan': '16498', 'vinland-saga': '101348', 'bleach-tybw': '116674',
  'chainsaw-man': '127230', 'one-piece': '21', 'naruto-shippuden': '1735',
  'my-hero-academia': '21459', 'overflow': '113417', 'your-name': '21519',
  'suzume': '142770', 'a-silent-voice': '20954', 'spirited-away': '199',
  'princess-mononoke': '164', 'weathering-with-you': '106286',
  'boy-and-the-heron': '109979', 'battle-through-heavens': 'local-battle-through-heavens',
  'soul-land': '101920', 'perfect-world': 'local-perfect-world', 'kings-avatar': '98861',
  'stellar-transformations': '105626', 'tales-of-demons-and-gods': '101916',
  'isekai-harem-monogatari': '118166', 'night-world': 'local-night-world',
  'shadow-hero': 'local-shadow-hero', 'blue-sky': 'local-blue-sky'
};

export function contentIdForSlug(slug) {
  return LOCAL_IDS[slug] || `local-${String(slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function watchUrl(slug, episode = 1) {
  const params = new URLSearchParams({ slug: String(slug), episode: String(Math.max(1, Number(episode) || 1)) });
  return `watch?${params}`;
}

export async function loadContentCatalogue() {
  if (!window.__hagCataloguePromise) {
    window.__hagCataloguePromise = fetch('content-catalog.json', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
        return response.json();
      })
      .then(data => data.contents || []);
  }
  return window.__hagCataloguePromise;
}

export async function getContentBySlug(slug) {
  const entries = await loadContentCatalogue();
  return entries.find(entry => entry.slug === slug) || {
    contentId: contentIdForSlug(slug),
    slug,
    title: String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
    category: 'Anime',
    genres: []
  };
}

if (typeof window !== 'undefined') {
  window._hagContentIdForSlug = contentIdForSlug;
  window._hagWatchUrl = watchUrl;
}