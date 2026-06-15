# PankuWire v5 — Changes from v4

## Removed
- Rankings tab entirely removed (Forbes billionaires, company rankings tables)
- All colored DSA badges replaced with black/white/grey

## Markets — rebuilt
- Indices/Forex: Yahoo Finance primary, Stooq CSV fallback if Yahoo fails
- NEW: "Top Companies" tab — NYSE/NASDAQ majors (NVDA, AAPL, MSFT, GOOG, AMZN,
  META, TSLA, etc.) + India majors (RELIANCE, TCS, HDFC Bank, etc.) with
  market cap, price, % change
- Crypto: CoinGecko (unchanged, was already working)
- Refresh button no longer reloads the page (was causing the "India domain"
  redirect issue) — now re-fetches via JS only

## DSA — added 2 more, now 17 total, all genuinely wired in
- Union-Find: dedupes company share classes (GOOG/GOOGL, BRK-A/BRK-B) in
  the Top Companies table
- HashMap frequency count: "Trending Keywords" widget on every news tab —
  click a keyword to filter the feed by it

## Honest DSA inventory (what's actually load-bearing vs dormant)
ACTIVE on every page load:
- TF-IDF, Bloom Filter, Quickselect, MinHeap (ranking pipeline)
- Trie (search autocomplete)
- LRU Cache (article cache)
- KMP, Levenshtein edit distance (search filtering)
- Sliding window + binary search (time filter)
- BFS clustering (cluster toggle)
- HashMap frequency count (trending keywords) -- NEW
- Union-Find (company dedup in Markets) -- NEW

DORMANT (real implementations exist in lib/dsa.js but not wired to UI):
- DP Knapsack (would need user reading-history profiles -- out of scope)
- Merge-sort-based k-way feed merge (superseded by simple sort, kept for reference)

NOT IMPLEMENTED (would be decorative, don't fit this app's data shapes):
- Segment Tree, Dijkstra, Counting Sort, Token Bucket rate limiter,
  Consistent Hashing, PageRank graph
