// playlists-client.js — Firestore playlist CRUD for the signed-in user.
import { db } from './firebase-config.js';
import {
  addDoc, deleteDoc, doc, getDocs, collection, orderBy, query,
  serverTimestamp, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const playlists = (uid) => collection(db, 'users', uid, 'playlists');
const items = (uid, playlistId) => collection(db, 'users', uid, 'playlists', playlistId, 'items');

export async function getAllPlaylists(uid) {
  const snap = await getDocs(query(playlists(uid), orderBy('createdAt', 'desc')));
  return snap.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function createPlaylist(uid, name, description = '') {
  const ref = await addDoc(playlists(uid), { name: name.trim(), description: description.trim(), createdAt: serverTimestamp() });
  return ref.id;
}

export async function renamePlaylist(uid, playlistId, name, description = '') {
  await updateDoc(doc(db, 'users', uid, 'playlists', playlistId), { name: name.trim(), description: description.trim(), updatedAt: serverTimestamp() });
}

export async function deletePlaylist(uid, playlistId) {
  const childDocs = await getDocs(items(uid, playlistId));
  await Promise.all(childDocs.docs.map(item => deleteDoc(item.ref)));
  await deleteDoc(doc(db, 'users', uid, 'playlists', playlistId));
}

export async function addPlaylistItem(uid, playlistId, item) {
  await setDoc(doc(items(uid, playlistId), item.slug), { ...item, addedAt: serverTimestamp() });
}

export async function removePlaylistItem(uid, playlistId, slug) {
  await deleteDoc(doc(items(uid, playlistId), slug));
}

export async function getPlaylistItems(uid, playlistId) {
  const snap = await getDocs(items(uid, playlistId));
  return snap.docs.map(item => ({ id: item.id, ...item.data() }));
}