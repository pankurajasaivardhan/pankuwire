// PankuWire — Bookmarks (client-side localStorage)
const KEY = 'pankuwire_bookmarks';

export function getBookmarks() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function isBookmarked(id) {
  return getBookmarks().some(b => b.id === id);
}

export function toggleBookmark(article) {
  const current = getBookmarks();
  const exists = current.some(b => b.id === article.id);
  let next;
  if (exists) {
    next = current.filter(b => b.id !== article.id);
  } else {
    next = [{ ...article, savedAt: new Date().toISOString() }, ...current].slice(0, 200);
  }
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

export function removeBookmark(id) {
  const next = getBookmarks().filter(b => b.id !== id);
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}
