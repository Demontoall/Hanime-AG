// playlists.js — playlist page UI and add-to-playlist flow.
import { auth, onAuthStateChanged } from './auth.js';
import {
  getAllPlaylists, createPlaylist, renamePlaylist, deletePlaylist,
  addPlaylistItem, removePlaylistItem, getPlaylistItems
} from './playlists-client.js';

const loading = document.getElementById('loadingState');
const gate = document.getElementById('authGate');
const app = document.getElementById('playlistApp');
const list = document.getElementById('playlistList');
const empty = document.getElementById('emptyPlaylists');
const message = document.getElementById('playlistMessage');
let user = null;
let pending = null;

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
}

function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `form-message ${type}`;
}

function timeLabel(timestamp) {
  return timestamp?.toDate ? timestamp.toDate().toLocaleDateString() : '';
}

async function render() {
  const playlists = await getAllPlaylists(user.uid);
  list.innerHTML = '';
  empty.hidden = playlists.length > 0;
  if (!playlists.length) return;

  for (const playlist of playlists) {
    const items = await getPlaylistItems(user.uid, playlist.id);
    const card = document.createElement('article');
    card.className = 'playlist-card';
    card.innerHTML = `
      <div class="playlist-card-header">
        <div><h3>${escapeHTML(playlist.name)}</h3><p>${escapeHTML(playlist.description || 'No description')} · ${items.length} title${items.length === 1 ? '' : 's'}${timeLabel(playlist.createdAt) ? ` · Created ${timeLabel(playlist.createdAt)}` : ''}</p></div>
        <div class="playlist-card-actions">
          <button class="small-icon-btn" data-action="rename" aria-label="Rename ${escapeHTML(playlist.name)}"><i class="fa-solid fa-pen"></i></button>
          <button class="small-icon-btn" data-action="delete" aria-label="Delete ${escapeHTML(playlist.name)}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="playlist-items">${items.length ? items.map(item => `
        <span class="playlist-item-chip">
          <img src="${escapeHTML(item.img || 'https://picsum.photos/seed/hagplaylist/60/80')}" alt="">
          <span>${escapeHTML(item.title || item.slug)}</span>
          <button data-remove="${escapeHTML(item.slug)}" aria-label="Remove ${escapeHTML(item.title || item.slug)}"><i class="fa-solid fa-xmark"></i></button>
        </span>`).join('') : '<span class="form-message">No titles in this playlist yet.</span>'}</div>`;
    card.querySelector('[data-action="rename"]').addEventListener('click', async () => {
      const name = window.prompt('Playlist name', playlist.name);
      if (!name?.trim()) return;
      const description = window.prompt('Description', playlist.description || '') ?? playlist.description || '';
      try { await renamePlaylist(user.uid, playlist.id, name, description); await render(); }
      catch (err) { console.error('[HAG] Rename playlist error:', err); setMessage('Could not rename playlist.', 'error'); }
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!window.confirm(`Delete "${playlist.name}"?`)) return;
      try { await deletePlaylist(user.uid, playlist.id); await render(); }
      catch (err) { console.error('[HAG] Delete playlist error:', err); setMessage('Could not delete playlist.', 'error'); }
    });
    card.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', async () => {
      try { await removePlaylistItem(user.uid, playlist.id, button.dataset.remove); await render(); }
      catch (err) { console.error('[HAG] Remove playlist item error:', err); setMessage('Could not remove title.', 'error'); }
    }));
    list.appendChild(card);
  }
}

async function addPendingToPlaylist() {
  const params = new URLSearchParams(location.search);
  if (!params.has('add')) return;
  pending = {
    slug: params.get('add'),
    title: params.get('title') || params.get('add'),
    img: params.get('img') || '',
    url: `watch?slug=${encodeURIComponent(params.get('add'))}`
  };
  setMessage(`Choose a playlist below to add “${pending.title}”.`);
  const select = document.createElement('select');
  select.className = 'playlist-add-select';
  select.setAttribute('aria-label', 'Choose playlist');
  const playlists = await getAllPlaylists(user.uid);
  if (!playlists.length) return;
  select.innerHTML = '<option value="">Choose a playlist…</option>' + playlists.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
  const button = document.createElement('button');
  button.className = 'auth-btn-cta';
  button.innerHTML = '<i class="fa-solid fa-plus"></i> Add title';
  button.addEventListener('click', async () => {
    if (!select.value) return setMessage('Choose a playlist first.', 'error');
    try {
      await addPlaylistItem(user.uid, select.value, pending);
      setMessage('Title added to your playlist.', 'success');
      await render();
    } catch (err) { console.error('[HAG] Add playlist item error:', err); setMessage('Could not add title.', 'error'); }
  });
  const actions = document.querySelector('.playlist-create-card .form-actions');
  actions.append(select, button);
}

document.getElementById('createPlaylistForm').addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.getElementById('newPlaylistName').value.trim();
  const description = document.getElementById('newPlaylistDescription').value.trim();
  if (!name || !user) return;
  try {
    await createPlaylist(user.uid, name, description);
    event.target.reset();
    setMessage('Playlist created.', 'success');
    await render();
  } catch (err) { console.error('[HAG] Create playlist error:', err); setMessage('Could not create playlist.', 'error'); }
});

onAuthStateChanged(auth, async signedInUser => {
  loading.hidden = true;
  user = signedInUser;
  if (!user) { gate.hidden = false; return; }
  app.hidden = false;
  try {
    await render();
    await addPendingToPlaylist();
  } catch (err) {
    console.error('[HAG] Playlist load error:', err);
    setMessage('Could not load playlists. Please refresh and try again.', 'error');
    empty.hidden = true;
  }
});