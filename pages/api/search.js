
// Searches across all 11 news categories simultaneously using cached
// article data (MongoDB L2 if available, in-memory L1 otherwise).
// Returns top results per category grouped by section.
// Uses the same KMP + fuzzy matching pipeline as per-category search.

import { readCache } from '../../lib/articleCache';

const CATEGORIES = [
  'india', 'tech', 'ai', 'business', 'science',
  'space', 'physics', 'quantum', 'ev', 'geo',
];

const CATEGORY_LABELS = {
  india: 'India', tech: 'Tech', ai: 'AI & ML',
  business: 'Business', science: 'Science', space: 'Space',
  physics: 'Physics', quantum: 'Quantum', ev: 'EV & Auto', geo: 'Geopolitics',
};

// In-memory fallback (populated by /api/news calls)
const memCache = {};
export function updateMemCache(category, data) {
  memCache[category] = data;
}

// KMP search — same as lib/dsa.js but self-contained for API-side use
function kmpSearch(text, pattern) {
  if (!text || !pattern) return false;
  const t = text.toLowerCase();
  const p = pattern.toLowerCase();
  if (p.length === 0) return true;
  const lps = Array(p.length).fill(0);
  let len = 0, i = 1;
  while (i < p.length) {
    if (p[i] === p[len]) { lps[i++] = ++len; }
    else if (len) { len = lps[len - 1]; }
    else { lps[i++] = 0; }
  }
  let j = 0; i = 0;
  while (i < t.length) {
    if (t[i] === p[j]) { i++; j++; }
    if (j === p.length) return true;
    else if (i < t.length && t[i] !== p[j]) {
      j ? (j = lps[j - 1]) : i++;
    }
  }
  return false;
}

// Levenshtein edit distance for fuzzy matching
function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function fuzzyMatch(query, text, threshold = 3) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  const words = t.split(/\s+/);
  return words.some(w => w.length >= q.length - 1 && editDistance(q, w.slice(0, q.length + 2)) <= threshold);
}

function scoreMatch(query, article) {
  const title = (article.title || '').toLowerCase();
  const q = query.toLowerCase();
  // Exact phrase in title = highest score
  if (title.includes(q)) return 100 + (article.score || 0);
  // All query words present = high score
  const words = q.split(/\s+/).filter(w => w.length > 2);
  const allWords = words.length > 0 && words.every(w => title.includes(w));
  if (allWords) return 70 + (article.score || 0);
  // KMP hit = medium score
  if (kmpSearch(title, q)) return 50 + (article.score || 0);
  // Fuzzy match = lower score
  if (q.length >= 4 && fuzzyMatch(q, title)) return 20 + (article.score || 0);
  return 0;
}

export default async function handler(req, res) {
  const { q = '', limit = 5 } = req.query;
  const query = q.trim();

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters', results: [] });
  }

  const perCategoryLimit = Math.min(parseInt(limit) || 5, 10);

  // Fetch all categories from cache in parallel
  const cacheResults = await Promise.allSettled(
    CATEGORIES.map(async (cat) => {
      // Try MongoDB L2 first, fall back to in-memory L1
      const mongoData = await readCache(cat);
      const data = mongoData || memCache[cat];
      return { category: cat, items: data?.items || [] };
    })
  );

  const results = [];
  let totalMatched = 0;
  let totalSearched = 0;

  for (const r of cacheResults) {
    if (r.status !== 'fulfilled') continue;
    const { category, items } = r.value;
    totalSearched += items.length;

    const scored = items
      .map(article => ({ ...article, matchScore: scoreMatch(query, article) }))
      .filter(a => a.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, perCategoryLimit);

    if (scored.length > 0) {
      totalMatched += scored.length;
      results.push({
        category,
        label: CATEGORY_LABELS[category] || category,
        count: scored.length,
        articles: scored,
      });
    }
  }

  // Sort sections by best match score in each section
  results.sort((a, b) =>
    (b.articles[0]?.matchScore || 0) - (a.articles[0]?.matchScore || 0)
  );

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    query,
    totalMatched,
    totalSearched,
    sectionsFound: results.length,
    results,
  });
}
