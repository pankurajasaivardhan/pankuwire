// PankuWire — Server-side Bookmarks API
// GET    /api/bookmarks?uid=USER_ID       — list all bookmarks
// POST   /api/bookmarks                   — save a bookmark  { uid, article }
// DELETE /api/bookmarks?uid=UID&id=ART_ID — remove a bookmark
//
// uid is a random ID generated client-side on first visit and stored in
// localStorage — no auth needed, no personal data collected. Just a
// stable device identifier so bookmarks persist across sessions and
// can optionally sync across devices if the user shares their uid.
//
// Falls back gracefully when MONGODB_URI is not set (returns empty list,
// save/delete are no-ops — client localStorage bookmarks still work).

import { getDB } from '../../lib/mongodb';

const COLLECTION = 'bookmarks';
const MAX_PER_USER = 200;

async function getCol() {
  const db = await getDB();
  if (!db) return null;
  const col = db.collection(COLLECTION);
  // Ensure index on uid for fast lookups (idempotent)
  await col.createIndex({ uid: 1 }, { background: true });
  await col.createIndex({ uid: 1, articleId: 1 }, { unique: true, background: true });
  return col;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const col = await getCol();

  // ── GET /api/bookmarks?uid=xxx ─────────────────────────────
  if (req.method === 'GET') {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: 'uid required', bookmarks: [] });

    if (!col) return res.status(200).json({ bookmarks: [], source: 'unavailable' });

    try {
      const docs = await col
        .find({ uid }, { projection: { _id: 0, uid: 0 } })
        .sort({ savedAt: -1 })
        .limit(MAX_PER_USER)
        .toArray();
      return res.status(200).json({ bookmarks: docs, source: 'mongodb' });
    } catch (e) {
      return res.status(200).json({ bookmarks: [], error: e.message });
    }
  }

  // ── POST /api/bookmarks ────────────────────────────────────
  if (req.method === 'POST') {
    const { uid, article } = req.body || {};
    if (!uid || !article?.id) {
      return res.status(400).json({ error: 'uid and article.id required' });
    }

    if (!col) return res.status(200).json({ ok: true, source: 'unavailable' });

    try {
      // Check limit
      const count = await col.countDocuments({ uid });
      if (count >= MAX_PER_USER) {
        return res.status(200).json({ ok: false, error: `Bookmark limit (${MAX_PER_USER}) reached` });
      }

      await col.updateOne(
        { uid, articleId: article.id },
        {
          $set: {
            uid,
            articleId: article.id,
            title: article.title || '',
            link: article.link || '',
            source: article.source || '',
            snippet: article.snippet || '',
            pubDate: article.pubDate || '',
            savedAt: new Date().toISOString(),
          }
        },
        { upsert: true }
      );
      return res.status(200).json({ ok: true, source: 'mongodb' });
    } catch (e) {
      return res.status(200).json({ ok: false, error: e.message });
    }
  }

  // ── DELETE /api/bookmarks?uid=xxx&id=yyy ──────────────────
  if (req.method === 'DELETE') {
    const { uid, id } = req.query;
    if (!uid || !id) return res.status(400).json({ error: 'uid and id required' });

    if (!col) return res.status(200).json({ ok: true, source: 'unavailable' });

    try {
      await col.deleteOne({ uid, articleId: id });
      return res.status(200).json({ ok: true, source: 'mongodb' });
    } catch (e) {
      return res.status(200).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
