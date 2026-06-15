import { useEffect, useState } from 'react';
import { rankArticles } from '../lib/dsa';
import { isBookmarked, toggleBookmark } from '../lib/bookmarks';

const SECTIONS = [
  { id: 'india',     label: 'India' },
  { id: 'tech',      label: 'Tech' },
  { id: 'ai',        label: 'AI & ML' },
  { id: 'business',  label: 'Business' },
  { id: 'science',   label: 'Science' },
  { id: 'space',     label: 'Space' },
  { id: 'physics',   label: 'Physics' },
  { id: 'quantum',   label: 'Quantum' },
  { id: 'ev',        label: 'EV & Auto' },
  { id: 'geo',       label: 'Geopolitics' },
];

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

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

export default function Briefing({ onNavigate }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const results = await Promise.allSettled(
        SECTIONS.map(s => fetch(`/api/news?category=${s.id}`).then(r => r.json()))
      );
      const out = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const ranked = rankArticles(r.value.items || [], 3);
          out[SECTIONS[i].id] = ranked;
        } else {
          out[SECTIONS[i].id] = [];
        }
      });
      setData(out);
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // Top headline overall = first item from India or Tech, whichever ranks higher
  const allTop = SECTIONS.flatMap(s => (data[s.id] || []).slice(0, 1).map(a => ({ ...a, section: s.label, sectionId: s.id })));
  const topStory = allTop.length > 0 ? allTop.sort((a,b) => (b.score||0) - (a.score||0))[0] : null;

  return (
    <div>
      <div style={{ marginBottom:'20px' }}>
        <div className="section-label" style={{ marginBottom:'4px' }}>{dateStr.toUpperCase()}</div>
        <p className="dek" style={{ fontSize:'13px' }}>
          A real-time digest of the top story from each section, ranked by PankuWire&rsquo;s
          relevance engine (TF-IDF + source trust + recency).
        </p>
      </div>

      {loading ? (
        <div>
          <div className="pw-card" style={{ padding:'24px', borderRadius:'2px', marginBottom:'20px' }}>
            <div style={{ height:'10px', background:'#eee', borderRadius:'2px', width:'15%', marginBottom:'14px' }} />
            <div style={{ height:'28px', background:'#eee', borderRadius:'2px', marginBottom:'10px', width:'85%' }} />
          </div>
          {Array(4).fill(0).map((_, i) => (
            <div key={i} style={{ marginBottom:'24px' }}>
              <div style={{ height:'10px', background:'#eee', borderRadius:'2px', width:'10%', marginBottom:'10px' }} />
              <div className="pw-card" style={{ padding:'14px', borderRadius:'2px' }}>
                <div style={{ height:'16px', background:'#eee', borderRadius:'2px', marginBottom:'8px' }} />
                <div style={{ height:'12px', background:'#f5f5f5', borderRadius:'2px', width:'60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {/* TOP STORY OF THE DAY */}
          {topStory && (
            <a href={topStory.link} target="_blank" rel="noopener noreferrer"
              className="pw-card lead-card" style={{ display:'block', padding:'24px', borderRadius:'2px', textDecoration:'none', color:'inherit', marginBottom:'28px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span className="section-label" style={{ color:'#0A0A0A' }}>TOP STORY &middot; {topStory.section.toUpperCase()}</span>
                  <span className="src-pill">{topStory.source}</span>
                  <span style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#BBBBBB' }}>{timeAgo(topStory.pubDate)} AGO</span>
                </div>
                <BookmarkStar article={topStory} />
              </div>
              <h2 className="headline-lg" style={{ fontSize:'clamp(22px, 3.4vw, 32px)', marginBottom: topStory.snippet ? '10px' : 0 }}>
                {topStory.title}
              </h2>
              {topStory.snippet && <p className="dek lc2" style={{ fontSize:'14px', maxWidth:'780px' }}>{topStory.snippet}</p>}
            </a>
          )}

          {/* SECTION DIGESTS */}
          {SECTIONS.map(sec => {
            const items = (data[sec.id] || []).filter(a => a.id !== topStory?.id);
            if (items.length === 0) return null;
            return (
              <div key={sec.id} style={{ marginBottom:'28px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <span className="section-label">{sec.label.toUpperCase()}</span>
                  <button onClick={() => onNavigate(sec.id)} style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#8A8A8A', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.05em' }}>
                    VIEW ALL &rarr;
                  </button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
                  {items.slice(0, 3).map((item, i) => (
                    <a key={item.id || i} href={item.link} target="_blank" rel="noopener noreferrer"
                      className="pw-card" style={{ display:'block', padding:'14px', borderRadius:'2px', textDecoration:'none', color:'inherit' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                        <span className="src-pill">{item.source}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#BBBBBB' }}>{timeAgo(item.pubDate)} AGO</span>
                          <BookmarkStar article={item} />
                        </div>
                      </div>
                      <h3 className="headline-sm" style={{ fontSize:'14px' }}>{item.title}</h3>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
