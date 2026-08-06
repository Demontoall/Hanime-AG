// footer.js — shared footer injected into every page.
(function () {
  'use strict';

  if (document.querySelector('.site-footer')) return;

  // Shared runtime metadata keeps every existing page indexable without
  // requiring a framework or replacing its hand-authored head section.
  const origin = window.HAG_PUBLIC_ORIGIN || window.location.origin;
  const canonical = new URL(window.location.pathname.replace(/\.html$/, ''), origin);
  canonical.search = window.location.search;
  if (!document.querySelector('link[rel="canonical"]')) {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = canonical.href;
    document.head.appendChild(link);
  }
  if (!document.querySelector('meta[property="og:title"]')) {
    const title = document.title || 'Hanime AG';
    const description = document.querySelector('meta[name="description"]')?.content
      || 'Discover, watch, and track anime, donghua, movies, and series on Hanime AG.';
    [
      ['og:title', title], ['og:description', description], ['og:type', 'website'],
      ['og:url', canonical.href], ['og:site_name', 'Hanime AG']
    ].forEach(([property, content]) => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', property);
      meta.content = content;
      document.head.appendChild(meta);
    });
    const twitter = document.createElement('meta');
    twitter.name = 'twitter:card';
    twitter.content = 'summary';
    document.head.appendChild(twitter);
  }
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = 'manifest.webmanifest';
    document.head.appendChild(manifest);
  }
  if (!document.querySelector('link[rel="icon"]')) {
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.href = 'favicon.svg';
    icon.type = 'image/svg+xml';
    document.head.appendChild(icon);
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(error => console.warn('[HAG] PWA unavailable:', error));
  }

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="site-footer-inner">
      <div class="site-footer-brand">
        <a href="index.html" class="site-footer-logo"><span>H</span> Hanime AG</a>
        <p>Discover. Watch. Experience.</p>
      </div>
      <nav class="site-footer-links" aria-label="Footer navigation">
        <a href="index.html">Home</a>
        <a href="genres.html">Genres</a>
        <a href="trending.html">Trending</a>
        <a href="favorite.html">My List</a>
        <a href="account.html">Account</a>
      </nav>
      <div class="site-footer-social" aria-label="Social links">
        <a href="https://github.com/" target="_blank" rel="noreferrer" aria-label="GitHub"><i class="fa-brands fa-github"></i></a>
        <a href="https://x.com/" target="_blank" rel="noreferrer" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
        <a href="mailto:hello@hanime.ag" aria-label="Email"><i class="fa-solid fa-envelope"></i></a>
      </div>
    </div>
    <div class="site-footer-bottom">
      <span>© ${new Date().getFullYear()} Hanime AG</span>
      <span>Built for fans, wherever they watch.</span>
    </div>`;

  document.body.appendChild(footer);
})();