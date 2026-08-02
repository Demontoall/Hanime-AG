// notifications-client.js — Firestore notification reads and state changes.
import { db } from './firebase-config.js';
import {
  addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const notifications = uid => collection(db, 'users', uid, 'notifications');

export async function getNotifications(uid) {
  const snap = await getDocs(query(notifications(uid), orderBy('createdAt', 'desc')));
  return snap.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function getUnreadNotificationCount(uid) {
  const all = await getNotifications(uid);
  return all.filter(item => !item.read).length;
}

export async function markNotificationRead(uid, notificationId) {
  await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), { read: true, readAt: serverTimestamp() });
}

export async function markAllNotificationsRead(uid, notificationIds) {
  await Promise.all(notificationIds.map(id => markNotificationRead(uid, id)));
}

export async function createNotification(uid, title, message, type = 'system') {
  return addDoc(notifications(uid), { title, message, type, read: false, createdAt: serverTimestamp() });
}