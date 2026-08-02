// auth-ui.js — Runs on every page. Updates header avatar + injects heart buttons.
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { addFavourite, removeFavourite, getFavouriteSlugs } from './favorites-client.js';
import { getUnreadNotificationCount } from './notifications-client.js';

/* ── Helpers ─────────────────────────────────────────────── */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

function avatarHTML(user) {
  if (user.photoURL) {
    const safe = user.displayName || 'Profile';
    return `<img src="${user.photoURL}" alt="${safe}" class="header-avatar" referrerpolicy="no-referrer">`;
  }
  return `<div class="header-avatar header-avatar-initials">${getInitials(user.displayName || user.email)}</div>`;
}

/* ── Header profile buttons ──────────────────────────────── */
function updateHeaderBtns(user) {
  document.querySelectorAll('.profile-icon-btn, .profile-btn').forEach(btn => {
    btn.innerHTML = user ? avatarHTML(user) : '<i class="fa-solid fa-circle-user"></i>';
  });
}

function addNotificationLink() {
  const header = document.querySelector('header.topbar, header.home-header');
  if (!header || document.querySelector('.notification-link')) return;
  const link = document.createElement('a');
  link.href = 'notifications.html';
  link.className = 'notification-link';
  link.setAttribute('aria-label', 'Notifications');
  link.innerHTML = '<i class="fa-regular fa-bell"></i><span class="notification-count" hidden></span>';
  const profile = header.querySelector('.profile-icon-btn, .profile-btn');
  profile ? header.insertBefore(link, profile) : header.appendChild(link);
}

async function refreshNotificationCount(user) {
  const badge = document.querySelector('.notification-count');
  if (!badge) return;
  if (!user) {
    badge.hidden = true;
    return;
  }
  try {
    const count = await getUnreadNotificationCount(user.uid);
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count === 0;
  } catch (err) {
    console.warn('[HAG] Notification count unavailable:', err);
    badge.hidden = true;
  }
}

/* ── Toast notification ──────────────────────────────────── */
function showToast(msg) {
  let toast = document.getElementById('hag-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'hag-toast';
    toast.className = 'hag-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}
window._hagToast = showToast;

/* ── Heart buttons ───────────────────────────────────────── */
let _user = null;
let _favs = new Set();

function injectHeartButtons() {
  document.querySelectorAll('.card-thumb').forEach(thumb => {
    if (thumb.querySelector('.card-heart')) return;
    const img = thumb.querySelector('img[data-anime]');
    if (!img) return;
    const btn = document.createElement('button');
    btn.className = 'card-heart';
    btn.dataset.slug = img.dataset.anime;
    btn.setAttribute('aria-label', 'Add to favourites');
    btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    btn.addEventListener('click', onHeartClick);
    thumb.appendChild(btn);

    const playlistBtn = document.createElement('button');
    playlistBtn.className = 'card-playlist';
    playlistBtn.dataset.slug = img.dataset.anime;
    playlistBtn.setAttribute('aria-label', 'Add to playlist');
    playlistBtn.title = 'Add to playlist';
    playlistBtn.innerHTML = '<i class="fa-solid fa-list"></i>';
    playlistBtn.addEventListener('click', onPlaylistClick);
    thumb.appendChild(playlistBtn);
  });
  refreshHeartStates();
}

function onPlaylistClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const btn = e.currentTarget;
  const card = btn.closest('.card, .movie-card');
  const title = card?.querySelector('h3')?.textContent?.trim() || btn.dataset.slug;
  const img = btn.closest('.card-thumb')?.querySelector('img')?.src || '';
  const params = new URLSearchParams({ add: btn.dataset.slug, title, img });
  window.location.href = `playlists.html?${params}`;
}

function refreshPlaylistButtons() {
  document.querySelectorAll('.card-thumb').forEach(thumb => {
    const img = thumb.querySelector('img[data-anime]');
    if (!img || thumb.querySelector('.card-playlist')) return;
    const btn = document.createElement('button');
    btn.className = 'card-playlist';
    btn.dataset.slug = img.dataset.anime;
    btn.setAttribute('aria-label', 'Add to playlist');
    btn.title = 'Add to playlist';
    btn.innerHTML = '<i class="fa-solid fa-list"></i>';
    btn.addEventListener('click', onPlaylistClick);
    thumb.appendChild(btn);
  });
}

function refreshHeartStates() {
  document.querySelectorAll('.card-heart').forEach(btn => {
    const on = _favs.has(btn.dataset.slug);
    btn.classList.toggle('active', on);
    btn.innerHTML = on ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
    btn.setAttribute('aria-label', on ? 'Remove from favourites' : 'Add to favourites');
  });
}

async function onHeartClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const btn = e.currentTarget;
  const slug = btn.dataset.slug;

  if (!_user) {
    showToast('Sign in to save favourites ✨');
    setTimeout(() => {
      window.location.href = `login.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
    }, 900);
    return;
  }

  const wasOn = btn.classList.contains('active');
  // Optimistic update
  btn.classList.toggle('active', !wasOn);
  btn.innerHTML = !wasOn ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';

  try {
    if (wasOn) {
      await removeFavourite(_user.uid, slug);
      _favs.delete(slug);
      showToast('Removed from favourites');
    } else {
      const card  = btn.closest('.card, .movie-card');
      const title = card?.querySelector('h3')?.textContent?.trim() || slug;
      const imgEl = btn.closest('.card-thumb')?.querySelector('img');
      const img   = imgEl?.src || '';
      const url   = card?.getAttribute('href') || 'watch.html';
      await addFavourite(_user.uid, slug, { title, img, url });
      _favs.add(slug);
      showToast('Added to favourites ❤');
    }
  } catch (err) {
    console.error('[HAG] Favourite error:', err);
    // Revert optimistic update
    btn.classList.toggle('active', wasOn);
    btn.innerHTML = wasOn ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
    showToast('Error — please try again');
  }
}

/* ── Auth state ──────────────────────────────────────────── */
onAuthStateChanged(auth, async (user) => {
  _user = user;
  updateHeaderBtns(user);
  addNotificationLink();

  if (user) {
    try { _favs = await getFavouriteSlugs(user.uid); }
    catch (_) { _favs = new Set(); }
  } else {
    _favs = new Set();
  }

  refreshHeartStates();
  refreshNotificationCount(user);
});

/* ── Inject on DOM ready + re-inject after search renders ── */
const _inject = () => { injectHeartButtons(); refreshPlaylistButtons(); addNotificationLink(); };
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _inject);
} else {
  _inject();
}

// Re-inject hearts when search overlay renders new cards
const _prevRun = window._animeImagesRun;
window._animeImagesRun = function () {
  _prevRun?.();
  setTimeout(() => { injectHeartButtons(); refreshPlaylistButtons(); }, 80);
};
