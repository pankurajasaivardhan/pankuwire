import { useEffect, useState } from 'react';

const CAT_OPTIONS = [
  { value: 'all', label: 'All Fields' },
  { value: 'ai', label: 'AI / ML' },
  { value: 'physics', label: 'Physics' },
  { value: 'quantum', label: 'Quantum' },
  { value: 'astro', label: 'Astrophysics' },
  { value: 'math', label: 'Mathematics' },
  { value: 'finance', label: 'Quant Finance' },
];

export default function PaperFeed() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');

  async function load(q = '', c = 'all') {
    setLoading(true);
    try {
      const params = new URLSearchParams({ cat: c });
      if (q) params.set('q', q);
      const res = await fetch(`/api/papers?${params}`);
      const json = await res.json();
      setPapers(json.papers || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e) {
    e.preventDefault();
    setQuery(search);
    load(search, cat);
  }

  const inputStyle = {
    padding:'8px 12px', border:'1px solid #E2E2E2', borderRadius:'2px',
    fontFamily:'Inter, sans-serif', fontSize:'12px', background:'#fff', outline:'none',
  };

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
        <input type="text" placeholder='Search papers e.g. "transformer" "quantum error correction"...'
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex:1, minWidth:'240px' }} />
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
          {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="submit" className="pw-tab" style={{ background:'#0A0A0A', color:'#fff', padding:'8px 18px' }}>SEARCH</button>
        {query && <button type="button" onClick={() => { setSearch(''); setQuery(''); load('', cat); }}
          className="pw-tab" style={{ border:'1px solid #E2E2E2', padding:'8px 14px' }}>CLEAR</button>}
      </form>

      <div style={{ display:'flex', gap:'8px', marginBottom:'14px', alignItems:'center' }}>
        <span className="dsa-badge" style={{ background:'#FAFAFA', borderColor:'#E2E2E2', color:'#0A0A0A' }}>ARXIV + SEMANTIC SCHOLAR</span>
        <span style={{ fontFamily:'IBM Plex Mono', fontSize:'11px', color:'#999' }}>{papers.length} papers</span>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {Array(6).fill(0).map((_,i) => (
            <div key={i} className="pw-card" style={{ padding:'14px', borderRadius:'2px' }}>
              <div style={{ height:'10px', background:'#eee', width:'20%', marginBottom:'8px', borderRadius:'2px' }} />
              <div style={{ height:'16px', background:'#eee', marginBottom:'8px', borderRadius:'2px' }} />
              <div style={{ height:'10px', background:'#f5f5f5', width:'60%', borderRadius:'2px' }} />
            </div>
          ))}
        </div>
      ) : papers.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#aaa' }}>
          <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'11px', letterSpacing:'0.1em', marginBottom:'10px', color:'#C0C0C0' }}>— EMPTY —</div>
          <p style={{ fontFamily:'IBM Plex Mono', fontSize:'13px', fontWeight:600 }}>NO PAPERS FOUND</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {papers.map((p, i) => (
            <div key={p.id || i} className="pw-card" style={{ padding:'14px', borderRadius:'2px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:'12px', alignItems:'flex-start' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'6px' }}>
                    <span className="src-pill" style={{ background:'#FAFAFA', color:'#0A0A0A', border:'1px solid #E2E2E2' }}>{p.source.toUpperCase()}</span>
                    <span style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#aaa' }}>{p.published}</span>
                  </div>
                  <a href={p.link} target="_blank" rel="noopener noreferrer" className="headline-sm"
                    style={{ display:'block', fontSize:'15px', marginBottom:'4px', textDecoration:'none' }}>
                    {p.title}
                  </a>
                  <p style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#aaa', marginBottom:'6px' }}>{p.authors}</p>
                  <p className="lc2" style={{ fontFamily:'Inter, sans-serif', fontSize:'11.5px', color:'#888', lineHeight:'1.5' }}>{p.abstract}</p>
                </div>
                {p.pdfLink && (
                  <a href={p.pdfLink} target="_blank" rel="noopener noreferrer"
                    style={{ flexShrink:0, fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', background:'#FAFAFA', border:'1px solid #E2E2E2', color:'#C0392B', padding:'4px 8px', borderRadius:'2px', textDecoration:'none', fontWeight:600 }}>
                    PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
