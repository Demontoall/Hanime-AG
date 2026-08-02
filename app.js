/* ============================================================
   Hanime AG — Application Script
   ============================================================ */
(function () {
  'use strict';

  /* ── 1. Sidebar ──────────────────────────────────────────── */
  const menu    = document.getElementById('menu');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  function openSidebar() {
    sidebar && sidebar.classList.add('active');
    overlay && overlay.classList.add('active');
    menu && menu.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar && sidebar.classList.remove('active');
    overlay && overlay.classList.remove('active');
    menu && menu.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (menu) menu.addEventListener('click', () =>
    sidebar && sidebar.classList.contains('active') ? closeSidebar() : openSidebar()
  );
  if (overlay) overlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => e.key === 'Escape' && closeSidebar());

  /* ── 2. Active nav link ──────────────────────────────────── */
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && (href === page || (page === '' && href === 'index.html')))
      a.classList.add('active');
  });

  /* ── 3. Header scroll transparency (home only) ───────────── */
  const homeHeader = document.querySelector('header.home-header');
  if (homeHeader) {
    const onScroll = () => {
      homeHeader.classList.toggle('scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── 4. Scroll-reveal ────────────────────────────────────── */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const ro = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); ro.unobserve(e.target); } });
    }, { threshold: 0.12 });
    revealEls.forEach(el => ro.observe(el));
  }

  /* ── 5. Search overlay ───────────────────────────────────── */
  // All searchable content — titles come from data-title attributes on cards/rows
  // animeSlug must match a key in the AL map inside anime-images.js (AniList IDs)
  // img is the seed-based picsum fallback shown while AniList cover loads
  const ALL_TITLES = [
    { title:'Solo Leveling',              meta:'Anime · Action',          url:'watch.html',      animeSlug:'solo-leveling',         img:'https://picsum.photos/seed/sl2024/300/420' },
    { title:'Jujutsu Kaisen',             meta:'Anime · Supernatural',    url:'watch.html',      animeSlug:'jujutsu-kaisen',        img:'https://picsum.photos/seed/jjk2024/300/420' },
    { title:'Demon Slayer',               meta:'Anime · Action',          url:'watch.html',      animeSlug:'demon-slayer',          img:'https://picsum.photos/seed/demonslayer/300/420' },
    { title:'Attack on Titan',            meta:'Anime · Drama',           url:'watch.html',      animeSlug:'attack-on-titan',       img:'https://picsum.photos/seed/aot2024/300/420' },
    { title:'One Piece',                  meta:'Anime · Adventure',       url:'watch.html',      animeSlug:'one-piece',             img:'https://picsum.photos/seed/onepiece/300/420' },
    { title:'Naruto Shippuden',           meta:'Anime · Action',          url:'watch.html',      animeSlug:'naruto-shippuden',      img:'https://picsum.photos/seed/naruto/300/420' },
    { title:'Bleach: TYBW',               meta:'Anime · Action',          url:'watch.html',      animeSlug:'bleach-tybw',           img:'https://picsum.photos/seed/bleachtybw/300/420' },
    { title:'Vinland Saga',               meta:'Anime · Historical',      url:'watch.html',      animeSlug:'vinland-saga',          img:'https://picsum.photos/seed/vinland/300/420' },
    { title:'Chainsaw Man',               meta:'Anime · Action',          url:'watch.html',      animeSlug:'chainsaw-man',          img:'https://picsum.photos/seed/chainsawman/300/420' },
    { title:'My Hero Academia',           meta:'Anime · Action',          url:'watch.html',      animeSlug:'my-hero-academia',      img:'https://picsum.photos/seed/mha2024/300/420' },
    { title:'Battle Through the Heavens', meta:'Donghua · Cultivation',   url:'watch.html',      animeSlug:'battle-through-heavens',img:'https://picsum.photos/seed/bttoh/300/420' },
    { title:'Soul Land',                  meta:'Donghua · Fantasy',       url:'watch.html',      animeSlug:'soul-land',             img:'https://picsum.photos/seed/soulland/300/420' },
    { title:'Perfect World',              meta:'Donghua · Xianxia',       url:'watch.html',      animeSlug:'perfect-world',         img:'https://picsum.photos/seed/perfectworld/300/420' },
    { title:"The King's Avatar",          meta:'Donghua · Modern',        url:'watch.html',      animeSlug:'kings-avatar',          img:'https://picsum.photos/seed/kingsavatar/300/420' },
    { title:'Your Name',                  meta:'Movie · Romance',         url:'watch.html',      animeSlug:'your-name',             img:'https://picsum.photos/seed/yourname2016/300/420' },
    { title:'Suzume',                     meta:'Movie · Adventure',       url:'watch.html',      animeSlug:'suzume',                img:'https://picsum.photos/seed/suzume2022/300/420' },
    { title:'A Silent Voice',             meta:'Movie · Drama',           url:'watch.html',      animeSlug:'a-silent-voice',        img:'https://picsum.photos/seed/silentvoice/300/420' },
    { title:'Spirited Away',              meta:'Movie · Fantasy',         url:'watch.html',      animeSlug:'spirited-away',         img:'https://picsum.photos/seed/spiritedaway/300/420' },
    { title:'Princess Mononoke',          meta:'Movie · Fantasy',         url:'watch.html',      animeSlug:'princess-mononoke',     img:'https://picsum.photos/seed/mononoke/300/420' },
    { title:'Weathering With You',        meta:'Movie · Romance',         url:'watch.html',      animeSlug:'weathering-with-you',   img:'https://picsum.photos/seed/weathering/300/420' },
    { title:'Overflow',                   meta:'Hanime · Romance',        url:'watch.html',      animeSlug:'overflow',              img:'https://picsum.photos/seed/overflow-anime/300/420' },
    { title:'Stellar Transformations',     meta:'Donghua · Xianxia',       url:'watch.html',      animeSlug:'stellar-transformations',     img:'https://picsum.photos/seed/stellar-xingchen/300/420' },
    { title:'Tales of Demons and Gods',   meta:'Donghua · Cultivation',   url:'watch.html',      animeSlug:'tales-of-demons-and-gods',     img:'https://picsum.photos/seed/tales-demons-gods/300/420' },
    { title:'Isekai Harem Monogatari',    meta:'Hanime · Fantasy',        url:'watch.html',      animeSlug:'isekai-harem-monogatari',       img:'https://picsum.photos/seed/isekai-harem-mono/300/420' },
    // Fictional originals — no animeSlug (picsum seed fallback only, never wrong cover)
    { title:'Night World',                meta:'Anime · Dark Fantasy',    url:'nightworld.html',                                    img:'https://picsum.photos/seed/nightworld-dark/300/420' },
    { title:'Shadow Hero',                meta:'Anime · Action',          url:'shadowhero.html',                                    img:'https://picsum.photos/seed/shadowhero-action/300/420' },
    { title:'Blue Sky',                   meta:'Donghua · Xianxia',       url:'bluesky.html',                                       img:'https://picsum.photos/seed/bluesky-xianxia/300/420' },
  ];

  const searchOverlay = document.getElementById('searchOverlay');
  const searchInput   = document.getElementById('searchInput');
  const searchGrid    = document.getElementById('searchGrid');
  const searchOpenBtns = document.querySelectorAll('[data-search-open]');
  const searchCloseBtn = document.getElementById('searchClose');

  function openSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchInput && searchInput.focus(), 80);
    renderResults('');
  }
  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove('open');
    document.body.style.overflow = '';
    if (searchInput) searchInput.value = '';
  }

  searchOpenBtns.forEach(btn => btn.addEventListener('click', openSearch));
  if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);
  if (searchOverlay) {
    searchOverlay.addEventListener('click', e => { if (e.target === searchOverlay) closeSearch(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && searchOverlay.classList.contains('open')) closeSearch(); });
  }

  function renderResults(q) {
    if (!searchGrid) return;
    const matches = q.trim() === ''
      ? ALL_TITLES.slice(0, 12)
      : ALL_TITLES.filter(t => t.title.toLowerCase().includes(q.toLowerCase()) || t.meta.toLowerCase().includes(q.toLowerCase()));

    if (!matches.length) {
      searchGrid.innerHTML = `<div class="search-no-results" style="grid-column:1/-1">No results for "<strong>${q}</strong>"</div>`;
      return;
    }
    searchGrid.innerHTML = matches.map(t => `
      <a href="${t.animeSlug ? `watch?slug=${encodeURIComponent(t.animeSlug)}` : t.url}" class="card" onclick="window._searchClose&&window._searchClose()">
        <div class="card-thumb">
          <img ${t.animeSlug ? `data-anime="${t.animeSlug}"` : ''} src="${t.img}" alt="${t.title}" loading="lazy">
          <div class="card-play-overlay"><i class="fa-solid fa-circle-play"></i></div>
        </div>
        <div class="card-info">
          <h3>${t.title}</h3>
          <p class="card-meta">${t.meta}</p>
        </div>
      </a>`).join('');

    // Trigger real image loading for search results
    if (window._animeImagesRun) window._animeImagesRun();
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => renderResults(searchInput.value));
  }
  window._searchClose = closeSearch;

  // Also wire any inline search boxes (genre/sub-page lists)
  const inlineSearch = document.querySelector('.topbar .search-box input, .genre-search input');
  if (inlineSearch) {
    inlineSearch.addEventListener('input', () => {
      const q = inlineSearch.value.toLowerCase().trim();
      document.querySelectorAll('.featured-card, .movie-card, .trending-item').forEach(el => {
        el.style.display = q === '' || el.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  /* ── 6. Hero carousel ────────────────────────────────────── */
  const heroSlides = document.querySelectorAll('.hero-slide');
  const heroDots   = document.querySelectorAll('.hero-dot');
  if (heroSlides.length > 1) {
    let current = 0;
    function goTo(n) {
      heroSlides[current].classList.remove('active');
      heroDots[current]  && heroDots[current].classList.remove('active');
      current = (n + heroSlides.length) % heroSlides.length;
      heroSlides[current].classList.add('active');
      heroDots[current]  && heroDots[current].classList.add('active');
    }
    heroDots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
    const heroTimer = setInterval(() => goTo(current + 1), 5500);
    document.querySelector('.hero') && document.querySelector('.hero').addEventListener('mouseenter', () => clearInterval(heroTimer));
  }

  /* ── 7. Canonical watch links ─────────────────────────────
     Every catalogue card passes its own slug to watch so the manifest
     cannot accidentally load another title's episode source. */
  document.querySelectorAll('a[href="watch.html"]').forEach(link => {
    const slug = link.querySelector('[data-anime]')?.dataset.anime;
    if (slug) link.href = `watch?slug=${encodeURIComponent(slug)}`;
  });

})();
