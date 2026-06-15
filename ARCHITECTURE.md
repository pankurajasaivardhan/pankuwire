# PankuWire — Architecture

PankuWire is a real-time news and research aggregation system. It ingests
content from 150+ external RSS feeds plus arXiv and Semantic Scholar,
deduplicates and ranks it, and serves a ranked feed to the client with
sub-10ms ranking latency for a 60-article batch.

## High-level flow

```
┌─────────────┐   ┌──────────────────┐   ┌────────────────────┐   ┌──────────┐
│ External     │   │ /api/news        │   │ Ranking pipeline   │   │ Client   │
│ RSS / arXiv  │──▶│ (per-category    │──▶│ (TF-IDF →          │──▶│ (React)  │
│ / S2 sources │   │  fetch + cache)  │   │  BloomFilter →     │   │          │
└─────────────┘   └──────────────────┘   │  Quickselect →     │   └──────────┘
                                          │  MinHeap)          │
                                          └────────────────────┘
```

## Why a separate API route per data domain

Early versions had a single `/api/markets` endpoint that fetched crypto,
indices, and equities together via `Promise.allSettled`. In production this
caused total failure of the endpoint even when one sub-source (CoinGecko)
was healthy — an uncaught error or slow response in one source affected the
whole response.

**Fix**: split into `/api/markets/crypto`, `/api/markets/indices`,
`/api/markets/companies` — each independently cached, each wrapped so it can
never throw (returns `{ data: [], error: "..." }` instead of a 500). This is
a fault-isolation pattern: one degraded dependency doesn't take down
unrelated features.

(Markets was later removed from the product entirely in favour of a
News/Briefing/Bookmarks-focused UI, but the fault-isolation pattern was kept
for the news API.)

## Ranking pipeline — why these four algorithms, in this order

| Stage | Algorithm | Why |
|---|---|---|
| 1 | **TF-IDF** | Scores each article's title/snippet against the corpus of all articles in that category, surfacing distinctive (non-generic) stories rather than ones that just repeat common words like "today" or "report". |
| 2 | **Bloom Filter** | Near-duplicate detection across sources — many stories are syndicated verbatim by 3-4 outlets. A Bloom filter gives O(1) approximate membership checks to drop near-duplicates before the expensive ranking step, with a small, acceptable false-positive rate. |
| 3 | **Quickselect** | After scoring, we need the top-K (e.g. top 60) articles from a much larger pool. Quickselect finds the K-th largest score in O(n) average time without a full O(n log n) sort — relevant since this runs on every page load. |
| 4 | **MinHeap** | Maintains the top-K set incrementally as articles are scored, giving O(log k) insertion/eviction — used for the final ranked output and for the "Today" briefing's cross-category top-story selection. |

## Search — Trie + KMP + Levenshtein

- **Trie**: built from article title tokens on load, powers autocomplete
  suggestions in the search box (prefix lookup, O(prefix length)).
- **KMP (Knuth-Morris-Pratt)**: exact substring search across titles —
  used for the primary search filter.
- **Levenshtein edit distance**: fallback fuzzy matching for typos
  ("quatum" → "quantum"), applied only when KMP finds no exact match and
  the query is ≥4 characters, to bound the O(n·m) cost.

## Clustering — BFS over a similarity graph

The "Clustered" view groups near-duplicate stories from different outlets
into a single card. A similarity graph is built (edge = TF-IDF cosine
similarity above a threshold between two articles), then BFS finds connected
components — each component becomes one cluster, with the highest-scoring
article shown as the representative.

## Trending keywords — HashMap frequency count

For each category, word frequencies across all fetched article titles are
counted in a HashMap (stopwords excluded, each word counted once per
article to avoid one verbose headline dominating). The top 8 by frequency
become clickable "Trending" pills that filter the feed.

## Company deduplication — Union-Find

When displaying market data, the same company can appear under multiple
tickers (e.g. GOOG/GOOGL, BRK-A/BRK-B). Union-Find merges these into a
single canonical entry using ticker-alias and name-prefix heuristics.

## Caching

- **LRU Cache** (client-side, 300-entry capacity): avoids re-fetching a
  category's articles when switching tabs within a session.
- **Server-side TTL cache** (in-memory per serverless instance): RSS
  responses cached 5 minutes on success, 60 seconds on partial/empty
  results so a transient feed failure self-heals quickly rather than
  serving an empty result for the full TTL.

## Known limitations / honest notes

- Server-side cache is per-instance (serverless cold starts reset it) —
  acceptable for a personal dashboard, would need Redis/MongoDB for a
  multi-instance production deployment (see roadmap).
- Bookmarks are currently `localStorage`-only (client-side, per-device).
- Several DSA modules (`lib/dsa.js`) exist but are not all wired into the
  UI — see inline comments for active vs. dormant implementations.

## Roadmap

- MongoDB-backed article cache with TTL indexes (shared across serverless
  instances, survives cold starts)
- In-flight request deduplication to prevent duplicate concurrent fetches
  on cache miss ("thundering herd" protection)
- `/api/health` endpoint reporting per-source freshness
- Server-persisted bookmarks
