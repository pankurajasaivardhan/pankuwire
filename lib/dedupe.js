// PankuWire — In-flight request deduplication
//
// Problem: when a category's cache expires, multiple concurrent requests
// (e.g. several users loading the same tab, or the client retrying) can
// each trigger their own RSS fetch for the same category at the same time
// — a "thundering herd" against the upstream feeds.
//
// Fix: track in-flight promises per key. If a second request arrives for
// a key that's already being fetched, it awaits the same promise instead
// of starting a new fetch. Once the promise resolves (or rejects), the
// entry is cleared so the next genuine cache-miss starts a fresh fetch.

const inFlight = new Map();

/**
 * Run `fn` for `key`, deduplicating concurrent calls.
 * @param {string} key - unique identifier for this fetch (e.g. category name)
 * @param {() => Promise<any>} fn - the actual fetch/work function
 * @returns {Promise<any>}
 */
export function dedupe(key, fn) {
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = Promise.resolve()
    .then(fn)
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Returns the number of currently in-flight requests (for diagnostics).
 */
export function inFlightCount() {
  return inFlight.size;
}

/**
 * Returns the keys currently in flight (for diagnostics).
 */
export function inFlightKeys() {
  return [...inFlight.keys()];
}
