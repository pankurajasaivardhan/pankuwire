import { getHealthSnapshot } from '../../lib/health';
import { inFlightCount, inFlightKeys } from '../../lib/dedupe';
import { readAllCacheEntries } from '../../lib/articleCache';

// GET /api/health
// Returns per-category fetch health, in-flight dedup status, and MongoDB cache state.
export default async function handler(req, res) {
  const [snapshot, mongoEntries] = await Promise.all([
    Promise.resolve(getHealthSnapshot()),
    readAllCacheEntries(),
  ]);

  const totalSourcesOk = snapshot.reduce((sum, c) => sum + (c.sourcesOk || 0), 0);
  const totalSourcesTracked = snapshot.reduce((sum, c) => sum + (c.sourcesTotal || 0), 0);

  const overall = snapshot.length === 0
    ? 'unknown'
    : snapshot.every(c => c.sourcesOk === c.sourcesTotal && c.sourcesTotal > 0)
      ? 'healthy'
      : snapshot.some(c => c.sourcesOk === 0)
        ? 'degraded'
        : 'partial';

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: overall,
    categoriesTracked: snapshot.length,
    sources: { ok: totalSourcesOk, total: totalSourcesTracked },
    inFlightRequests: inFlightCount(),
    inFlightKeys: inFlightKeys(),
    mongoCache: {
      entriesActive: mongoEntries.length,
      entries: mongoEntries.map(e => ({
        category: e.category,
        articles: e.data?.total,
        sourcesOk: e.data?.sourcesOk,
        sourcesTotal: e.data?.sourcesTotal,
        updatedAt: e.updatedAt,
        expiresAt: e.expireAt,
      })),
    },
    categories: snapshot,
    checkedAt: new Date().toISOString(),
  });
}
