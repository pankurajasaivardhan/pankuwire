import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 9000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
  },
  customFields: { item: [['media:content','mediaContent'],['dc:creator','creator']] },
});

const FEEDS = {
  india: [
    { name: 'The Hindu',        url: 'https://www.thehindu.com/feeder/default.rss' },
    { name: 'NDTV',             url: 'https://feeds.feedburner.com/ndtvnews-top-stories' },
    { name: 'Economic Times',   url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms' },
    { name: 'Mint',             url: 'https://www.livemint.com/rss/news' },
    { name: 'Business Standard',url: 'https://www.business-standard.com/rss/home_page_top_stories.rss' },
    { name: 'Financial Express', url: 'https://www.financialexpress.com/feed/' },
    { name: 'Times of India',   url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' },
    { name: 'Indian Express',   url: 'https://indianexpress.com/feed/' },
    { name: 'The Print',        url: 'https://theprint.in/feed/' },
    { name: 'MoneyControl',     url: 'https://www.moneycontrol.com/rss/latestnews.xml' },
    { name: 'Scroll.in',        url: 'https://scroll.in/feed' },
    { name: 'Analytics India',  url: 'https://analyticsindiamag.com/feed/' },
  ],
  tech: [
    { name: 'TechCrunch',    url: 'https://techcrunch.com/feed/' },
    { name: 'Ars Technica',  url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { name: 'The Verge',     url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'Wired',         url: 'https://www.wired.com/feed/rss' },
    { name: 'Hacker News',   url: 'https://news.ycombinator.com/rss' },
    { name: 'MIT Tech Review',url: 'https://www.technologyreview.com/feed/' },
    { name: 'VentureBeat',   url: 'https://venturebeat.com/feed/' },
    { name: 'Engadget',      url: 'https://www.engadget.com/rss.xml' },
    { name: 'CNET',          url: 'https://www.cnet.com/rss/news/' },
    { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss' },
    { name: 'ZDNet',         url: 'https://www.zdnet.com/news/rss.xml' },
    { name: 'Gizmodo',       url: 'https://gizmodo.com/rss' },
  ],
  ai: [
    { name: 'arXiv CS.AI',   url: 'https://arxiv.org/rss/cs.AI' },
    { name: 'arXiv CS.LG',   url: 'https://arxiv.org/rss/cs.LG' },
    { name: 'arXiv CS.CV',   url: 'https://arxiv.org/rss/cs.CV' },
    { name: 'arXiv CS.CL',   url: 'https://arxiv.org/rss/cs.CL' },
    { name: 'Google AI Blog', url: 'https://blog.research.google/feeds/posts/default' },
    { name: 'Hugging Face',   url: 'https://huggingface.co/blog/feed.xml' },
    { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
    { name: 'MIT Tech AI',    url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/' },
    { name: 'TechCrunch AI',  url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { name: 'The Verge AI',   url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
    { name: 'Wired AI',       url: 'https://www.wired.com/feed/category/artificial-intelligence/latest/rss' },
  ],
  quantum: [
    { name: 'arXiv Quantum',    url: 'https://arxiv.org/rss/quant-ph' },
    { name: 'Quanta Physics',   url: 'https://www.quantamagazine.org/physics/feed/' },
    { name: 'Physics World',    url: 'https://physicsworld.com/feed/' },
    { name: 'APS Physics',      url: 'https://physics.aps.org/rss/recent.xml' },
    { name: 'Phys.org Quantum', url: 'https://phys.org/physics-news/quantum-physics/rss-feed/' },
    { name: 'ScienceDaily QP',  url: 'https://www.sciencedaily.com/rss/matter_energy/quantum_physics.xml' },
    { name: 'CERN News',        url: 'https://home.cern/api/news/news/feed.rss' },
  ],
  science: [
    { name: 'Phys.org',      url: 'https://phys.org/rss-feed/' },
    { name: 'ScienceDaily',  url: 'https://www.sciencedaily.com/rss/all.xml' },
    { name: 'Quanta Mag',    url: 'https://www.quantamagazine.org/feed/' },
    { name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/' },
    { name: 'Live Science',  url: 'https://www.livescience.com/feeds/all' },
    { name: 'EurekAlert',    url: 'https://www.eurekalert.org/rss.xml' },
    { name: 'Nature News',   url: 'https://www.nature.com/news.rss' },
    { name: 'Cosmos Mag',    url: 'https://cosmosmagazine.com/feed/' },
    { name: 'IFL Science',   url: 'https://www.iflscience.com/backend/feeds/rss' },
    { name: 'Popular Sci',   url: 'https://www.popsci.com/feed/' },
  ],
  space: [
    { name: 'NASA News',         url: 'https://www.nasa.gov/news-release/feed/' },
    { name: 'SpaceNews',         url: 'https://spacenews.com/feed/' },
    { name: 'Space.com',         url: 'https://www.space.com/feeds/all' },
    { name: 'SpaceflightNow',    url: 'https://spaceflightnow.com/feed/' },
    { name: 'Universe Today',    url: 'https://www.universetoday.com/feed/' },
    { name: 'NASASpaceflight',   url: 'https://www.nasaspaceflight.com/feed/' },
    { name: 'Planetary Society', url: 'https://www.planetary.org/feed' },
    { name: 'ESA News',          url: 'https://www.esa.int/rssfeed.xml' },
    { name: 'arXiv Astrophys',   url: 'https://arxiv.org/rss/astro-ph' },
    { name: 'Sky & Telescope',   url: 'https://skyandtelescope.org/feed/' },
  ],
  physics: [
    { name: 'arXiv Physics',  url: 'https://arxiv.org/rss/physics' },
    { name: 'arXiv HEP',      url: 'https://arxiv.org/rss/hep-ph' },
    { name: 'arXiv Cond-Mat', url: 'https://arxiv.org/rss/cond-mat' },
    { name: 'Fermilab',       url: 'https://news.fnal.gov/feed/' },
    { name: 'CERN News',      url: 'https://home.cern/api/news/news/feed.rss' },
    { name: 'APS Physics',    url: 'https://physics.aps.org/rss/recent.xml' },
    { name: 'Physics World',  url: 'https://physicsworld.com/feed/' },
    { name: 'Phys.org',       url: 'https://phys.org/rss-feed/' },
  ],
  ev: [
    { name: 'Electrek',          url: 'https://electrek.co/feed/' },
    { name: 'InsideEVs',         url: 'https://insideevs.com/feed/all/' },
    { name: 'CleanTechnica',     url: 'https://cleantechnica.com/feed/' },
    { name: 'Green Car Reports', url: 'https://www.greencarreports.com/rss/all.xml' },
    { name: 'Teslarati',         url: 'https://www.teslarati.com/feed/' },
    { name: 'Motor Trend',       url: 'https://www.motortrend.com/rss/all/' },
    { name: 'Car and Driver',    url: 'https://www.caranddriver.com/rss/all.xml/' },
    { name: 'Autoblog',          url: 'https://www.autoblog.com/rss.xml' },
    { name: 'The Drive',         url: 'https://www.thedrive.com/feed' },
    { name: 'Charged EVs',       url: 'https://chargedevs.com/feed/' },
  ],
  geo: [
    { name: 'Reuters World',   url: 'https://feeds.reuters.com/reuters/worldNews' },
    { name: 'BBC World',       url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'Al Jazeera',      url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { name: 'Guardian World',  url: 'https://www.theguardian.com/world/rss' },
    { name: 'Foreign Policy',  url: 'https://foreignpolicy.com/feed/' },
    { name: 'The Diplomat',    url: 'https://thediplomat.com/feed/' },
    { name: 'AP News',         url: 'https://apnews.com/apf-topnews' },
    { name: 'DW World',        url: 'https://rss.dw.com/xml/rss-en-world' },
    { name: 'France 24',       url: 'https://www.france24.com/en/rss' },
    { name: 'NPR World',       url: 'https://feeds.npr.org/1004/rss.xml' },
  ],
  business: [
    { name: 'Reuters Business', url: 'https://feeds.reuters.com/reuters/businessNews' },
    { name: 'Reuters Tech',     url: 'https://feeds.reuters.com/reuters/technologyNews' },
    { name: 'Bloomberg Markets',url: 'https://feeds.bloomberg.com/markets/news.rss' },
    { name: 'Bloomberg Tech',   url: 'https://feeds.bloomberg.com/technology/news.rss' },
    { name: 'CNBC Finance',     url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
    { name: 'MarketWatch',      url: 'https://feeds.marketwatch.com/marketwatch/topstories/' },
    { name: 'Seeking Alpha',    url: 'https://seekingalpha.com/feed.xml' },
    { name: 'WSJ Markets',      url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml' },
    { name: 'WSJ Tech',         url: 'https://feeds.a.dj.com/rss/RSSWSJD.xml' },
    { name: 'FT Markets',       url: 'https://www.ft.com/rss/home/uk' },
    { name: 'ET Markets',       url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
    { name: 'Mint Markets',     url: 'https://www.livemint.com/rss/markets' },
    { name: 'Abnormal Returns', url: 'https://abnormalreturns.com/feed/' },
    { name: 'Hedgeweek',        url: 'https://www.hedgeweek.com/feed/' },
    { name: 'arXiv q-fin',      url: 'https://arxiv.org/rss/q-fin' },
    { name: 'Google Blog',      url: 'https://blog.google/rss/' },
    { name: 'Microsoft Blog',   url: 'https://blogs.microsoft.com/feed/' },
    { name: 'NVIDIA News',      url: 'https://nvidianews.nvidia.com/rss' },
    { name: 'Apple Newsroom',   url: 'https://www.apple.com/newsroom/rss-feed.rss' },
    { name: 'Crunchbase News',  url: 'https://news.crunchbase.com/feed/' },
    { name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/' },
  ],
};

const cache = {};
const CACHE_TTL = 5 * 60 * 1000;

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items.slice(0, 10).map(item => ({
      id: item.guid || item.link || `${source.name}-${Math.random()}`,
      title: (item.title || '').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),
      link: item.link || '#',
      source: source.name,
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      snippet: (item.contentSnippet || item.content || item.summary || '')
        .replace(/<[^>]+>/g, '').replace(/\s+/g,' ').trim().slice(0, 280),
    }));
  } catch { return []; }
}

export default async function handler(req, res) {
  const { category = 'india' } = req.query;
  const feeds = FEEDS[category];
  if (!feeds) return res.status(400).json({ items: [], error: 'Unknown category' });

  const now = Date.now();
  if (cache[category] && now - cache[category].ts < (cache[category].ttl || CACHE_TTL)) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache[category].data);
  }

  const results = await Promise.allSettled(feeds.map(fetchFeed));
  let items = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.length > 0).length;
  items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const data = {
    items, total: items.length,
    sourcesOk: successCount, sourcesTotal: feeds.length,
    updatedAt: new Date().toISOString(),
  };

  cache[category] = { data, ts: now, ttl: items.length > 0 ? CACHE_TTL : 60 * 1000 };
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  return res.status(200).json(data);
}
