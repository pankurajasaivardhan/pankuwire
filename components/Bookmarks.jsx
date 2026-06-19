import { useEffect, useState } from 'react';
import { getBookmarks, removeBookmark, syncFromServer } from '../lib/bookmarks';

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function Bookmarks() {
  const [items, setItems] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // First load from localStorage immediately
    setItems(getBookmarks());
    setMounted(true);
    // Then sync from server in background (merges any cross-device bookmarks)
    syncFromServer().then(() => {
      setItems(getBookmarks());
    });
  }, []);

  function remove(id) {
    setItems(removeBookmark(id));
  }

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'60px', color:'#BBBBBB' }}>
        <div style={{ fontFamily:'IBM Plex Mono', fontSize:'11px', letterSpacing:'0.1em', marginBottom:'10px' }}>&mdash; EMPTY &mdash;</div>
        <p style={{ fontFamily:'Inter, sans-serif', fontSize:'13px', fontWeight:600, color:'#888' }}>NO SAVED ARTICLES YET</p>
        <p style={{ fontFamily:'Inter, sans-serif', fontSize:'12px', marginTop:'4px', color:'#AAA' }}>
          Tap the star icon on any article to save it here. Saved locally on this device.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="dek" style={{ fontSize:'12px', marginBottom:'18px' }}>
        {items.length} article{items.length !== 1 ? 's' : ''} saved &middot;
        <span style={{ fontFamily:'IBM Plex Mono', fontSize:'10px', color:'#BBBBBB', marginLeft:'8px' }}>
          SYNCED TO MONGODB &middot; PERSISTS ACROSS DEVICES
        </span>
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
        {items.map((item, i) => (
          <div key={item.id || i} className="pw-card" style={{ padding:'14px', borderRadius:'2px', position:'relative' }}>
            <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', color:'inherit', display:'block' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                <span className="src-pill">{item.source}</span>
                <span style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:'10px', color:'#BBBBBB' }}>{timeAgo(item.pubDate)} AGO</span>
              </div>
              <h3 className="headline-sm" style={{ fontSize:'15px', marginBottom:'8px', paddingRight:'24px' }}>
                {item.title}
              </h3>
              {item.snippet && <p className="dek lc2" style={{ fontSize:'12px' }}>{item.snippet}</p>}
            </a>
            <button onClick={() => remove(item.id)}
              className="bookmark-btn active"
              style={{ position:'absolute', top:'12px', right:'12px' }}
              title="Remove bookmark" aria-label="remove bookmark">
              &#10005;
            </button>
            <div style={{ marginTop:'10px', fontFamily:'IBM Plex Mono, monospace', fontSize:'9px', color:'#CCCCCC' }}>
              SAVED {new Date(item.savedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }).toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
