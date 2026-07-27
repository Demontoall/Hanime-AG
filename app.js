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
  const ALL_TITLES = [
    { title:'Solo Leveling',           meta:'Anime · Action',       url:'watch.html',      img:'https://picsum.photos/300/420?101' },
    { title:'Jujutsu Kaisen',          meta:'Anime · Supernatural', url:'watch.html',      img:'https://picsum.photos/300/420?102' },
    { title:'Demon Slayer',            meta:'Anime · Action',       url:'watch.html',      img:'https://picsum.photos/300/420?103' },
    { title:'Attack on Titan',         meta:'Anime · Drama',        url:'watch.html',      img:'https://picsum.photos/300/420?104' },
    { title:'One Piece',               meta:'Anime · Adventure',    url:'watch.html',      img:'https://picsum.photos/300/420?105' },
    { title:'Naruto Shippuden',        meta:'Anime · Action',       url:'watch.html',      img:'https://picsum.photos/300/420?106' },
    { title:'Bleach: TYBW',            meta:'Anime · Action',       url:'watch.html',      img:'https://picsum.photos/300/420?107' },
    { title:'Vinland Saga',            meta:'Anime · Historical',   url:'watch.html',      img:'https://picsum.photos/300/420?108' },
    { title:'Blue Sky',                meta:'Donghua · Xianxia',    url:'bluesky.html',    img:'https://picsum.photos/300/420?109' },
    { title:'Night World',             meta:'Anime · Dark Fantasy', url:'nightworld.html', img:'https://picsum.photos/300/420?110' },
    { title:'Shadow Hero',             meta:'Anime · Action',       url:'shadowhero.html', img:'https://picsum.photos/300/420?111' },
    { title:'Battle Through the Heavens', meta:'Donghua · Cultivation', url:'watch.html', img:'https://picsum.photos/300/420?112' },
    { title:'Soul Land',               meta:'Donghua · Fantasy',    url:'watch.html',      img:'https://picsum.photos/300/420?113' },
    { title:'Perfect World',           meta:'Donghua · Xianxia',    url:'watch.html',      img:'https://picsum.photos/300/420?114' },
    { title:"The King's Avatar",       meta:'Donghua · Modern',     url:'watch.html',      img:'https://picsum.photos/300/420?115' },
    { title:'Your Name',               meta:'Movie · Romance',      url:'watch.html',      img:'https://picsum.photos/300/420?116' },
    { title:'Suzume',                  meta:'Movie · Adventure',    url:'watch.html',      img:'https://picsum.photos/300/420?117' },
    { title:'A Silent Voice',          meta:'Movie · Drama',        url:'watch.html',      img:'https://picsum.photos/300/420?118' },
    { title:'Spirited Away',           meta:'Movie · Fantasy',      url:'watch.html',      img:'https://picsum.photos/300/420?119' },
    { title:'Overflow',                meta:'Hanime · Romance',     url:'watch.html',      img:'https://picsum.photos/300/420?120' },
    { title:'Chainsaw Man',            meta:'Anime · Action',       url:'watch.html',      img:'https://picsum.photos/300/420?121' },
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
      <a href="${t.url}" class="card" onclick="closeSearch && window._searchClose && window._searchClose()">
        <div class="card-thumb">
          <img src="${t.img}" alt="${t.title}" loading="lazy">
          <div class="card-play-overlay"><i class="fa-solid fa-circle-play"></i></div>
        </div>
        <div class="card-info">
          <h3>${t.title}</h3>
          <p class="card-meta">${t.meta}</p>
        </div>
      </a>`).join('');
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

  /* ── 7. Watch page — lazy iframe + episode counter ──────── */
  const videoPlaceholder = document.getElementById('videoPlaceholder');
  const videoFrame       = document.getElementById('videoFrame');
  if (videoPlaceholder && videoFrame) {
    videoPlaceholder.addEventListener('click', () => {
      videoFrame.src = videoFrame.dataset.src || '';
      videoPlaceholder.style.display = 'none';
    });
  }

  const epLabel = document.getElementById('epLabel');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  if (epLabel && btnPrev && btnNext) {
    let ep = 1;
    const update = () => { epLabel.textContent = `Episode ${ep}`; };
    btnNext.addEventListener('click', () => { ep++; update(); if (videoPlaceholder) videoPlaceholder.style.display='flex'; if(videoFrame) videoFrame.src=''; });
    btnPrev.addEventListener('click', () => { if (ep > 1) { ep--; update(); } });
  }

})();
