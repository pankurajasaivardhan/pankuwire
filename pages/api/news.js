import Parser from 'rss-parser';
import { dedupe } from '../../lib/dedupe';
import { recordFetch } from '../../lib/health';
import { readCache, writeCache } from '../../lib/articleCache';

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
    { name: 'Times of India',   url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' },
    { name: 'Indian Express',   url: 'https://indianexpress.com/feed/' },
    { name: 'MoneyControl',     url: 'https://www.moneycontrol.com/rss/latestnews.xml' },
    { name: 'Scroll.in',        url: 'https://scroll.in/feed' },
    { name: 'Analytics India',  url: 'https://analyticsindiamag.com/feed/' },
    { name: 'The Wire',         url: 'https://thewire.in/feed' },
    { name: 'Tribune India',     url: 'https://www.tribuneindia.com/rss/feed' },
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
    { name: 'IEEE AI',        url: 'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss' },
  ],
  quantum: [
    { name: 'arXiv Quantum',    url: 'https://arxiv.org/rss/quant-ph' },
    { name: 'Quanta Physics',   url: 'https://www.quantamagazine.org/physics/feed/' },
    { name: 'ScienceDaily QP',  url: 'https://www.sciencedaily.com/rss/matter_energy/quantum_physics.xml' },
    { name: 'Phys.org',         url: 'https://phys.org/rss-feed/' },
    { name: 'Science News',      url: 'https://www.sciencenews.org/feed' },
    { name: 'MIT Tech Quantum',  url: 'https://www.technologyreview.com/topic/quantum-computing/feed/' },
    { name: 'arXiv Cond-Mat',   url: 'https://arxiv.org/rss/cond-mat' },
  ],
  science: [
    { name: 'Phys.org',        url: 'https://phys.org/rss-feed/' },
    { name: 'ScienceDaily',    url: 'https://www.sciencedaily.com/rss/all.xml' },
    { name: 'Quanta Mag',      url: 'https://www.quantamagazine.org/feed/' },
    { name: 'Phys.org Physics',  url: 'https://phys.org/physics-news/rss-feed/' },
    { name: 'Live Science',    url: 'https://www.livescience.com/feeds/all' },
    { name: 'Popular Sci',     url: 'https://www.popsci.com/feed/' },
    { name: 'Science Alert',   url: 'https://www.sciencealert.com/feed' },
    { name: 'Discover Mag',    url: 'https://www.discovermagazine.com/rss' },
    { name: 'The Scientist',     url: 'https://www.the-scientist.com/rss' },
    { name: 'Ars Science',     url: 'https://feeds.arstechnica.com/arstechnica/science' },
  ],
  space: [
    { name: 'NASA News',      url: 'https://www.nasa.gov/news-release/feed/' },
    { name: 'SpaceNews',      url: 'https://spacenews.com/feed/' },
    { name: 'Sky & Tel News',    url: 'https://skyandtelescope.org/astronomy-news/feed/' },
    { name: 'SpaceflightNow', url: 'https://spaceflightnow.com/feed/' },
    { name: 'Universe Today', url: 'https://www.universetoday.com/feed/' },
    { name: 'arXiv Astrophys',url: 'https://arxiv.org/rss/astro-ph' },
    { name: 'SpaceRef',          url: 'https://spaceref.com/feed/' },
    { name: 'NASA JPL',       url: 'https://www.jpl.nasa.gov/feeds/news' },
    { name: 'Astronomy Mag',  url: 'https://astronomy.com/rss/news' },
    { name: 'Air Space Mag',     url: 'https://www.smithsonianmag.com/rss/air-space-smithsonian/' },
  ],
  physics: [
    { name: 'arXiv Physics',  url: 'https://arxiv.org/rss/physics' },
    { name: 'arXiv HEP',      url: 'https://arxiv.org/rss/hep-ph' },
    { name: 'arXiv Cond-Mat', url: 'https://arxiv.org/rss/cond-mat' },
    { name: 'Fermilab',       url: 'https://news.fnal.gov/feed/' },
    { name: 'Phys.org',       url: 'https://phys.org/rss-feed/' },
    { name: 'ScienceDaily',   url: 'https://www.sciencedaily.com/rss/matter_energy/physics.xml' },
    { name: 'Quanta Physics', url: 'https://www.quantamagazine.org/physics/feed/' },
    { name: 'Science Daily P2',  url: 'https://www.sciencedaily.com/rss/matter_energy/optics.xml' },
  ],
  ev: [
    { name: 'Electrek',       url: 'https://electrek.co/feed/' },
    { name: 'CleanTechnica',  url: 'https://cleantechnica.com/feed/' },
    { name: 'Teslarati',      url: 'https://www.teslarati.com/feed/' },
    { name: 'Car and Driver', url: 'https://www.caranddriver.com/rss/all.xml/' },
    { name: 'The Drive',      url: 'https://www.thedrive.com/feed' },
    { name: 'Charged EVs',    url: 'https://chargedevs.com/feed/' },
    { name: 'Green Car Blog',    url: 'https://www.thedrive.com/tag/electric-vehicles/feed' },
    { name: 'Wired Transport',url: 'https://www.wired.com/feed/category/transportation/latest/rss' },
    { name: 'Ars Cars',       url: 'https://feeds.arstechnica.com/arstechnica/cars' },
    { name: 'TechCrunch EV',  url: 'https://techcrunch.com/tag/electric-vehicles/feed/' },
  ],
  geo: [
    { name: 'BBC World',      url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'Al Jazeera',     url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { name: 'Guardian World', url: 'https://www.theguardian.com/world/rss' },
    { name: 'Foreign Policy', url: 'https://foreignpolicy.com/feed/' },
    { name: 'The Diplomat',   url: 'https://thediplomat.com/feed/' },
    { name: 'AP News',        url: 'https://apnews.com/apf-topnews' },
    { name: 'DW World',       url: 'https://rss.dw.com/xml/rss-en-world' },
    { name: 'France 24',      url: 'https://www.france24.com/en/rss' },
    { name: 'NPR World',      url: 'https://feeds.npr.org/1004/rss.xml' },
    { name: 'The Hindu World',url: 'https://www.thehindu.com/news/international/feeder/default.rss' },
  ],
  business: [
    { name: 'Bloomberg Markets',url: 'https://feeds.bloomberg.com/markets/news.rss' },
    { name: 'Bloomberg Tech',   url: 'https://feeds.bloomberg.com/technology/news.rss' },
    { name: 'CNBC Finance',     url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
    { name: 'MarketWatch',      url: 'https://feeds.marketwatch.com/marketwatch/topstories/' },
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
    { name: 'Business Insider', url: 'https://feeds.businessinsider.com/custom/all' },
    { name: 'Forbes Tech',      url: 'https://www.forbes.com/innovation/feed/' },
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

  // L1 — in-memory cache (per serverless instance, fastest)
  if (cache[category] && now - cache[category].ts < (cache[category].ttl || CACHE_TTL)) {
    res.setHeader('X-Cache', 'HIT-MEMORY');
    return res.status(200).json(cache[category].data);
  }

  // L2 — MongoDB cache (shared across instances, survives cold starts)
  const mongoData = await readCache(category);
  if (mongoData) {
    // Warm the L1 cache from MongoDB so next request is instant
    cache[category] = { data: mongoData, ts: now, ttl: CACHE_TTL };
    res.setHeader('X-Cache', 'HIT-MONGO');
    return res.status(200).json(mongoData);
  }

  // L3 — fetch from RSS sources (deduplicated to prevent thundering herd)
  const data = await dedupe(`news:${category}`, async () => {
    const results = await Promise.allSettled(feeds.map(fetchFeed));
    let items = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.length > 0).length;
    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    const result = {
      items, total: items.length,
      sourcesOk: successCount, sourcesTotal: feeds.length,
      updatedAt: new Date().toISOString(),
      cacheSource: 'live',
    };

    const ttl = items.length > 0 ? CACHE_TTL : 60 * 1000;
    // Write to both caches
    cache[category] = { data: result, ts: Date.now(), ttl };
    await writeCache(category, result, ttl / 1000);
    recordFetch(category, result);
    return result;
  });

  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  return res.status(200).json(data);
}
