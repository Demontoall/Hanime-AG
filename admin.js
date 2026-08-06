import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { loadContentCatalogue } from './content-catalog.js';

const gate = document.getElementById('adminGate');
const panel = document.getElementById('adminPanel');
const list = document.getElementById('contentList');
const form = document.getElementById('contentForm');
const episodeEditor = document.getElementById('episodeEditor');
const episodeList = document.getElementById('episodeListAdmin');
const message = document.getElementById('contentMessage');
let contents = [];
let selected = null;

const field = id => document.getElementById(id);
const clean = value => String(value || '').trim();
const safeText = value => clean(value).replace(/[<>&"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[char]));
const slugify = value => clean(value)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 120);

function showMessage(text, type = '') {
  message.textContent = text;
  message.className = `form-message${type ? ` ${type}` : ''}`;
}

function firestoreError(error) {
  if (error?.code === 'permission-denied') {
    return 'Save blocked by Firebase rules. Confirm this account has role: admin and that the latest rules are deployed.';
  }
  if (error?.code === 'failed-precondition') {
    return 'Firebase is not ready yet. Check the Firestore database and try again.';
  }
  return error?.message ? `Could not save: ${error.message}` : 'Could not save. Please try again.';
}

async function isAdmin(user) {
  if (!user) return false;
  const snapshot = await getDoc(doc(db, 'users', user.uid));
  return snapshot.exists() && snapshot.data().role === 'admin';
}

async function loadContents() {
  const fallback = await loadContentCatalogue();
  const snapshot = await getDocs(collection(db, 'catalog'));
  const managed = snapshot.docs.map(item => ({ contentId: item.id, ...item.data() }));
  const byId = new Map(fallback.map(item => [item.contentId, item]));
  managed.forEach(item => byId.set(item.contentId, { ...byId.get(item.contentId), ...item }));
  contents = [...byId.values()].sort((a, b) => String(a.title).localeCompare(String(b.title)));
  renderContents();
}

function renderContents() {
  list.innerHTML = contents.length ? contents.map(item => `
    <button type="button" class="admin-content-row${selected?.contentId === item.contentId ? ' active' : ''}" data-content-id="${safeText(item.contentId)}">
      <span><strong>${safeText(item.title)}</strong><small>${safeText(item.category)} · ${safeText(item.slug)}</small></span>
      <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
    </button>`).join('') : '<p class="admin-note">No catalogue records found.</p>';
  list.querySelectorAll('[data-content-id]').forEach(button => {
    button.addEventListener('click', () => selectContent(button.dataset.contentId));
  });
}

function fillForm(item) {
  field('contentId').value = item.contentId || '';
  field('contentSlug').value = item.slug || '';
  field('contentTitle').value = item.title || '';
  field('contentCategory').value = item.category || 'Anime';
  field('contentGenres').value = (item.genres || []).join(', ');
  field('contentPoster').value = item.poster || '';
  field('contentBanner').value = item.banner || '';
  field('contentDescription').value = item.description || '';
  field('contentFeatured').checked = Boolean(item.featured);
}

async function selectContent(contentId) {
  selected = contents.find(item => item.contentId === contentId) || null;
  if (!selected) return;
  renderContents();
  field('editorTitle').textContent = selected.title;
  form.hidden = false;
  episodeEditor.hidden = false;
  fillForm(selected);
  await renderEpisodes();
}

async function renderEpisodes() {
  if (!selected) return;
  const snapshot = await getDocs(collection(db, 'catalog', selected.contentId, 'episodes'));
  const episodes = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => Number(a.episodeNumber) - Number(b.episodeNumber));
  episodeList.innerHTML = episodes.length ? episodes.map(ep => `
    <form class="admin-episode-row" data-episode-id="${safeText(ep.id)}">
      <input name="season" type="number" min="1" value="${Number(ep.season) || 1}" aria-label="Season number">
      <input name="episodeNumber" type="number" min="1" value="${Number(ep.episodeNumber) || 1}" aria-label="Episode number">
      <input name="title" value="${safeText(ep.title || '')}" placeholder="Episode title" aria-label="Episode title">
      <input name="videoUrl" type="url" value="${safeText(ep.videoUrl || '')}" placeholder="Licensed MP4/HLS URL" aria-label="Video URL">
      <input name="thumbnail" type="url" value="${safeText(ep.thumbnail || '')}" placeholder="Thumbnail URL" aria-label="Thumbnail URL">
      <button class="small-icon-btn" type="submit" aria-label="Save episode"><i class="fa-solid fa-floppy-disk"></i></button>
      <button class="small-icon-btn danger" type="button" data-delete-episode="${safeText(ep.id)}" aria-label="Delete episode"><i class="fa-solid fa-trash"></i></button>
    </form>`).join('') : '<p class="admin-note">No managed episodes yet. Add one when a licensed source is ready.</p>';
  episodeList.querySelectorAll('.admin-episode-row').forEach(row => {
    row.addEventListener('submit', event => saveEpisode(event, row));
  });
  episodeList.querySelectorAll('[data-delete-episode]').forEach(button => {
    button.addEventListener('click', () => deleteEpisode(button.dataset.deleteEpisode));
  });
}

async function saveEpisode(event, row) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(row));
  const id = row.dataset.episodeId || `episode-${data.episodeNumber}`;
  const submit = row.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  showMessage('Saving episode…');
  try {
    await setDoc(doc(db, 'catalog', selected.contentId, 'episodes', id), {
      episodeNumber: Number(data.episodeNumber) || 1,
      season: Number(data.season) || 1,
      title: clean(data.title) || `Episode ${data.episodeNumber}`,
      videoUrl: clean(data.videoUrl) || null,
      thumbnail: clean(data.thumbnail) || null,
      updatedAt: serverTimestamp()
    }, { merge: true });
    showMessage('Episode saved', 'success');
    await renderEpisodes();
  } catch (error) {
    console.error('[HAG] Episode save error:', error);
    showMessage(firestoreError(error), 'error');
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function deleteEpisode(id) {
  if (!selected || !confirm('Delete this episode record?')) return;
  await deleteDoc(doc(db, 'catalog', selected.contentId, 'episodes', id));
  await renderEpisodes();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const title = clean(field('contentTitle').value);
  const normalizedId = slugify(field('contentId').value || title);
  const normalizedSlug = slugify(field('contentSlug').value || title);
  if (!title || !normalizedId || !normalizedSlug) {
    showMessage('Enter a title, stable ID, and slug before saving.', 'error');
    return;
  }

  // Keep stable IDs and routes safe even when a user types "Solo Leveling"
  // into the ID or slug field on a phone.
  field('contentId').value = normalizedId;
  field('contentSlug').value = normalizedSlug;

  const data = {
    contentId: normalizedId,
    slug: normalizedSlug,
    title,
    category: clean(field('contentCategory').value) || 'Anime',
    genres: clean(field('contentGenres').value).split(',').map(clean).filter(Boolean),
    poster: clean(field('contentPoster').value) || null,
    banner: clean(field('contentBanner').value) || null,
    description: clean(field('contentDescription').value) || null,
    featured: field('contentFeatured').checked,
    updatedAt: serverTimestamp()
  };
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  showMessage('Saving title…');
  try {
    await setDoc(doc(db, 'catalog', data.contentId), data, { merge: true });
    selected = data;
    showMessage('Title saved', 'success');
    await loadContents();
    await selectContent(data.contentId);
  } catch (error) {
    console.error('[HAG] Title save error:', error);
    showMessage(firestoreError(error), 'error');
  } finally {
    if (submit) submit.disabled = false;
  }
});

document.getElementById('newContentBtn').addEventListener('click', () => {
  selected = null;
  field('editorTitle').textContent = 'New title';
  form.hidden = false;
  episodeEditor.hidden = true;
  fillForm({ category: 'Anime' });
  field('contentId').focus();
});
document.getElementById('newEpisodeBtn').addEventListener('click', async () => {
  if (!selected) return;
  const button = document.getElementById('newEpisodeBtn');
  button.disabled = true;
  showMessage('Adding episode…');
  try {
    const snapshot = await getDocs(collection(db, 'catalog', selected.contentId, 'episodes'));
    const next = snapshot.docs.length + 1;
    await setDoc(doc(db, 'catalog', selected.contentId, 'episodes', `episode-${next}`), {
      season: 1, episodeNumber: next, title: `Episode ${next}`, videoUrl: null, thumbnail: null, createdAt: serverTimestamp()
    });
    showMessage('Episode added', 'success');
    await renderEpisodes();
  } catch (error) {
    console.error('[HAG] Episode create error:', error);
    showMessage(firestoreError(error), 'error');
  } finally {
    button.disabled = false;
  }
});

onAuthStateChanged(auth, async user => {
  try {
    if (!(await isAdmin(user))) {
      gate.innerHTML = '<i class="fa-solid fa-lock"></i><h3>Administrator access required</h3><p>Set the <code>role</code> field to <code>admin</code> on your Firebase user document.</p>';
      return;
    }
    gate.hidden = true;
    panel.hidden = false;
    await loadContents();
  } catch (error) {
    console.error('[HAG] Admin error:', error);
    gate.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><h3>Admin data unavailable</h3><p>Check authentication and Firestore permissions.</p>';
  }
});