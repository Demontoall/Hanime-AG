// footer.js — shared footer injected into every page.
(function () {
  'use strict';

  if (document.querySelector('.site-footer')) return;

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