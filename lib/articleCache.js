// PankuWire — MongoDB article cache
//
// Stores ranked articles per category in MongoDB with a TTL index so
// documents expire automatically (MongoDB deletes them server-side after
// CACHE_TTL_SECONDS). This solves the main limitation of in-memory caching
// in serverless: the cache is now shared across all serverless instances
// and survives cold starts.
//
// Falls back silently to in-memory-only if MONGODB_URI is not set.

import { getDB } from './mongodb';

const COLLECTION = 'article_cache';
const CACHE_TTL_SECONDS = 300; // 5 minutes — same as RSS fetch interval

let ttlIndexEnsured = false;

/**
 * Ensure the TTL index exists on the `expireAt` field.
 * Called once per cold start (idempotent).
 */
async function ensureTTLIndex(col) {
  if (ttlIndexEnsured) return;
  try {
    await col.createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0, background: true }
    );
    ttlIndexEnsured = true;
  } catch {
    // Index already exists or failed silently — fine either way
  }
}

/**
 * Read cached articles for a category from MongoDB.
 * Returns null if not found, expired, or DB unavailable.
 * @param {string} category
 * @returns {Promise<object|null>}
 */
export async function readCache(category) {
  try {
    const db = await getDB();
    if (!db) return null;
    const col = db.collection(COLLECTION);
    const doc = await col.findOne({ category });
    if (!doc) return null;
    // Double-check expiry client-side (TTL deletion is async in MongoDB)
    if (doc.expireAt && new Date() > new Date(doc.expireAt)) return null;
    return doc.data;
  } catch (e) {
    console.error('[PankuWire] MongoDB readCache error:', e.message);
    return null;
  }
}

/**
 * Write articles for a category to MongoDB with TTL.
 * @param {string} category
 * @param {object} data - the full API response object to cache
 * @param {number} [ttlSeconds] - override TTL (default CACHE_TTL_SECONDS)
 */
export async function writeCache(category, data, ttlSeconds = CACHE_TTL_SECONDS) {
  try {
    const db = await getDB();
    if (!db) return;
    const col = db.collection(COLLECTION);
    await ensureTTLIndex(col);
    const expireAt = new Date(Date.now() + ttlSeconds * 1000);
    await col.updateOne(
      { category },
      { $set: { category, data, expireAt, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (e) {
    console.error('[PankuWire] MongoDB writeCache error:', e.message);
  }
}

/**
 * Read the full cache map for all categories (used by /api/health).
 * @returns {Promise<Array>}
 */
export async function readAllCacheEntries() {
  try {
    const db = await getDB();
    if (!db) return [];
    const col = db.collection(COLLECTION);
    return await col.find(
      { expireAt: { $gt: new Date() } },
      { projection: { category: 1, updatedAt: 1, expireAt: 1, 'data.total': 1, 'data.sourcesOk': 1, 'data.sourcesTotal': 1 } }
    ).toArray();
  } catch {
    return [];
  }
}
