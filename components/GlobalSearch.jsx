import { useState, useRef, useCallback } from 'react';
import { isBookmarked, toggleBookmark } from '../lib/bookmarks';

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function BookmarkStar({ article }) {
  const [saved, setSaved] = useState(() => isBookmarked(article.id));
  return (
    <button
      className={`bookmark-btn ${saved ? 'active' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(article); setSaved(!saved); }}
      title={saved ? 'Remove bookmark' : 'Save for later'}
    >
      {saved ? '\u2605' : '\u2606'}
    </button>
  );
}

export default function GlobalSearch({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults(null);
      setStats(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=4`);
      const json = await res.json();
      if (json.error) { setError(json.error); setResults(null); }
      else {
        setResults(json.results || []);
        setStats({ total: json.totalMatched, searched: json.totalSearched, sections: json.sectionsFound });
      }
    } catch {
      setError('Search failed — please try again');
    }
    setLoading(false);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      search(query);
    }
    if (e.key === 'Escape') {
      setQuery('');
      setResults(null);
      setStats(null);
    }
  }

  function clear() {
    setQuery('');
    setResults(null);
    setStats(null);
    inputRef.current?.focus();
  }

  return (
    <div>
      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search across all sections — India, Tech, AI, Science, Space..."
          style={{
            width: '100%', padding: '12px 48px 12px 40px',
            border: '2px solid #0A0A0A', borderRadius: '2px',
            fontFamily: 'Inter, sans-serif', fontSize: '15px',
            background: '#fff', outline: 'none',
          }}
        />
        <span style={{ position: 'absolute', left: '13px', top: '13px', color: '#8A8A8A', fontFamily: 'IBM Plex Mono', fontSize: '11px', fontWeight: 600 }}>
          Q
        </span>
        {query && (
          <button onClick={clear} style={{
            position: 'absolute', right: '12px', top: '12px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#8A8A8A', fontSize: '16px', lineHeight: 1,
          }}>
            &times;
          </button>
        )}
      </div>

      {/* Stats bar */}
      {stats && !loading && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
          <span className="dsa-badge">KMP + FUZZY MATCH</span>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: '#8A8A8A' }}>
            {stats.total} results across {stats.sections} sections &middot; {stats.searched} articles searched
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: '#8A8A8A', letterSpacing: '0.08em', padding: '20px 0' }}>
          SEARCHING...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: '#C0392B', padding: '12px', border: '1px solid #F5C2C2', borderRadius: '2px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {results && results.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#BBBBBB' }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '10px' }}>&mdash; NO RESULTS &mdash;</div>
          <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#888' }}>
            No articles found for &ldquo;{query}&rdquo; in any section.
          </p>
          <p style={{ fontFamily: 'Inter', fontSize: '12px', color: '#AAA', marginTop: '6px' }}>
            Results appear from cached articles — try visiting a section tab first to populate the cache.
          </p>
        </div>
      )}

      {/* Results grouped by section */}
      {results && results.length > 0 && !loading && (
        <div>
          {results.map((section) => (
            <div key={section.category} style={{ marginBottom: '28px' }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #E2E2E2' }}>
                <span className="section-label">{section.label.toUpperCase()} &mdash; {section.count} RESULT{section.count !== 1 ? 'S' : ''}</span>
                <button
                  onClick={() => onNavigate && onNavigate(section.category)}
                  style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: '#8A8A8A', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}
                >
                  VIEW ALL &rarr;
                </button>
              </div>

              {/* Article cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {section.articles.map((article, i) => (
                  <a
                    key={article.id || i}
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pw-card"
                    style={{ display: 'block', padding: '14px', borderRadius: '2px', textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="src-pill">{article.source}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: '#BBBBBB' }}>{timeAgo(article.pubDate)} AGO</span>
                        <BookmarkStar article={article} />
                      </div>
                    </div>
                    <h3 className="headline-sm" style={{ fontSize: '14px', marginBottom: '6px' }}>
                      <HighlightMatch text={article.title} query={query} />
                    </h3>
                    {article.snippet && (
                      <p className="dek lc2" style={{ fontSize: '12px' }}>{article.snippet}</p>
                    )}
                    <div style={{ marginTop: '8px', fontFamily: 'IBM Plex Mono', fontSize: '9px', color: '#CCCCCC' }}>
                      MATCH SCORE: {article.matchScore}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Initial empty prompt */}
      {!query && !results && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#CCCCCC' }}>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', letterSpacing: '0.08em', marginBottom: '8px' }}>
            TYPE TO SEARCH ALL SECTIONS
          </p>
          <p style={{ fontFamily: 'Inter', fontSize: '12px', color: '#AAAAAA' }}>
            Results from India, Tech, AI, Business, Science, Space, Physics, Quantum, EV, Geopolitics
          </p>
        </div>
      )}
    </div>
  );
}

// Highlights matching query text in article titles
function HighlightMatch({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#F0F0F0', color: '#0A0A0A', fontWeight: 700, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
