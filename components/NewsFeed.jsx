import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  rankArticles, Trie, LRUCache, bfsClusters,
  kmpSearch, fuzzyMatch, slidingWindowFilter, extractTrendingKeywords
} from '../lib/dsa';
import { isBookmarked, toggleBookmark } from '../lib/bookmarks';

const articleCache = new LRUCache(300);
const searchTrie = new Trie();

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const TIME_FILTERS = [
  { label: 'ALL TIME', hours: Infinity },
  { label: '6H', hours: 6 },
  { label: '24H', hours: 24 },
  { label: '48H', hours: 48 },
];

function BookmarkStar({ article }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(isBookmarked(article.id)); }, [article.id]);
  return (
    <button
      className={`bookmark-btn ${saved ? 'active' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(article); setSaved(!saved); }}
      title={saved ? 'Remove bookmark' : 'Save for later'}
      aria-label="bookmark"
    >
      {saved ? '\u2605' : '\u2606'}
    </button>
  );
}

export default function NewsFeed({ category }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [timeFilter, setTimeFilter] = useState(Infinity);
  const [clusterMode, setClusterMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [dsaInfo, setDsaInfo] = useState({});
  const searchRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cacheKey = `news-${category}`;
      let items;
      if (articleCache.has(cacheKey)) {
        items = articleCache.get(cacheKey);
      } else {
        const res = await fetch(`/api/news?category=${category}`);
        const json = await res.json();
        items = json.items || [];
        articleCache.set(cacheKey, items);
      }

      for (const item of items) {
        const words = (item.title || '').toLowerCase().split(/\s+/);
        for (const w of words) if (w.length > 3) searchTrie.insert(w);
      }

      const t0 = performance.now();
      const ranked = rankArticles(items, 60);
      const elapsed = (performance.now() - t0).toFixed(1);

      setArticles(ranked);
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      setDsaInfo({ total: items.length, ranked: ranked.length, elapsed });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => {
      articleCache.cache.delete(`news-${category}`);
      load();
    }, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load, category]);

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    if (val.length >= 2) {
      const words = val.split(/\s+/);
      const lastWord = words[words.length - 1];
      const sugg = searchTrie.suggest(lastWord, 6);
      setSuggestions(sugg);
      setShowSugg(sugg.length > 0);
    } else setShowSugg(false);
  }

  function applysuggestion(word) {
    const words = search.split(/\s+/);
    words[words.length - 1] = word;
    setSearch(words.join(' '));
    setShowSugg(false);
    searchRef.current?.focus();
  }

  const filtered = useMemo(() => {
    let result = articles;
    if (timeFilter !== Infinity) result = slidingWindowFilter(result, timeFilter);
    if (search.trim().length > 0) {
      const q = search.trim();
      result = result.filter(a =>
        kmpSearch(a.title, q) || kmpSearch(a.source, q) ||
        (q.length >= 4 && fuzzyMatch(q, a.title))
      );
    }
    return result;
  }, [articles, search, timeFilter]);

  const clusters = useMemo(() => clusterMode ? bfsClusters(filtered) : null, [filtered, clusterMode]);
  const displayItems = clusterMode ? (clusters || []).map(c => c[0]) : filtered;

  const trending = useMemo(() => extractTrendingKeywords(articles, 8), [articles]);

  const showLead = !search && !clusterMode && timeFilter === Infinity && displayItems.length > 0;
  const leadItem = showLead ? displayItems[0] : null;
  const restItems = showLead ? displayItems.slice(1) : displayItems;

  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'12px' }}>
        <div style={{ position:'relative', flex:1, minWidth:'220px' }}>
          <input
            ref={searchRef} type="text"
            placeholder="Search headlines..."
            value={search} onChange={handleSearchChange}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            onFocus={() => suggestions.length > 0 && setShowSugg(true)}
            style={{
              width:'100%', padding:'9px 12px 9px 32px', border:'1px solid #E2E2E2',
              borderRadius:'2px', fontFamily:'Inter, sans-serif', fontSize:'13px',
              background:'#fff', outline:'none', transition:'border-color 0.1s',
            }}
          />
          <span style={{ position:'absolute', left:'10px', top:'10px', color:'#8A8A8A', fontSize:'10px', fontFamily:'IBM Plex Mono, monospace' }}>Q</span>
          {showSugg && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #E2E2E2', borderRadius:'2px', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', zIndex:20, marginTop:'2px' }}>
              {suggestions.map((s,i) => (
                <button key={i} onMouseDown={() => applysuggestion(s)}
                  style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 12px', fontSize:'13px', border:'none', background:'transparent', cursor:'pointer', fontFamily:'Inter, sans-serif' }}
                  onMouseEnter={e => e.target.style.background='#FAFAFA'}
                  onMouseLeave={e => e.target.style.background='transparent'}>
                  <span style={{ color:'#0A0A0A', fontFamily:'IBM Plex Mono', fontSize:'10px', marginRight:'8px', fontWeight:600 }}>TRIE</span>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <select value={timeFilter} onChange={e => setTimeFilter(Number(e.target.value))}
          style={{ padding:'8px 10px', border:'1px solid #E2E2E2', borderRadius:'2px', fontFamily:'IBM Plex Mono, monospace', fontSize:'11px', fontWeight:600, background:'#fff', cursor:'pointer' }}>
          {TIME_FILTERS.map(f => <option key={f.label} value={f.hours}>{f.label}</option>)}
        </select>

        <button onClick={() => setClusterMode(!clusterMode)}
          className={`pw-tab ${clusterMode ? 'active' : ''}`} style={{ border:'1px solid #E2E2E2' }}>
          {clusterMode ? 'CLUSTERED' : 'ALL STORIES'}
        </button>

        <button onClick={() => { articleCache.cache.delete(`news-${category}`); load(); }}
          className="pw-tab" style={{ background:'#0A0A0A', color:'#fff' }}>
          REFRESH
        </button>
      </div>

      {dsaInfo.elapsed && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'10px', alignItems:'center' }}>
          <span className="dsa-badge">RANKING: TF-IDF &rarr; BLOOMFILTER &rarr; QUICKSELECT &rarr; MINHEAP</span>
          <span style={{ fontFamily:'IBM Plex Mono', fontSize:'11px', color:'#8A8A8A' }}>
            {dsaInfo.total} raw &rarr; {dsaInfo.ranked} ranked &middot; {dsaInfo.elapsed}ms
          </span>
          {clusterMode && clusters && (
            <span className="dsa-badge">BFS CLUSTERING: {clusters.length} CLUSTERS</span>
          )}
          {search && (
            <span className="dsa-badge">KMP+FUZZY: {filtered.length} MATCHES</span>
          )}
        </div>
      )}

      {trending.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', alignItems:'center', marginBottom:'18px', paddingBottom:'14px', borderBottom:'1px solid #E2E2E2' }}>
          <span style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#8A8A8A', letterSpacing:'0.1em', marginRight:'4px', fontWeight:600 }}>
            TRENDING
          </span>
          {trending.map((t, i) => (
            <button key={i} onClick={() => setSearch(t.word)}
              style={{
                fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', letterSpacing:'0.03em', fontWeight:500,
                padding:'3px 9px', borderRadius:'2px', border:'1px solid #E2E2E2',
                background:'#FAFAFA', color:'#1A1A1A', cursor:'pointer',
              }}>
              {t.word} <span style={{ color:'#BBBBBB' }}>&times;{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div>
          <div className="pw-card" style={{ padding:'24px', borderRadius:'2px', marginBottom:'16px' }}>
            <div style={{ height:'10px', background:'#eee', borderRadius:'2px', width:'20%', marginBottom:'14px' }} />
            <div style={{ height:'28px', background:'#eee', borderRadius:'2px', marginBottom:'10px', width:'90%' }} />
            <div style={{ height:'28px', background:'#eee', borderRadius:'2px', width:'60%' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="pw-card" style={{ padding:'14px', borderRadius:'2px' }}>
                <div style={{ height:'10px', background:'#eee', borderRadius:'2px', width:'30%', marginBottom:'10px' }} />
                <div style={{ height:'14px', background:'#eee', borderRadius:'2px', marginBottom:'6px' }} />
                <div style={{ height:'14px', background:'#eee', borderRadius:'2px', width:'70%' }} />
              </div>
            ))}
          </div>
        </div>
      ) : displayItems.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#BBBBBB' }}>
          <div style={{ fontFamily:'IBM Plex Mono', fontSize:'11px', letterSpacing:'0.1em', marginBottom:'10px' }}>&mdash; EMPTY &mdash;</div>
          <p style={{ fontFamily:'Inter, sans-serif', fontSize:'13px', fontWeight:600, color:'#888' }}>NO ARTICLES FOUND</p>
          <p style={{ fontFamily:'Inter, sans-serif', fontSize:'12px', marginTop:'4px', color:'#AAA' }}>Try changing the search or time filter</p>
        </div>
      ) : (
        <div>
          {leadItem && (
            <a href={leadItem.link} target="_blank" rel="noopener noreferrer"
              className="pw-card lead-card" style={{ display:'block', padding:'22px', borderRadius:'2px', textDecoration:'none', color:'inherit', marginBottom:'18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span className="src-pill">{leadItem.source}</span>
                  <span style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#BBBBBB' }}>{timeAgo(leadItem.pubDate)} AGO</span>
                  <span className="section-label" style={{ color:'#0A0A0A' }}>TOP STORY</span>
                </div>
                <BookmarkStar article={leadItem} />
              </div>
              <h2 className="headline-lg" style={{ fontSize: 'clamp(20px, 3vw, 28px)', marginBottom: leadItem.snippet ? '10px' : 0 }}>
                {leadItem.title}
              </h2>
              {leadItem.snippet && (
                <p className="dek lc2" style={{ fontSize:'14px', maxWidth:'780px' }}>{leadItem.snippet}</p>
              )}
            </a>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
            {restItems.map((item, i) => (
              <a key={item.id || i} href={item.link} target="_blank" rel="noopener noreferrer"
                className="pw-card" style={{ display:'block', padding:'14px', borderRadius:'2px', textDecoration:'none', color:'inherit' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                  <span className="src-pill">{item.source}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#BBBBBB' }}>{timeAgo(item.pubDate)} AGO</span>
                    <BookmarkStar article={item} />
                  </div>
                </div>
                <h3 className="headline-sm" style={{ fontSize:'15px', marginBottom:'8px' }}>
                  {item.title}
                </h3>
                {item.snippet && (
                  <p className="dek lc2" style={{ fontSize:'12px' }}>{item.snippet}</p>
                )}
                {clusterMode && clusters && (
                  <div style={{ marginTop:'10px' }}>
                    <span style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#BBBBBB' }}>
                      +{(clusters.find(c => c[0].id === item.id) || []).length - 1} related
                    </span>
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {lastUpdated && (
        <p style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#CCCCCC', marginTop:'18px', letterSpacing:'0.04em' }}>
          LAST UPDATED {lastUpdated.toUpperCase()} IST &middot; LRU CACHE ACTIVE
        </p>
      )}
    </div>
  );
}
