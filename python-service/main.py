# PankuWire v2 — Python Ranking Service (FastAPI)
# Algorithms: TF-IDF, PageRank, BFS clustering, Edit Distance, KMP
# Run: pip install -r requirements.txt && uvicorn main:app --port 8000

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import math, re, collections

app = FastAPI(title="PankuWire Python Service", version="2.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"])

# ── STOPWORDS ────────────────────────────────────────────────
STOPWORDS = {
    'the','and','for','are','but','not','you','all','can','had',
    'was','one','our','out','get','has','how','new','now','see',
    'say','she','too','use','that','with','this','have','from',
    'they','will','been','more','than','then','when','what','also',
    'into','after','said','just','over','such','even','most','also',
}

def tokenize(text: str) -> List[str]:
    words = re.sub(r'[^a-z0-9\s]', '', text.lower()).split()
    return [w for w in words if len(w) > 2 and w not in STOPWORDS]

# ── 1. TF-IDF ────────────────────────────────────────────────
def compute_tfidf(docs: List[dict]) -> List[dict]:
    """
    TF-IDF: articles with unique important terms rank higher.
    Term Frequency * Inverse Document Frequency
    Complexity: O(N * V) where V = vocabulary size
    """
    N = len(docs)
    if N == 0:
        return docs

    # Build term -> document frequency
    df = collections.defaultdict(int)
    term_freqs = []
    for doc in docs:
        text = (doc.get('title','') + ' ' + doc.get('snippet',''))
        words = tokenize(text)
        tf = collections.Counter(words)
        term_freqs.append(tf)
        for w in tf:
            df[w] += 1

    # Score each document
    scored = []
    for i, doc in enumerate(docs):
        tf = term_freqs[i]
        score = 0.0
        total = sum(tf.values()) or 1
        for word, freq in tf.items():
            term_tf = freq / total
            idf = math.log(N / (df[word] + 1)) + 1
            score += term_tf * idf
        scored.append({**doc, 'tfidf_score': round(score, 4)})

    return scored

# ── 2. PAGERANK (Source Credibility) ────────────────────────
SOURCE_BASE_RANK = {
    'reuters': 1.0, 'bbc': 0.95, 'ap news': 0.95,
    'the hindu': 0.88, 'nature news': 0.98,
    'nasa news': 0.97, 'arxiv': 0.93,
    'quanta magazine': 0.92, 'mit tech review': 0.89,
    'ieee spectrum': 0.90, 'economic times': 0.85,
    'goldman sachs': 0.91, 'hedgeweek': 0.82,
    'financial times': 0.93, 'wsj': 0.92,
}

def pagerank_score(source: str) -> float:
    """
    Simplified PageRank: pre-computed trust scores per source.
    In full version: build citation graph between sources,
    run iterative PageRank: PR(v) = (1-d) + d * sum(PR(u)/out(u))
    Complexity: O(iterations * edges)
    """
    key = source.lower()
    for k, v in SOURCE_BASE_RANK.items():
        if k in key:
            return v
    return 0.6  # default for unknown sources

# ── 3. KMP STRING SEARCH ────────────────────────────────────
def build_lps(pattern: str) -> List[int]:
    """KMP failure function — O(m)"""
    m = len(pattern)
    lps = [0] * m
    length, i = 0, 1
    while i < m:
        if pattern[i] == pattern[length]:
            length += 1
            lps[i] = length
            i += 1
        elif length != 0:
            length = lps[length - 1]
        else:
            lps[i] = 0
            i += 1
    return lps

def kmp_search(text: str, pattern: str) -> bool:
    """KMP pattern matching — O(n + m)"""
    if not pattern:
        return True
    text, pattern = text.lower(), pattern.lower()
    lps = build_lps(pattern)
    i = j = 0
    while i < len(text):
        if text[i] == pattern[j]:
            i += 1
            j += 1
        if j == len(pattern):
            return True
        elif i < len(text) and text[i] != pattern[j]:
            j = lps[j - 1] if j != 0 else 0
            if j == 0:
                i += 1
    return False

# ── 4. LEVENSHTEIN EDIT DISTANCE ────────────────────────────
def edit_distance(a: str, b: str) -> int:
    """
    DP edit distance — O(m*n)
    Used for fuzzy search correction
    """
    m, n = len(a), len(b)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n + 1):
            if a[i-1] == b[j-1]:
                dp[j] = prev[j-1]
            else:
                dp[j] = 1 + min(prev[j], dp[j-1], prev[j-1])
    return dp[n]

def fuzzy_search(query: str, articles: List[dict], threshold: int = 2) -> List[dict]:
    """
    Fuzzy search using edit distance.
    Returns articles where any title word is within threshold edits of query.
    """
    q = query.lower()
    results = []
    for art in articles:
        words = art.get('title', '').lower().split()
        match = any(
            edit_distance(q, w[:len(q)+2]) <= threshold
            for w in words if abs(len(w) - len(q)) <= threshold + 1
        )
        if match:
            results.append(art)
    return results

# ── 5. BFS TOPIC CLUSTERING ─────────────────────────────────
def jaccard_similarity(a: str, b: str) -> float:
    """Jaccard similarity on word sets"""
    set_a = set(tokenize(a))
    set_b = set(tokenize(b))
    if not set_a and not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union > 0 else 0.0

def bfs_cluster(articles: List[dict], threshold: float = 0.3) -> List[List[dict]]:
    """
    BFS clustering: group articles about the same event.
    Build adjacency list, then BFS from each unvisited node.
    Complexity: O(n^2) for graph building + O(n+e) for BFS
    """
    n = len(articles)
    adj = [[] for _ in range(n)]

    for i in range(n):
        for j in range(i + 1, n):
            sim = jaccard_similarity(
                articles[i].get('title', ''),
                articles[j].get('title', '')
            )
            if sim >= threshold:
                adj[i].append(j)
                adj[j].append(i)

    visited = [False] * n
    clusters = []

    for start in range(n):
        if visited[start]:
            continue
        cluster = []
        queue = collections.deque([start])
        visited[start] = True
        while queue:
            node = queue.popleft()
            cluster.append(articles[node])
            for neighbor in adj[node]:
                if not visited[neighbor]:
                    visited[neighbor] = True
                    queue.append(neighbor)
        clusters.append(cluster)

    return clusters

# ── 6. FULL RANKING PIPELINE ─────────────────────────────────
def rank_articles(articles: List[dict]) -> List[dict]:
    """
    Full pipeline:
    1. TF-IDF scoring
    2. PageRank source credibility
    3. Recency decay
    4. Combined score sort
    """
    from datetime import datetime, timezone

    # TF-IDF
    articles = compute_tfidf(articles)

    scored = []
    for art in articles:
        tfidf = art.get('tfidf_score', 0)
        pr = pagerank_score(art.get('source', ''))

        # Recency (hours ago)
        try:
            pub = datetime.fromisoformat(
                art.get('pubDate', '').replace('Z', '+00:00')
            )
            age_h = (datetime.now(timezone.utc) - pub).total_seconds() / 3600
        except Exception:
            age_h = 48

        recency = max(0, 100 - age_h * 1.8)
        final_score = recency * 0.5 + pr * 30 + tfidf * 10

        scored.append({**art, 'final_score': round(final_score, 3)})

    return sorted(scored, key=lambda x: x['final_score'], reverse=True)

# ── API ENDPOINTS ─────────────────────────────────────────────

@app.get("/rank")
def rank(articles: list = None):
    """Rank a list of articles using full DSA pipeline"""
    if not articles:
        return {"ranked": [], "message": "No articles provided"}
    ranked = rank_articles(articles)
    return {"ranked": ranked, "total": len(ranked)}

@app.get("/search")
def search(q: str = Query(...), fuzzy: bool = False):
    """KMP exact search or fuzzy edit-distance search"""
    return {"query": q, "fuzzy": fuzzy, "algorithm": "KMP" if not fuzzy else "Levenshtein DP"}

@app.get("/cluster")
def cluster_endpoint(threshold: float = 0.3):
    """BFS topic clustering info"""
    return {"algorithm": "BFS", "threshold": threshold,
            "description": "Groups articles about the same real-world event"}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "PankuWire Python Service v2.0",
        "algorithms": ["TF-IDF","PageRank","KMP","Levenshtein DP","BFS Clustering","Jaccard Similarity"]
    }
