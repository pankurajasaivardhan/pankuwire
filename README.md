# PankuWire v2 📡
**Real-Time Intelligence Dashboard** — Built by Panku

News · Research Papers · Markets · Company Rankings · Billionaires

---

## 🚀 Quick Start (3 Commands)

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📦 What's Inside

```
pankuwire-v2/
├── pages/
│   ├── index.js              ← Main dashboard (14 tabs)
│   └── api/
│       ├── news.js           ← RSS aggregator (150+ feeds, 11 categories)
│       ├── markets.js        ← Yahoo Finance + CoinGecko + Rankings + Billionaires
│       └── papers.js         ← arXiv + Semantic Scholar
├── components/
│   ├── Ticker.jsx            ← Live scrolling market ticker
│   ├── NewsFeed.jsx          ← Full DSA pipeline (8 algorithms active)
│   ├── MarketsPanel.jsx      ← Indices + Crypto
│   ├── RankingsPanel.jsx     ← Global/India companies + Billionaires
│   └── PaperFeed.jsx         ← Research papers with search
├── lib/
│   └── dsa.js                ← All 15 DSA algorithms
├── python-service/
│   ├── main.py               ← FastAPI: TF-IDF, PageRank, BFS, KMP, Edit Distance
│   └── requirements.txt
├── cpp-engine/
│   └── engine.cpp            ← C++: Bloom Filter, HashMap, MergeSort, Quickselect, KMP
├── docker-compose.yml        ← Run everything with 1 command
├── Dockerfile.frontend
└── .github/workflows/
    └── deploy.yml            ← GitHub Actions CI/CD
```

---

## 🧠 DSA Algorithms — Where Each is Used

### JavaScript (lib/dsa.js) — Frontend Engine
| Algorithm | Location | Use Case | Complexity |
|---|---|---|---|
| **MinHeap** | `MinHeap` class | Top-K article ranking | O(n log k) |
| **Bloom Filter** | `BloomFilter` class | Duplicate detection | O(1) insert/lookup |
| **Trie** | `Trie` class | Search autocomplete | O(m) lookup |
| **LRU Cache** | `LRUCache` class | Article caching with eviction | O(1) get/set |
| **Union-Find** | `UnionFind` class | Company deduplication | O(α(n)) ≈ O(1) |
| **BFS Clustering** | `bfsClusters()` | Group same-story articles | O(n² + n + e) |
| **KMP Search** | `kmpSearch()` | Fast keyword matching | O(n + m) |
| **TF-IDF** | `computeTFIDF()` | Article uniqueness scoring | O(N × V) |
| **Quickselect** | `quickselect()` | Top-K without full sort | O(n) avg |
| **Merge Sort** | `mergeSortedFeeds()` | Merge k sorted feeds | O(n log k) |
| **Edit Distance** | `editDistance()` | Fuzzy search correction | O(m × n) |
| **Sliding Window** | `slidingWindowFilter()` | Time-range filter | O(log n) |
| **Binary Search** | `binarySearchByDate()` | Date range jump | O(log n) |
| **DP Knapsack** | `dpKnapsack()` | Personalised feed mix | O(n × W) |
| **Scoring** | `scoreArticle()` | Recency + trust + keywords | O(1) |

### Python (python-service/main.py) — Backend Ranking
| Algorithm | Use Case |
|---|---|
| **TF-IDF** | Find truly unique important articles |
| **PageRank (simplified)** | Source credibility scoring |
| **KMP** | Fast pattern matching O(n+m) |
| **Edit Distance DP** | Fuzzy search correction |
| **BFS Clustering** | Group articles about same event |
| **Jaccard Similarity** | Measure article similarity for graph edges |

### C++ (cpp-engine/engine.cpp) — Speed Critical
| Algorithm | Use Case |
|---|---|
| **Bloom Filter** | Deduplicate 100k+ articles in microseconds |
| **Custom HashMap** | O(1) article ID → score lookup |
| **Merge Sort** | Stable sort of merged feeds |
| **Quickselect** | Top-K in O(n) average |
| **KMP** | Ultra-fast pattern search in C++ speed |

---

## 📡 News Sources (150+ RSS Feeds)

| Tab | Sources | Count |
|---|---|---|
| 🇮🇳 India | The Hindu, NDTV, ET, Mint, BS, MoneyControl... | 12 |
| 💻 Tech | TechCrunch, Wired, IEEE, Ars Technica, CNET... | 12 |
| 🤖 AI & ML | arXiv CS.AI/LG/CV/CL, Google AI, HuggingFace... | 12 |
| 🔮 Quantum | arXiv quant-ph, IBM Quantum, CERN, Quanta... | 7 |
| 🔬 Science | Phys.org, ScienceDaily, Quanta, Nature... | 8 |
| 🚀 Space | NASA, ESA, SpaceNews, ISRO, arXiv astro-ph... | 8 |
| ⚛️ Physics | arXiv, CERN, Fermilab, APS, Physics World... | 7 |
| ⚡ EV & Auto | Electrek, InsideEVs, CleanTechnica, Teslarati... | 8 |
| 🌍 Geopolitics | Reuters, BBC, Al Jazeera, FP, The Diplomat... | 9 |
| 🏢 Companies | Google, Microsoft, NVIDIA, Apple, Crunchbase... | 9 |
| 🏦 Finance | Goldman, Hedgeweek, arXiv q-fin, MarketWatch... | 9 |

---

## 📈 Market Data
- **Indices**: NIFTY50, SENSEX, S&P500, NASDAQ, FTSE, Nikkei, Hang Seng
- **Forex**: USD/INR, EUR/USD, Gold, Crude Oil
- **Crypto**: Top 20 by market cap (CoinGecko)
- **Rankings**: Global Top 30 + India Top 30 companies by market cap (Yahoo Finance)
- **Billionaires**: Forbes Real-Time Billionaires (MIT license, top 50)

---

## 🌐 Deploy to Vercel (Free, Live Anywhere)

```bash
# Step 1: Push to GitHub
git init && git add . && git commit -m "PankuWire v2"
git remote add origin https://github.com/YOUR_USERNAME/pankuwire.git
git push -u origin main

# Step 2: Go to vercel.com → New Project → Import repo → Deploy
# Your app: pankuwire.vercel.app (live in 60 seconds)

# Step 3: Install on phone
# Open in Chrome → Menu → Add to Home Screen → Done!
```

---

## 🐳 Docker (Run All Services)

```bash
# Build and run everything
docker-compose up --build

# Services:
# Frontend:       http://localhost:3000
# Python service: http://localhost:8000
# Redis:          localhost:6379
```

---

## 🔧 Python Service (Optional — Advanced Ranking)

```bash
cd python-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API: http://localhost:8000/health
```

---

## ⚙️ C++ Engine (Optional — Ultra-fast Dedup)

```bash
cd cpp-engine
g++ -O2 -std=c++17 -o engine engine.cpp

# Deduplicate titles:
echo -e "quantum computing\nquantum computing\nblack hole" | ./engine DEDUP
# Output: 0\n2  (indices of unique articles)

# Search:
echo -e "quantum\nquantum computing breakthrough\nblack hole discovery" | ./engine SEARCH
# After entering pattern "quantum": outputs matching indices
```

---

## 📱 PWA — Install on Phone

1. Open your Vercel URL in Chrome on phone
2. Tap ⋮ menu → "Add to Home Screen"
3. PankuWire appears as app icon on home screen
4. Opens fullscreen — looks and works like a real app

---

PankuWire v2.0 © 2025 · Built by Panku · 150+ sources · 15 DSA algorithms
