import axios from 'axios';

const cache = {};
const CACHE_TTL = 10 * 60 * 1000;

const ARXIV_CATS = {
  all: 'cs.AI+OR+cat:cs.LG+OR+cat:physics+OR+cat:astro-ph+OR+cat:quant-ph',
  ai: 'cs.AI+OR+cat:cs.LG+OR+cat:cs.CV+OR+cat:cs.CL',
  physics: 'physics+OR+cat:hep-ph+OR+cat:cond-mat',
  quantum: 'quant-ph',
  astro: 'astro-ph',
  math: 'math',
  finance: 'q-fin',
};

const AX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
  'Accept': 'application/atom+xml,application/xml,text/xml,*/*',
};

function buildArxivQuery(query, cat) {
  const catStr = ARXIV_CATS[cat] || ARXIV_CATS['all'];
  if (query) {
    // Combine free-text query with category filter when both present
    if (cat && cat !== 'all') {
      return `search_query=(${encodeURIComponent('all:' + query)})+AND+(cat:${catStr})&sortBy=relevance&sortOrder=descending`;
    }
    return `search_query=all:${encodeURIComponent(query)}&sortBy=submittedDate&sortOrder=descending`;
  }
  return `search_query=cat:${catStr}&sortBy=submittedDate&sortOrder=descending`;
}

async function fetchArxiv(query, cat = 'all', max = 25) {
  const searchQ = buildArxivQuery(query, cat);
  const url = `https://export.arxiv.org/api/query?${searchQ}&start=0&max_results=${max}`;

  const res = await axios.get(url, { timeout: 12000, headers: AX_HEADERS });
  const xml = res.data;
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];

  return entries.map(entry => {
    const get = tag => {
      const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
    };
    const rawId = get('id');
    const id = rawId.split('/abs/')[1] || rawId;
    const authors = (entry.match(/<name>([\s\S]*?)<\/name>/g) || [])
      .map(a => a.replace(/<[^>]+>/g, '').trim()).slice(0, 3).join(', ');
    return {
      id,
      title: get('title').replace(/\s+/g, ' ').trim(),
      authors: authors + ((entry.match(/<name>/g) || []).length > 3 ? ' et al.' : ''),
      abstract: get('summary').replace(/\s+/g, ' ').trim().slice(0, 350) + '...',
      published: get('published').slice(0, 10),
      link: `https://arxiv.org/abs/${id}`,
      pdfLink: `https://arxiv.org/pdf/${id}`,
      source: 'arXiv',
    };
  });
}

async function fetchSemanticScholar(query, limit = 15) {
  if (!query) return [];
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,year,abstract,openAccessPdf,publicationDate`;
  const res = await axios.get(url, {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' },
  });
  return (res.data.data || []).map(p => ({
    id: p.paperId,
    title: p.title || '',
    authors: (p.authors || []).slice(0, 3).map(a => a.name).join(', '),
    abstract: (p.abstract || 'No abstract available.').slice(0, 350) + (p.abstract && p.abstract.length > 350 ? '...' : ''),
    published: p.publicationDate || String(p.year || ''),
    link: `https://www.semanticscholar.org/paper/${p.paperId}`,
    pdfLink: p.openAccessPdf?.url || null,
    source: 'Semantic Scholar',
  }));
}

export default async function handler(req, res) {
  const { q = '', cat = 'all' } = req.query;
  const cacheKey = `${q}-${cat}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].ts < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache[cacheKey].data);
  }

  let papers = [];
  let errors = [];

  // 1) Try arXiv (with combined category+text query if both given)
  try {
    const ar = await fetchArxiv(q, cat, 20);
    papers.push(...ar);
  } catch (e) {
    errors.push(`arxiv:${e.message}`);
    // Retry with plain text-only query (drop category restriction) if first attempt failed and query exists
    if (q) {
      try {
        const ar2 = await fetchArxiv(q, 'all', 15);
        // Re-run pure text search without category AND clause
        const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&sortBy=relevance&sortOrder=descending&start=0&max_results=15`;
        const r = await axios.get(url, { timeout: 12000, headers: AX_HEADERS });
        const entries = r.data.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
        const fallback = entries.map(entry => {
          const get = tag => {
            const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
            return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
          };
          const rawId = get('id');
          const id = rawId.split('/abs/')[1] || rawId;
          const authors = (entry.match(/<name>([\s\S]*?)<\/name>/g) || [])
            .map(a => a.replace(/<[^>]+>/g, '').trim()).slice(0, 3).join(', ');
          return {
            id, title: get('title').replace(/\s+/g, ' ').trim(),
            authors: authors + ((entry.match(/<name>/g) || []).length > 3 ? ' et al.' : ''),
            abstract: get('summary').replace(/\s+/g, ' ').trim().slice(0, 350) + '...',
            published: get('published').slice(0, 10),
            link: `https://arxiv.org/abs/${id}`, pdfLink: `https://arxiv.org/pdf/${id}`, source: 'arXiv',
          };
        });
        papers.push(...fallback);
      } catch (e2) { errors.push(`arxiv-fallback:${e2.message}`); }
    }
  }

  // 2) Semantic Scholar (only when there's a free-text query)
  if (q) {
    try {
      const ss = await fetchSemanticScholar(q, 15);
      papers.push(...ss);
    } catch (e) { errors.push(`s2:${e.message}`); }
  }

  // Deduplicate by title prefix
  const seen = new Set();
  papers = papers.filter(p => {
    const k = (p.title || '').slice(0, 50).toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const data = { papers, total: papers.length, updatedAt: new Date().toISOString(), errors: errors.length ? errors : undefined };
  cache[cacheKey] = { data, ts: now };
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
  return res.status(200).json(data);
}
