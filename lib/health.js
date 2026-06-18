// PankuWire — Source health tracking
//
// Tracks, per news category, the last successful fetch time, the last
// attempt time, how many of the category's RSS sources responded, and
// the most recent error (if any). Used by /api/news to update status and
// by /api/health to report it.
//
// In-memory per serverless instance — acceptable for a status dashboard;
// resets on cold start, which simply means "no data yet" until the first
// request repopulates it.

const status = new Map();

/**
 * Record the result of a fetch attempt for a category.
 * @param {string} category
 * @param {{ sourcesOk: number, sourcesTotal: number, total: number, error?: string }} result
 */
export function recordFetch(category, result) {
  const now = new Date().toISOString();
  const prev = status.get(category) || {};
  status.set(category, {
    category,
    lastAttempt: now,
    lastSuccess: result.total > 0 ? now : (prev.lastSuccess || null),
    sourcesOk: result.sourcesOk,
    sourcesTotal: result.sourcesTotal,
    articleCount: result.total,
    lastError: result.error || null,
  });
}

/**
 * Get health status for all categories that have been fetched at least once.
 */
export function getHealthSnapshot() {
  return [...status.values()].sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Get health status for a single category, or null if never fetched.
 */
export function getCategoryHealth(category) {
  return status.get(category) || null;
}
