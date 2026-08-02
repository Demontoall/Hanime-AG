// genres.js — curated genre discovery for the static content catalogue.
(function () {
  'use strict';

  const catalogue = [
    ['solo-leveling', 'Solo Leveling', 'Anime', 'Action', 'https://picsum.photos/seed/sl2024/300/420'],
    ['jujutsu-kaisen', 'Jujutsu Kaisen', 'Anime', 'Supernatural', 'https://picsum.photos/seed/jjk2024/300/420'],
    ['demon-slayer', 'Demon Slayer', 'Anime', 'Action', 'https://picsum.photos/seed/demonslayer/300/420'],
    ['attack-on-titan', 'Attack on Titan', 'Anime', 'Drama', 'https://picsum.photos/seed/aot2024/300/420'],
    ['one-piece', 'One Piece', 'Anime', 'Adventure', 'https://picsum.photos/seed/onepiece/300/420'],
    ['naruto-shippuden', 'Naruto Shippuden', 'Anime', 'Action', 'https://picsum.photos/seed/naruto/300/420'],
    ['vinland-saga', 'Vinland Saga', 'Anime', 'Historical', 'https://picsum.photos/seed/vinland/300/420'],
    ['chainsaw-man', 'Chainsaw Man', 'Anime', 'Horror', 'https://picsum.photos/seed/chainsawman/300/420'],
    ['my-hero-academia', 'My Hero Academia', 'Anime', 'Action', 'https://picsum.photos/seed/mha2024/300/420'],
    ['your-name', 'Your Name', 'Movie', 'Romance', 'https://picsum.photos/seed/yourname2016/300/420'],
    ['suzume', 'Suzume', 'Movie', 'Fantasy', 'https://picsum.photos/seed/suzume2022/300/420'],
    ['a-silent-voice', 'A Silent Voice', 'Movie', 'Drama', 'https://picsum.photos/seed/silentvoice/300/420'],
    ['spirited-away', 'Spirited Away', 'Movie', 'Fantasy', 'https://picsum.photos/seed/spiritedaway/300/420'],
    ['princess-mononoke', 'Princess Mononoke', 'Movie', 'Adventure', 'https://picsum.photos/seed/mononoke/300/420'],
    ['battle-through-heavens', 'Battle Through the Heavens', 'Donghua', 'Cultivation', 'https://picsum.photos/seed/bttoh/300/420'],
    ['soul-land', 'Soul Land', 'Donghua', 'Fantasy', 'https://picsum.photos/seed/soulland/300/420'],
    ['perfect-world', 'Perfect World', 'Donghua', 'Xianxia', 'https://picsum.photos/seed/perfectworld/300/420'],
    ['overflow', 'Overflow', 'Hanime', 'Romance', 'https://picsum.photos/seed/overflow-anime/300/420']
  ];

  const grid = document.getElementById('genreContentGrid');
  const filter = document.getElementById('genreFilter');
  const search = document.getElementById('genreSearch');
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  let selected = params.get('genre') || 'All';
  if (filter && [...filter.options].some(option => option.value === selected)) filter.value = selected;

  function render() {
    const query = (search?.value || '').trim().toLowerCase();
    const items = catalogue.filter(item => {
      const matchesGenre = selected === 'All' || item[3] === selected;
      const matchesSearch = !query || item[1].toLowerCase().includes(query) || item[2].toLowerCase().includes(query);
      return matchesGenre && matchesSearch;
    });

    grid.innerHTML = items.length ? items.map(([slug, title, category, genre, img]) => `
      <a href="watch.html?slug=${slug}" class="movie-card genre-content-card">
        <div class="card-thumb">
          <img data-anime="${slug}" src="${img}" alt="${title}" loading="lazy">
          <div class="card-play-overlay"><i class="fa-solid fa-circle-play"></i></div>
          <span class="card-badge card-badge-ep">${genre}</span>
        </div>
        <h3>${title}</h3>
        <p class="genre-card-meta">${category} · ${genre}</p>
      </a>`).join('') : '<div class="empty-state genre-no-results"><i class="fa-solid fa-magnifying-glass"></i><h3>No titles found</h3><p>Try another genre or search term.</p></div>';

    window._animeImagesRun?.();
  }

  filter?.addEventListener('change', () => {
    selected = filter.value;
    const next = new URL(location.href);
    selected === 'All' ? next.searchParams.delete('genre') : next.searchParams.set('genre', selected);
    history.replaceState({}, '', next);
    render();
  });
  search?.addEventListener('input', render);
  render();
})();