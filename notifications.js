// notifications.js — notification center UI.
import { auth, onAuthStateChanged } from './auth.js';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from './notifications-client.js';

const loading = document.getElementById('loadingState');
const gate = document.getElementById('authGate');
const app = document.getElementById('notificationApp');
const list = document.getElementById('notificationList');
const empty = document.getElementById('emptyNotifications');
let user = null;
let current = [];

function timeLabel(timestamp) {
  return timestamp?.toDate ? timestamp.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently';
}

function icon(type) {
  return type === 'episode' ? 'fa-play' : type === 'recommendation' ? 'fa-sparkles' : type === 'account' ? 'fa-user' : 'fa-bell';
}

async function render() {
  current = await getNotifications(user.uid);
  list.innerHTML = '';
  empty.hidden = current.length > 0;
  if (!current.length) return;
  current.forEach(item => {
    const card = document.createElement('article');
    card.className = `notification-card ${item.read ? '' : 'unread'}`;
    card.innerHTML = `<div class="notification-icon"><i class="fa-solid ${icon(item.type)}"></i></div><div><h3>${item.title || 'Hanime AG'}</h3><p>${item.message || ''}</p><time>${timeLabel(item.createdAt)}</time></div>`;
    if (!item.read) card.addEventListener('click', async () => {
      try { await markNotificationRead(user.uid, item.id); card.classList.remove('unread'); item.read = true; }
      catch (err) { console.error('[HAG] Mark notification read error:', err); }
    });
    list.appendChild(card);
  });
}

document.getElementById('markAllRead').addEventListener('click', async () => {
  const unreadIds = current.filter(item => !item.read).map(item => item.id);
  if (!unreadIds.length) return;
  try { await markAllNotificationsRead(user.uid, unreadIds); await render(); }
  catch (err) { console.error('[HAG] Mark all notifications error:', err); }
});

onAuthStateChanged(auth, async signedInUser => {
  loading.hidden = true;
  user = signedInUser;
  if (!user) { gate.hidden = false; return; }
  app.hidden = false;
  try { await render(); } catch (err) { console.error('[HAG] Notification load error:', err); }
});