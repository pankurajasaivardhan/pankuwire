// PankuWire — Bookmarks (localStorage + MongoDB server sync)
//
// Strategy:
// 1. localStorage is the primary client-side store (instant, offline-capable)
// 2. On mount, we sync with MongoDB via /api/bookmarks (if available)
// 3. Save/delete operations write to both localStorage AND the server
// 4. uid is a random ID generated once per device, stored in localStorage
//    — no login required, no personal data collected

const KEY   = 'pankuwire_bookmarks';
const UID_KEY = 'pankuwire_uid';

// ── UID ───────────────────────────────────────────────────────────────────────

export function getUID() {
  if (typeof window === 'undefined') return null;
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(UID_KEY, uid);
  }
  return uid;
}

// ── LOCAL STORAGE ─────────────────────────────────────────────────────────────

export function getBookmarks() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function isBookmarked(id) {
  return getBookmarks().some(b => b.id === id);
}

function saveLocal(bookmarks) {
  try { localStorage.setItem(KEY, JSON.stringify(bookmarks)); } catch {}
}

// ── SERVER SYNC ───────────────────────────────────────────────────────────────

export async function syncFromServer() {
  const uid = getUID();
  if (!uid) return;
  try {
    const res = await fetch(`/api/bookmarks?uid=${uid}`);
    const json = await res.json();
    if (json.bookmarks && json.bookmarks.length > 0) {
      // Merge server bookmarks with local — server wins on conflict
      const local = getBookmarks();
      const localIds = new Set(local.map(b => b.id));
      const serverOnly = json.bookmarks
        .filter(b => !localIds.has(b.articleId))
        .map(b => ({
          id: b.articleId, title: b.title, link: b.link,
          source: b.source, snippet: b.snippet,
          pubDate: b.pubDate, savedAt: b.savedAt,
        }));
      if (serverOnly.length > 0) {
        saveLocal([...serverOnly, ...local].slice(0, 200));
      }
    }
  } catch { /* server unavailable, local still works */ }
}

async function serverSave(article) {
  const uid = getUID();
  if (!uid) return;
  try {
    await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, article }),
    });
  } catch {}
}

async function serverDelete(id) {
  const uid = getUID();
  if (!uid) return;
  try {
    await fetch(`/api/bookmarks?uid=${uid}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch {}
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

export function toggleBookmark(article) {
  const current = getBookmarks();
  const exists  = current.some(b => b.id === article.id);
  let next;
  if (exists) {
    next = current.filter(b => b.id !== article.id);
    serverDelete(article.id); // async, fire-and-forget
  } else {
    next = [{ ...article, savedAt: new Date().toISOString() }, ...current].slice(0, 200);
    serverSave(article); // async, fire-and-forget
  }
  saveLocal(next);
  return next;
}

export function removeBookmark(id) {
  const next = getBookmarks().filter(b => b.id !== id);
  saveLocal(next);
  serverDelete(id);
  return next;
}
