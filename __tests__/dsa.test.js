/**
 * PankuWire — DSA Algorithm Unit Tests
 * Tests every actively-used algorithm in lib/dsa.js
 */

import {
  MinHeap, BloomFilter, Trie, LRUCache, UnionFind,
  kmpSearch, fuzzyMatch, editDistance,
  slidingWindowFilter, computeTFIDF, quickselect,
  rankArticles, extractTrendingKeywords, dedupeCompaniesUnionFind,
} from '../lib/dsa';

// ── MinHeap ────────────────────────────────────────────────
describe('MinHeap', () => {
  test('push and pop maintains min-heap order', () => {
    const heap = new MinHeap((a, b) => a.score - b.score);
    heap.push({ score: 5 });
    heap.push({ score: 1 });
    heap.push({ score: 3 });
    expect(heap.pop().score).toBe(1);
    expect(heap.pop().score).toBe(3);
    expect(heap.pop().score).toBe(5);
  });

  test('peek returns min without removing', () => {
    const heap = new MinHeap((a, b) => a.score - b.score);
    heap.push({ score: 10 });
    heap.push({ score: 2 });
    expect(heap.peek().score).toBe(2);
    expect(heap.size).toBe(2);
  });

  test('size tracks correctly', () => {
    const heap = new MinHeap((a, b) => a.score - b.score);
    heap.push({ score: 4 }); heap.push({ score: 2 });
    expect(heap.size).toBe(2);
    heap.pop();
    expect(heap.size).toBe(1);
  });

  test('pop from empty heap returns null', () => {
    const heap = new MinHeap((a, b) => a.score - b.score);
    expect(heap.pop()).toBeNull();
  });

  test('extractAll returns items in descending order (highest score first)', () => {
    const heap = new MinHeap((a, b) => a.score - b.score);
    [5, 1, 4, 2, 3].forEach(s => heap.push({ score: s }));
    const all = heap.extractAll().map(a => a.score);
    expect(all).toEqual([5, 4, 3, 2, 1]);
  });
});

// ── BloomFilter ────────────────────────────────────────────
describe('BloomFilter', () => {
  test('has() returns true for added items', () => {
    const bf = new BloomFilter(1000, 3);
    bf.add('hello world');
    bf.add('quantum computing');
    expect(bf.has('hello world')).toBe(true);
    expect(bf.has('quantum computing')).toBe(true);
  });

  test('has() returns false for items not added', () => {
    const bf = new BloomFilter(1000, 3);
    bf.add('existing article title');
    expect(bf.has('completely different string xyz')).toBe(false);
  });

  test('handles empty string', () => {
    const bf = new BloomFilter(500, 2);
    bf.add('');
    expect(bf.has('')).toBe(true);
  });

  test('multiple items can be added without collision', () => {
    const bf = new BloomFilter(2000, 4);
    const items = ['nasa mars', 'spacex falcon', 'quantum bit', 'ai model', 'nifty 50'];
    items.forEach(i => bf.add(i));
    items.forEach(i => expect(bf.has(i)).toBe(true));
  });
});

// ── Trie ───────────────────────────────────────────────────
describe('Trie', () => {
  test('suggest returns words with given prefix', () => {
    const trie = new Trie();
    ['quantum', 'quanta', 'quarks', 'quality'].forEach(w => trie.insert(w));
    const suggestions = trie.suggest('qua', 10);
    expect(suggestions).toContain('quantum');
    expect(suggestions).toContain('quanta');
    expect(suggestions).toContain('quality');
  });

  test('suggest returns empty array for unknown prefix', () => {
    const trie = new Trie();
    trie.insert('hello');
    expect(trie.suggest('xyz', 5)).toEqual([]);
  });

  test('suggest respects limit', () => {
    const trie = new Trie();
    ['alpha', 'also', 'alter', 'algorithm', 'aligned'].forEach(w => trie.insert(w));
    const suggestions = trie.suggest('al', 2);
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });

  test('insert and suggest exact match plus extensions', () => {
    const trie = new Trie();
    trie.insert('space');
    trie.insert('spacex');
    const suggestions = trie.suggest('space', 5);
    expect(suggestions).toContain('space');
    expect(suggestions).toContain('spacex');
  });
});

// ── LRUCache ───────────────────────────────────────────────
describe('LRUCache', () => {
  test('stores and retrieves values', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });

  test('evicts LRU when at capacity', () => {
    const cache = new LRUCache(2);
    cache.set('x', 10);
    cache.set('y', 20);
    cache.set('z', 30); // evicts 'x'
    expect(cache.has('x')).toBe(false);
    expect(cache.has('y')).toBe(true);
    expect(cache.has('z')).toBe(true);
  });

  test('accessing item refreshes recency', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // refresh 'a'
    cache.set('c', 3); // evicts 'b', not 'a'
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  test('has() returns false for missing keys', () => {
    const cache = new LRUCache(5);
    expect(cache.has('missing')).toBe(false);
  });

  test('get() returns null for missing keys', () => {
    const cache = new LRUCache(5);
    expect(cache.get('nothere')).toBeNull();
  });
});

// ── UnionFind ──────────────────────────────────────────────
describe('UnionFind', () => {
  test('each element is its own root initially', () => {
    const uf = new UnionFind(5);
    for (let i = 0; i < 5; i++) expect(uf.find(i)).toBe(i);
  });

  test('union connects two elements (same root)', () => {
    const uf = new UnionFind(4);
    uf.union(0, 1);
    expect(uf.find(0)).toBe(uf.find(1));
  });

  test('unioned elements share root, unrelated ones do not', () => {
    const uf = new UnionFind(5);
    uf.union(0, 1);
    uf.union(2, 3);
    expect(uf.find(0)).toBe(uf.find(1)); // connected
    expect(uf.find(2)).toBe(uf.find(3)); // connected
    expect(uf.find(0)).not.toBe(uf.find(2)); // not connected
    expect(uf.find(0)).not.toBe(uf.find(4)); // not connected
  });

  test('transitive connections work', () => {
    const uf = new UnionFind(5);
    uf.union(0, 1);
    uf.union(1, 2);
    expect(uf.find(0)).toBe(uf.find(2)); // transitively connected
  });

  test('getClusters groups indices correctly', () => {
    const uf = new UnionFind(4);
    uf.union(0, 1);
    uf.union(2, 3);
    const clusters = uf.getClusters(4);
    expect(clusters.length).toBe(2);
    const sizes = clusters.map(c => c.length).sort();
    expect(sizes).toEqual([2, 2]);
  });
});

// ── kmpSearch ──────────────────────────────────────────────
describe('kmpSearch', () => {
  test('finds pattern in text', () => {
    expect(kmpSearch('NASA announces Mars mission', 'mars')).toBe(true);
    expect(kmpSearch('SpaceX launches Falcon 9', 'falcon')).toBe(true);
  });

  test('returns false when pattern absent', () => {
    expect(kmpSearch('Quantum computing breakthrough', 'bitcoin')).toBe(false);
  });

  test('is case insensitive', () => {
    expect(kmpSearch('NVIDIA announces new GPU', 'nvidia')).toBe(true);
    expect(kmpSearch('india gdp growth', 'GDP')).toBe(true);
  });

  test('empty pattern returns true', () => {
    expect(kmpSearch('any text', '')).toBe(true);
  });

  test('empty text returns false', () => {
    expect(kmpSearch('', 'pattern')).toBe(false);
  });

  test('pattern longer than text returns false', () => {
    expect(kmpSearch('hi', 'hello world long pattern')).toBe(false);
  });
});

// ── editDistance ───────────────────────────────────────────
describe('editDistance', () => {
  test('identical strings have distance 0', () => {
    expect(editDistance('quantum', 'quantum')).toBe(0);
  });

  test('single substitution', () => {
    expect(editDistance('cat', 'bat')).toBe(1);
  });

  test('insertion/deletion', () => {
    expect(editDistance('quatum', 'quantum')).toBe(1); // missing 'n'
    expect(editDistance('colour', 'color')).toBe(1);   // extra 'u'
  });

  test('empty string to word equals word length', () => {
    expect(editDistance('', 'hello')).toBe(5);
  });

  test('completely different strings', () => {
    expect(editDistance('abc', 'xyz')).toBe(3);
  });
});

// ── fuzzyMatch ─────────────────────────────────────────────
describe('fuzzyMatch', () => {
  test('matches a typo within default threshold', () => {
    expect(fuzzyMatch('quatum', 'quantum physics discovery')).toBe(true);
    expect(fuzzyMatch('spacx', 'spacex launches satellite')).toBe(true);
  });

  test('rejects completely unrelated words', () => {
    expect(fuzzyMatch('bitcoin', 'quantum entanglement research paper')).toBe(false);
  });

  test('exact word always matches', () => {
    expect(fuzzyMatch('nasa', 'nasa announces moon mission update')).toBe(true);
  });
});

// ── slidingWindowFilter ────────────────────────────────────
describe('slidingWindowFilter', () => {
  function makeArticle(hoursAgo, title) {
    return { title, pubDate: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString() };
  }

  test('keeps articles within window, drops old ones', () => {
    const articles = [
      makeArticle(1,  'Recent'),
      makeArticle(5,  'Somewhat recent'),
      makeArticle(25, 'Old article'),
    ];
    const filtered = slidingWindowFilter(articles, 24);
    expect(filtered.length).toBe(2);
    expect(filtered.map(a => a.title)).toContain('Recent');
    expect(filtered.map(a => a.title)).not.toContain('Old article');
  });

  test('returns empty when all too old', () => {
    const articles = [makeArticle(50, 'Very old'), makeArticle(100, 'Ancient')];
    expect(slidingWindowFilter(articles, 6)).toEqual([]);
  });

  test('returns all when window is Infinity', () => {
    const articles = [makeArticle(1, 'a'), makeArticle(10, 'b'), makeArticle(200, 'c')];
    expect(slidingWindowFilter(articles, Infinity).length).toBe(3);
  });
});

// ── extractTrendingKeywords ────────────────────────────────
describe('extractTrendingKeywords', () => {
  test('finds words appearing in multiple articles', () => {
    const articles = [
      { title: 'NASA launches new space mission to moon' },
      { title: 'NASA announces space station upgrade plan' },
      { title: 'SpaceX launches satellite into space orbit' },
    ];
    const trending = extractTrendingKeywords(articles, 5);
    const words = trending.map(t => t.word);
    expect(words).toContain('space');
    expect(words).toContain('launches');
  });

  test('filters stopwords', () => {
    const articles = [
      { title: 'the quick brown fox jumps' },
      { title: 'the slow brown dog walks' },
    ];
    const words = extractTrendingKeywords(articles, 10).map(t => t.word);
    expect(words).not.toContain('the');
    expect(words).not.toContain('and');
  });

  test('counts each word once per article', () => {
    const articles = [
      { title: 'quantum quantum quantum physics' }, // counts 1x
      { title: 'quantum computing research' },      // counts 1x
    ];
    const trending = extractTrendingKeywords(articles, 5);
    const q = trending.find(t => t.word === 'quantum');
    expect(q?.count).toBe(2); // in 2 articles, not 4
  });

  test('returns at most topN results', () => {
    const articles = Array.from({ length: 20 }, (_, i) => ({
      title: `article keyword${i} another common word shared`,
    }));
    const trending = extractTrendingKeywords(articles, 3);
    expect(trending.length).toBeLessThanOrEqual(3);
  });

  test('returns empty array for empty input', () => {
    expect(extractTrendingKeywords([], 5)).toEqual([]);
  });
});

// ── dedupeCompaniesUnionFind ───────────────────────────────
describe('dedupeCompaniesUnionFind', () => {
  test('merges GOOG/GOOGL into one entry', () => {
    const companies = [
      { symbol: 'GOOG',  name: 'Alphabet Inc Class C', price: 180 },
      { symbol: 'GOOGL', name: 'Alphabet Inc Class A', price: 179 },
      { symbol: 'AAPL',  name: 'Apple Inc',            price: 230 },
    ];
    const deduped = dedupeCompaniesUnionFind(companies);
    expect(deduped.length).toBe(2);
    expect(deduped.map(c => c.symbol)).toContain('AAPL');
  });

  test('keeps unrelated companies distinct', () => {
    const companies = [
      { symbol: 'MSFT', name: 'Microsoft', price: 400 },
      { symbol: 'NVDA', name: 'NVIDIA',    price: 900 },
      { symbol: 'TSLA', name: 'Tesla',     price: 250 },
    ];
    expect(dedupeCompaniesUnionFind(companies).length).toBe(3);
  });

  test('handles empty array', () => {
    expect(dedupeCompaniesUnionFind([])).toEqual([]);
  });

  test('single item passes through unchanged', () => {
    const companies = [{ symbol: 'AMZN', name: 'Amazon', price: 200 }];
    expect(dedupeCompaniesUnionFind(companies).length).toBe(1);
  });
});

// ── rankArticles integration ───────────────────────────────
describe('rankArticles', () => {
  function makeArticle(title, hoursAgo = 1, source = 'Reuters') {
    return {
      id: `${title.slice(0,5)}-${hoursAgo}`,
      title, source,
      pubDate: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
      snippet: title,
      link: 'https://example.com',
    };
  }

  test('returns at most k articles', () => {
    const articles = Array.from({ length: 100 }, (_, i) =>
      makeArticle(`Article about topic number ${i} today`, i % 10)
    );
    const ranked = rankArticles(articles, 20);
    expect(ranked.length).toBeLessThanOrEqual(20);
  });

  test('returns all when fewer than k', () => {
    const articles = [
      makeArticle('SpaceX launches Falcon 9 rocket'),
      makeArticle('NASA moon mission update report'),
    ];
    expect(rankArticles(articles, 10).length).toBe(2);
  });

  test('returns empty for empty input', () => {
    expect(rankArticles([], 10)).toEqual([]);
  });

  test('each ranked article has a numeric score property', () => {
    const articles = [
      makeArticle('Quantum computing breakthrough announced today'),
      makeArticle('New AI model breaks records at Stanford university'),
    ];
    rankArticles(articles, 5).forEach(a => {
      expect(typeof a.score).toBe('number');
    });
  });

  test('handles single article', () => {
    const articles = [makeArticle('Single article test case here')];
    const ranked = rankArticles(articles, 5);
    expect(ranked.length).toBe(1);
    expect(typeof ranked[0].score).toBe('number');
  });
});
