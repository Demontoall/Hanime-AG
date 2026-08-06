import { auth, onAuthStateChanged } from './auth.js';
import { getContinueWatching } from './playback-progress.js';
import { watchUrl } from './content-catalog.js';

const section = document.getElementById('continueWatchingSection');
const grid = document.getElementById('continueWatchingGrid');
if (section && grid) {
  onAuthStateChanged(auth, async user => {
    try {
      const items = await getContinueWatching(user);
      if (!items.length) return;
      grid.innerHTML = items.slice(0, 10).map(item => {
        const progress = Math.min(100, Math.max(0, Number(item.percent) || 0));
        const title = String(item.title || item.slug).replace(/[<>&"]/g, '');
        const image = item.img && !item.img.includes('picsum.photos') ? item.img : '';
        return `<a class="continue-card" href="${watchUrl(item.slug, item.episodeNumber)}">
          <div class="continue-thumb">${image ? `<img src="${image}" alt="" loading="lazy">` : '<i class="fa-solid fa-film"></i>'}
            <span class="continue-play"><i class="fa-solid fa-play"></i></span>
          </div>
          <div class="continue-info"><h3>${title}</h3><p>Episode ${item.episodeNumber} · ${progress}% watched</p>
            <span class="progress-track"><span style="width:${progress}%"></span></span>
          </div>
        </a>`;
      }).join('');
      section.hidden = false;
    } catch (error) {
      console.warn('[HAG] Continue Watching unavailable:', error);
    }
  });
}