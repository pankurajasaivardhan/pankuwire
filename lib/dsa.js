// ============================================================
// PankuWire v2 — Complete DSA Engine
// Algorithms: MinHeap, BloomFilter, Trie, LRU Cache,
//             Graph BFS, TF-IDF, KMP, Union-Find,
//             DP Knapsack, Quickselect, Merge Sort
// ============================================================

// ── 1. MIN-HEAP (Priority Queue) ────────────────────────────
// Used for: Top-K article ranking in O(n log k)
export class MinHeap {
  constructor(compareFn = (a, b) => a.score - b.score) {
    this.heap = [];
    this.compare = compareFn;
  }
  get size() { return this.heap.length; }
  peek() { return this.heap[0]; }
  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }
  pop() {
    if (this.size === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }
  _bubbleUp(i) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.compare(this.heap[p], this.heap[i]) <= 0) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }
  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.compare(this.heap[l], this.heap[smallest]) < 0) smallest = l;
      if (r < n && this.compare(this.heap[r], this.heap[smallest]) < 0) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
  // Get all items sorted descending
  extractAll() {
    const result = [];
    while (this.size > 0) result.push(this.pop());
    return result.reverse();
  }
}

// ── 2. BLOOM FILTER ─────────────────────────────────────────
// Used for: O(1) duplicate article detection — probabilistic
export class BloomFilter {
  constructor(size = 4096) {
    this.size = size;
    this.bits = new Uint8Array(size);
  }
  _hashes(str) {
    let h1 = 5381, h2 = 52711, h3 = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = ((h1 << 5) + h1) ^ c;
      h2 = ((h2 << 5) + h2) ^ c;
      h3 = (h3 * 31 + c) | 0;
    }
    return [
      Math.abs(h1) % this.size,
      Math.abs(h2) % this.size,
      Math.abs(h3) % this.size,
    ];
  }
  add(str) { this._hashes(str).forEach(h => { this.bits[h] = 1; }); }
  has(str) { return this._hashes(str).every(h => this.bits[h] === 1); }
  reset() { this.bits.fill(0); }
}

// ── 3. TRIE (Prefix Tree) ───────────────────────────────────
// Used for: Search autocomplete — type "quan" → ["quantum","quanta"]
export class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
    this.count = 0; // frequency for ranking suggestions
  }
}

export class Trie {
  constructor() { this.root = new TrieNode(); }

  insert(word) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
      node.count++;
    }
    node.isEnd = true;
  }

  // Returns up to `limit` suggestions sorted by frequency
  suggest(prefix, limit = 8) {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }
    const results = [];
    this._dfs(node, prefix.toLowerCase(), results);
    // Sort by frequency descending, return top-limit
    results.sort((a, b) => b.count - a.count);
    return results.slice(0, limit).map(r => r.word);
  }

  _dfs(node, current, results) {
    if (node.isEnd) results.push({ word: current, count: node.count });
    for (const [ch, child] of Object.entries(node.children)) {
      this._dfs(child, current + ch, results);
    }
  }
}

// ── 4. LRU CACHE ────────────────────────────────────────────
// Used for: Client-side article cache with eviction of oldest entries
export class LRUCache {
  constructor(capacity = 200) {
    this.capacity = capacity;
    this.cache = new Map(); // Map preserves insertion order
  }
  get(key) {
    if (!this.cache.has(key)) return null;
    const val = this.cache.get(key);
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }
  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      // Evict least recently used (first item in Map)
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, value);
  }
  has(key) { return this.cache.has(key); }
  get size() { return this.cache.size; }
}

// ── 5. UNION-FIND (Disjoint Set Union) ──────────────────────
// Used for: Merging duplicate news stories from different sources
export class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.components = n;
  }
  find(x) {
    if (this.parent[x] !== x)
      this.parent[x] = this.find(this.parent[x]); // path compression
    return this.parent[x];
  }
  union(x, y) {
    const px = this.find(x), py = this.find(y);
    if (px === py) return false;
    // Union by rank
    if (this.rank[px] < this.rank[py]) this.parent[px] = py;
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
    else { this.parent[py] = px; this.rank[px]++; }
    this.components--;
    return true;
  }
  // Group indices into clusters
  getClusters(n) {
    const map = {};
    for (let i = 0; i < n; i++) {
      const root = this.find(i);
      if (!map[root]) map[root] = [];
      map[root].push(i);
    }
    return Object.values(map);
  }
}

// ── 6. GRAPH BFS — Topic Clustering ─────────────────────────
// Used for: Grouping articles about the same event into one story cluster
export function buildSimilarityGraph(articles, threshold = 0.35) {
  const n = articles.length;
  const adj = Array.from({ length: n }, () => []);

  // Compare every pair — O(n²) but n is small (max 60 articles)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (jaccardSimilarity(articles[i].title, articles[j].title) >= threshold) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }
  return adj;
}

export function bfsClusters(articles) {
  if (articles.length === 0) return [];
  const adj = buildSimilarityGraph(articles);
  const visited = new Array(articles.length).fill(false);
  const clusters = [];

  for (let start = 0; start < articles.length; start++) {
    if (visited[start]) continue;
    // BFS from this node
    const cluster = [];
    const queue = [start];
    visited[start] = true;
    while (queue.length > 0) {
      const node = queue.shift();
      cluster.push(articles[node]);
      for (const neighbor of adj[node]) {
        if (!visited[neighbor]) {
          visited[neighbor] = true;
          queue.push(neighbor);
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

// Jaccard similarity on word sets
function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));
}

const STOPWORDS = new Set([
  'the','and','for','are','but','not','you','all','can','had',
  'her','was','one','our','out','day','get','has','him','his',
  'how','man','new','now','old','see','two','way','who','boy',
  'did','its','let','put','say','she','too','use','that','with',
  'this','have','from','they','will','been','more','than','then',
  'when','what','says','says','just','over','also','into','after'
]);

// ── 7. KMP STRING SEARCH ────────────────────────────────────
// Used for: Fast keyword search in article titles O(n+m)
export function kmpSearch(text, pattern) {
  if (!pattern || pattern.length === 0) return true;
  const txt = text.toLowerCase();
  const pat = pattern.toLowerCase();
  const lps = buildLPS(pat);
  let i = 0, j = 0;
  while (i < txt.length) {
    if (txt[i] === pat[j]) { i++; j++; }
    if (j === pat.length) return true; // found
    else if (i < txt.length && txt[i] !== pat[j]) {
      if (j !== 0) j = lps[j - 1];
      else i++;
    }
  }
  return false;
}

function buildLPS(pattern) {
  const lps = new Array(pattern.length).fill(0);
  let len = 0, i = 1;
  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) { lps[i++] = ++len; }
    else if (len !== 0) { len = lps[len - 1]; }
    else { lps[i++] = 0; }
  }
  return lps;
}

// ── 8. TF-IDF SCORING ───────────────────────────────────────
// Used for: Finding truly unique and relevant articles
export function computeTFIDF(articles) {
  const N = articles.length;
  if (N === 0) return articles;

  // Build document frequency map
  const df = {};
  const termFreqs = articles.map(article => {
    const words = tokenize(article.title + ' ' + (article.snippet || ''));
    const tf = {};
    for (const w of words) {
      tf[w] = (tf[w] || 0) + 1;
      df[w] = (df[w] || new Set()).add(article.id || article.title);
    }
    return tf;
  });

  // Compute TF-IDF score per article
  return articles.map((article, idx) => {
    const tf = termFreqs[idx];
    let tfidfScore = 0;
    for (const [word, freq] of Object.entries(tf)) {
      const termTF = freq / (Object.keys(tf).length || 1);
      const docFreq = (df[word] ? df[word].size : 1);
      const idf = Math.log(N / docFreq + 1);
      tfidfScore += termTF * idf;
    }
    return { ...article, tfidfScore };
  });
}

// ── 9. QUICKSELECT (Top-K without full sort) ─────────────────
// Used for: Finding top-K articles in O(n) average time
export function quickselect(arr, k, compareFn = (a, b) => b.score - a.score) {
  if (k >= arr.length) return [...arr].sort(compareFn);
  const copy = [...arr];
  _quickselect(copy, 0, copy.length - 1, k, compareFn);
  return copy.slice(0, k).sort(compareFn);
}

function _quickselect(arr, left, right, k, compareFn) {
  if (left >= right) return;
  const pivotIdx = _partition(arr, left, right, compareFn);
  if (pivotIdx === k) return;
  else if (pivotIdx < k) _quickselect(arr, pivotIdx + 1, right, k, compareFn);
  else _quickselect(arr, left, pivotIdx - 1, k, compareFn);
}

function _partition(arr, left, right, compareFn) {
  const pivot = arr[right];
  let i = left;
  for (let j = left; j < right; j++) {
    if (compareFn(arr[j], pivot) <= 0) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }
  [arr[i], arr[right]] = [arr[right], arr[i]];
  return i;
}

// ── 10. MERGE SORT (for merging pre-sorted feeds) ───────────
// Used for: Merging 15 RSS feeds already sorted by date — O(n log n)
export function mergeSortedFeeds(feeds) {
  // Each feed is already sorted by date descending
  // Use a MinHeap to merge k sorted arrays — O(n log k)
  const heap = new MinHeap((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const iterators = feeds.map((feed, fi) => ({ feed, fi, idx: 0 }));

  // Seed heap with first item from each feed
  for (const iter of iterators) {
    if (iter.feed.length > 0) {
      heap.push({ item: iter.feed[0], iter });
    }
  }

  const merged = [];
  while (heap.size > 0) {
    const { item, iter } = heap.pop();
    merged.push(item);
    iter.idx++;
    if (iter.idx < iter.feed.length) {
      heap.push({ item: iter.feed[iter.idx], iter });
    }
  }
  return merged;
}

// ── 11. DP KNAPSACK — Feed Composition ──────────────────────
// Used for: Given N slots on screen, pick best mix of categories
// based on user's reading history weights
export function dpKnapsack(categories, slots, weights) {
  // categories: [{id, articles, value}]
  // slots: max articles to show total
  // weights: user preference weights per category
  const n = categories.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(slots + 1).fill(0));
  const sel = Array.from({ length: n + 1 }, () => new Array(slots + 1).fill(false));

  for (let i = 1; i <= n; i++) {
    const cat = categories[i - 1];
    const w = cat.articles.length > slots ? slots : cat.articles.length;
    const v = (cat.value || 1) * (weights[cat.id] || 1);
    for (let j = 0; j <= slots; j++) {
      if (w <= j && dp[i - 1][j - w] + v > dp[i - 1][j]) {
        dp[i][j] = dp[i - 1][j - w] + v;
        sel[i][j] = true;
      } else {
        dp[i][j] = dp[i - 1][j];
      }
    }
  }

  // Backtrack to find which categories were selected
  const selected = [];
  let j = slots;
  for (let i = n; i > 0; i--) {
    if (sel[i][j]) {
      selected.push(categories[i - 1]);
      j -= categories[i - 1].articles.length;
    }
  }
  return selected.reverse();
}

// ── 12. LEVENSHTEIN EDIT DISTANCE ───────────────────────────
// Used for: Fuzzy search — "quatum" → finds "quantum" articles
export function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function fuzzyMatch(query, text, threshold = 3) {
  const q = query.toLowerCase();
  const words = text.toLowerCase().split(/\s+/);
  return words.some(w => editDistance(q, w.slice(0, q.length + 2)) <= threshold);
}

// ── 13. SLIDING WINDOW — Time Filter ────────────────────────
// Used for: "Show articles from last N hours"
export function slidingWindowFilter(articles, hours = 24) {
  const cutoff = Date.now() - hours * 3600 * 1000;
  // Articles are sorted by date — binary search the cutoff O(log n)
  let lo = 0, hi = articles.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (new Date(articles[mid].pubDate).getTime() < cutoff) hi = mid;
    else lo = mid + 1;
  }
  return articles.slice(0, lo);
}

// ── 14. BINARY SEARCH — Time Range ──────────────────────────
// Used for: Jump to articles within a date range instantly O(log n)
export function binarySearchByDate(articles, targetDate) {
  let lo = 0, hi = articles.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const d = new Date(articles[mid].pubDate).getTime();
    if (d === targetDate) return mid;
    else if (d > targetDate) lo = mid + 1;
    else hi = mid - 1;
  }
  return lo;
}

// ── 15. SOURCE TRUST & SCORING ──────────────────────────────
const SOURCE_TRUST = {
  'Reuters': 10, 'AP News': 10, 'BBC World': 9, 'The Hindu': 8,
  'Nature News': 10, 'NASA News': 10, 'arXiv Physics': 9,
  'arXiv CS.AI': 9, 'arXiv Quantum': 9, 'Quanta Magazine': 9,
  'MIT Tech Review': 8, 'IEEE Spectrum': 8, 'Economic Times': 8,
  'Goldman Sachs': 9, 'Hedgeweek': 8, 'Financial Times': 9,
  'Mint': 7, 'TechCrunch': 7, 'Bloomberg': 9, 'WSJ': 9,
  'CERN News': 9, 'ESA News': 9, 'SpaceNews': 8,
};

const TRENDING_KW = [
  'india','breakthrough','launch','ai','quantum','satellite','electric',
  'discovery','record','first','new','isro','nasa','market','rate',
  'fund','investment','ipo','merger','acquisition','earnings','results',
];

export function scoreArticle(item) {
  const ageHours = (Date.now() - new Date(item.pubDate)) / 3600000;
  const recency = Math.max(0, 100 - ageHours * 1.8);
  const trust = SOURCE_TRUST[item.source] || 5;
  const titleLower = (item.title || '').toLowerCase();
  const keyword = TRENDING_KW.reduce((acc, kw) =>
    acc + (titleLower.includes(kw) ? 4 : 0), 0);
  const tfidf = item.tfidfScore ? item.tfidfScore * 10 : 0;
  return recency + trust * 3 + keyword + tfidf;
}

// ── MAIN RANKING PIPELINE ────────────────────────────────────
// Combines: TF-IDF → BloomFilter dedup → Quickselect top-K → scoring
export function rankArticles(rawItems, k = 50) {
  if (!rawItems || rawItems.length === 0) return [];

  // Step 1: TF-IDF scoring
  const withTFIDF = computeTFIDF(rawItems);

  // Step 2: Bloom filter deduplication
  const bloom = new BloomFilter(8192);
  const deduped = [];
  for (const item of withTFIDF) {
    const key = (item.title || '').slice(0, 50).toLowerCase().replace(/\s+/g, '');
    if (!bloom.has(key)) {
      bloom.add(key);
      deduped.push({ ...item, score: scoreArticle(item) });
    }
  }

  // Step 3: Quickselect top-K (faster than full sort for large arrays)
  if (deduped.length <= k) return deduped.sort((a, b) => b.score - a.score);
  return quickselect(deduped, k);
}

// ── 16. HASHMAP FREQUENCY COUNT — Trending Keywords ─────────
// Used for: "Trending Now" widget — count keyword frequency across articles
const TREND_STOPWORDS = new Set([
  'the','and','for','are','but','not','you','all','can','had','was','one',
  'our','out','get','has','how','new','now','see','say','she','too','use',
  'that','with','this','have','from','they','will','been','more','than',
  'then','when','what','also','into','after','said','just','over','its',
  'who','why','where','their','about','were','your','some','these','those',
]);

export function extractTrendingKeywords(articles, topN = 10) {
  const freq = new Map(); // HashMap: word -> count
  for (const article of articles) {
    const words = (article.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !TREND_STOPWORDS.has(w));

    const seenInThisArticle = new Set();
    for (const w of words) {
      if (seenInThisArticle.has(w)) continue; // count each word once per article
      seenInThisArticle.add(w);
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }

  // Convert to array and sort by frequency descending — O(n log n)
  return [...freq.entries()]
    .filter(([, count]) => count >= 2) // only words appearing in 2+ articles
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

// ── 17. UNION-FIND FOR COMPANY/TICKER DEDUP ─────────────────
// Used for: merging share classes of same company (e.g. GOOG/GOOGL, BRK-A/BRK-B)
const COMPANY_ALIASES = {
  'GOOG': 'GOOGL', 'BRK-A': 'BRK-B',
};

export function dedupeCompaniesUnionFind(companies) {
  const n = companies.length;
  const uf = new UnionFind(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = companies[i].symbol;
      const b = companies[j].symbol;
      const aAlias = COMPANY_ALIASES[a] || a;
      const bAlias = COMPANY_ALIASES[b] || b;
      // Same canonical company -> union
      if (aAlias === bAlias && a !== b) {
        uf.union(i, j);
      }
      // Same name prefix (first 4 chars) heuristic for share classes
      const nameA = (companies[i].name || '').toLowerCase().slice(0, 6);
      const nameB = (companies[j].name || '').toLowerCase().slice(0, 6);
      if (nameA && nameA === nameB) uf.union(i, j);
    }
  }

  const seen = new Set();
  return companies.filter((_, i) => {
    const root = uf.find(i);
    if (seen.has(root)) return false;
    seen.add(root);
    return true;
  });
}
