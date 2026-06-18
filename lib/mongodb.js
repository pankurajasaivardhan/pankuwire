// PankuWire — MongoDB connection singleton
//
// In serverless environments (Vercel), each function invocation can reuse
// a warm Node.js process. This module caches the MongoClient so we don't
// open a new connection on every request — a standard Next.js pattern.
//
// Set MONGODB_URI in your Vercel environment variables (or .env.local for dev).

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn('[PankuWire] MONGODB_URI not set — MongoDB caching disabled, falling back to in-memory cache.');
}

let client;
let clientPromise;

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In dev, reuse across hot-reloads via global
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

/**
 * Returns a connected MongoClient, or null if MONGODB_URI is not configured.
 */
export async function getMongoClient() {
  if (!clientPromise) return null;
  try {
    return await clientPromise;
  } catch (e) {
    console.error('[PankuWire] MongoDB connection failed:', e.message);
    return null;
  }
}

/**
 * Returns the PankuWire database, or null if not connected.
 */
export async function getDB() {
  const c = await getMongoClient();
  return c ? c.db('pankuwire') : null;
}
