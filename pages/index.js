import Head from 'next/head';
import { useState } from 'react';
import NewsFeed from '../components/NewsFeed';
import PaperFeed from '../components/PaperFeed';
import Briefing from '../components/Briefing';
import Bookmarks from '../components/Bookmarks';

const TABS = [
  { id: 'today',     label: 'Today',          type: 'briefing' },
  { id: 'india',     label: 'India',          type: 'news' },
  { id: 'tech',      label: 'Tech',           type: 'news' },
  { id: 'ai',        label: 'AI & ML',        type: 'news' },
  { id: 'business',  label: 'Business',       type: 'news' },
  { id: 'science',   label: 'Science',        type: 'news' },
  { id: 'space',     label: 'Space',          type: 'news' },
  { id: 'physics',   label: 'Physics',        type: 'news' },
  { id: 'quantum',   label: 'Quantum',        type: 'news' },
  { id: 'ev',        label: 'EV & Auto',      type: 'news' },
  { id: 'geo',       label: 'Geopolitics',    type: 'news' },
  { id: 'papers',    label: 'Papers',         type: 'papers' },
  { id: 'saved',     label: 'Saved',          type: 'bookmarks' },
];

const TAB_DESC = {
  today: 'Your daily digest — top story from every section, ranked live',
  india: 'Live RSS · 12 sources · The Hindu, ET, Mint, NDTV, MoneyControl',
  tech: 'Live RSS · 12 sources · TechCrunch, Wired, IEEE, Ars Technica',
  ai: 'Live RSS + arXiv · 11 sources · Google AI, HuggingFace, MIT Tech Review',
  business: 'Live RSS + arXiv q-fin · 21 sources · Reuters, Bloomberg, CNBC, Google, NVIDIA, Apple, Crunchbase',
  quantum: 'Live RSS + arXiv quant-ph · CERN, Quanta, Physics World, APS',
  science: 'Live RSS · 10 sources · Phys.org, ScienceDaily, Nature, Quanta',
  space: 'Live RSS + arXiv astro-ph · NASA, ESA, SpaceNews, Sky & Telescope',
  physics: 'Live RSS + arXiv · CERN, Fermilab, APS, Physics World',
  ev: 'Live RSS · Electrek, InsideEVs, CleanTechnica, Teslarati',
  geo: 'Live RSS · Reuters, BBC, Al Jazeera, Foreign Policy, AP',
  papers: 'arXiv + Semantic Scholar · CS, Physics, Quantum, Finance, Astro',
  saved: 'Articles you bookmarked — saved locally on this device',
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('today');

  const current = TABS.find(t => t.id === activeTab);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <>
      <Head>
        <title>PankuWire</title>
        <meta name="description" content="PankuWire — real-time news, research and analysis" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0A0A0A" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </Head>

      <div style={{ minHeight:'100vh', background:'#FFFFFF', display:'flex', flexDirection:'column' }}>

        {/* ── MASTHEAD ── */}
        <header style={{ background:'#fff', borderBottom:'2px solid #0A0A0A', position:'sticky', top:0, zIndex:50 }}>

          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', padding:'18px 20px 14px', flexWrap:'wrap', gap:'8px' }}>
            <h1 className="masthead-title" style={{ fontSize:'30px' }}>
              PankuWire
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:'18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#1A7A3C', display:'inline-block' }} />
                <span className="section-label">LIVE</span>
              </div>
              <div style={{ textAlign:'right' }}>
                <div className="data-num" style={{ fontSize:'13px', color:'#0A0A0A' }}>{timeStr} IST</div>
                <div className="section-label" style={{ fontWeight:400, letterSpacing:'0.08em' }}>{dateStr}</div>
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="no-scroll" style={{ display:'flex', overflowX:'auto', gap:'2px', padding:'0 16px 8px', borderTop:'1px solid #E2E2E2' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`pw-tab ${activeTab === tab.id ? 'active' : ''}`} style={{ flexShrink:0, marginTop:'8px' }}>
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {/* ── MAIN ── */}
        <main style={{ flex:1, maxWidth:'1400px', margin:'0 auto', width:'100%', padding:'24px 20px' }}>

          <div style={{ marginBottom:'20px' }}>
            <h2 className="page-headline" style={{ fontSize:'24px', marginBottom:'4px' }}>
              {current?.label}
            </h2>
            <p className="section-label" style={{ fontWeight:400 }}>
              {TAB_DESC[activeTab]}
            </p>
          </div>

          {current?.type === 'news'      && <NewsFeed key={activeTab} category={activeTab} />}
          {current?.type === 'papers'    && <PaperFeed />}
          {current?.type === 'briefing'  && <Briefing onNavigate={setActiveTab} />}
          {current?.type === 'bookmarks' && <Bookmarks />}
        </main>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop:'1px solid #E2E2E2', background:'#fff', padding:'14px 20px', marginTop:'12px' }}>
          <div style={{ maxWidth:'1400px', margin:'0 auto', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
            <div>
              <span className="masthead-title" style={{ fontSize:'14px' }}>PankuWire</span>
              <span className="section-label" style={{ marginLeft:'10px', fontWeight:400 }}>v7.0 &middot; BUILT BY PANKU</span>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'12px' }} className="section-label">
              <span style={{ fontWeight:400 }}>150+ RSS SOURCES</span>
              <span>&middot;</span>
              <span style={{ fontWeight:400 }}>ARXIV + SEMANTIC SCHOLAR</span>
              <span>&middot;</span>
              <span style={{ fontWeight:400 }}>17 DSA ALGORITHMS</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
