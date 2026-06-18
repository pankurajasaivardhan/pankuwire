# PankuWire

![CI](https://github.com/pankurajasaivardhan/pankuwire/actions/workflows/ci.yml/badge.svg)

A real-time news and research aggregation terminal. Ingests 150+ RSS feeds across 11 categories, ranks articles using a custom DSA pipeline, and serves a live editorial-style dashboard.

**Live:** [pankuwire.vercel.app](https://pankuwire.vercel.app)



## What it does

- Aggregates 150+ RSS sources across India, Tech, AI & ML, Business, Science, Space, Physics, Quantum, EV & Auto, and Geopolitics
- Fetches research papers from arXiv and Semantic Scholar
- Ranks every article batch using a TF-IDF → Bloom Filter → Quickselect → MinHeap pipeline
- Global search across all 11 sections simultaneously using KMP + Levenshtein fuzzy matching
- Today tab: real-time digest of the top story from each section
- Bookmarks: save articles to localStorage, persist across sessions
- `/api/health` endpoint: live per-source fetch status and cache state

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full write-up covering:
- Why each algorithm was chosen (TF-IDF, Bloom Filter, Quickselect, MinHeap, BFS clustering, Union-Find)
- 3-tier caching strategy (in-memory L1 → MongoDB L2 → live RSS L3)
- Fault isolation: why each data source has its own independent API route
- In-flight request deduplication (thundering herd prevention)
- Known limitations and roadmap

## Tech stack

- **Frontend**: Next.js, React, Inter + IBM Plex Mono fonts
- **Backend**: Next.js API routes (Node.js serverless)
- **Database**: MongoDB Atlas (TTL-indexed article cache)
- **Algorithms**: 17 DSA implementations in `lib/dsa.js` — all unit tested
- **Testing**: Jest (54 unit tests, `npm test`)
- **CI**: GitHub Actions — build + test on every push
- **Deploy**: Vercel (auto-deploy on push to main)

## DSA algorithms implemented

| Algorithm | Used for |
|---|---|
| TF-IDF | Article uniqueness scoring |
| Bloom Filter | Near-duplicate detection |
| Quickselect | Top-K selection in O(n) average |
| MinHeap | Ranked feed maintenance |
| Trie | Search autocomplete |
| LRU Cache | Client-side article cache |
| KMP | Fast headline search |
| Levenshtein | Fuzzy search / typo tolerance |
| BFS | Story clustering |
| Union-Find | Company share class deduplication |
| HashMap | Trending keyword frequency count |
| Sliding Window | Time-range article filter |
| Binary Search | Date-range lookup |

## Running locally

```bash
git clone https://github.com/pankurajasaivardhan/pankuwire.git
cd pankuwire
npm install
npm run dev        # http://localhost:3000
npm test           # run 54 unit tests
npm run build      # production build
```

Optional — add `MONGODB_URI` to `.env.local` for MongoDB-backed caching:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pankuwire
```

## Project structure

```
pages/
  index.js              — main UI (13 tabs)
  api/
    news.js             — RSS aggregation + 3-tier caching
    papers.js           — arXiv + Semantic Scholar
    search.js           — global cross-category search
    health.js           — per-source health endpoint
components/
  NewsFeed.jsx          — per-category article feed
  Briefing.jsx          — Today digest tab
  GlobalSearch.jsx      — cross-category search UI
  Bookmarks.jsx         — saved articles
lib/
  dsa.js                — 17 DSA algorithm implementations
  mongodb.js            — MongoDB connection singleton
  articleCache.js       — MongoDB TTL cache layer
  dedupe.js             — in-flight request deduplication
  health.js             — source health tracking
  bookmarks.js          — localStorage bookmark helpers
__tests__/
  dsa.test.js           — 54 Jest unit tests
```
