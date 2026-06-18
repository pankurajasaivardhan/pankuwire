

import argparse
import concurrent.futures
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

try:
    import requests
except ImportError:
    print("Missing dependency: pip install requests")
    sys.exit(1)


# ── All RSS feeds from PankuWire (mirrors pages/api/news.js) ──────────────────

FEEDS = {
    "India": [
        ("The Hindu",         "https://www.thehindu.com/feeder/default.rss"),
        ("NDTV",              "https://feeds.feedburner.com/ndtvnews-top-stories"),
        ("Economic Times",    "https://economictimes.indiatimes.com/rssfeedstopstories.cms"),
        ("Mint",              "https://www.livemint.com/rss/news"),
        ("Business Standard", "https://www.business-standard.com/rss/home_page_top_stories.rss"),
        ("Financial Express", "https://www.financialexpress.com/feed/"),
        ("Times of India",    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"),
        ("Indian Express",    "https://indianexpress.com/feed/"),
        ("The Print",         "https://theprint.in/feed/"),
        ("MoneyControl",      "https://www.moneycontrol.com/rss/latestnews.xml"),
        ("Scroll.in",         "https://scroll.in/feed"),
        ("Analytics India",   "https://analyticsindiamag.com/feed/"),
    ],
    "Tech": [
        ("TechCrunch",        "https://techcrunch.com/feed/"),
        ("Ars Technica",      "https://feeds.arstechnica.com/arstechnica/index"),
        ("The Verge",         "https://www.theverge.com/rss/index.xml"),
        ("Wired",             "https://www.wired.com/feed/rss"),
        ("Hacker News",       "https://news.ycombinator.com/rss"),
        ("MIT Tech Review",   "https://www.technologyreview.com/feed/"),
        ("VentureBeat",       "https://venturebeat.com/feed/"),
        ("Engadget",          "https://www.engadget.com/rss.xml"),
        ("CNET",              "https://www.cnet.com/rss/news/"),
        ("IEEE Spectrum",     "https://spectrum.ieee.org/feeds/feed.rss"),
        ("ZDNet",             "https://www.zdnet.com/news/rss.xml"),
        ("Gizmodo",           "https://gizmodo.com/rss"),
    ],
    "AI & ML": [
        ("arXiv CS.AI",       "https://arxiv.org/rss/cs.AI"),
        ("arXiv CS.LG",       "https://arxiv.org/rss/cs.LG"),
        ("arXiv CS.CV",       "https://arxiv.org/rss/cs.CV"),
        ("arXiv CS.CL",       "https://arxiv.org/rss/cs.CL"),
        ("Google AI Blog",    "https://blog.research.google/feeds/posts/default"),
        ("Hugging Face",      "https://huggingface.co/blog/feed.xml"),
        ("VentureBeat AI",    "https://venturebeat.com/category/ai/feed/"),
        ("MIT Tech AI",       "https://www.technologyreview.com/topic/artificial-intelligence/feed/"),
        ("TechCrunch AI",     "https://techcrunch.com/category/artificial-intelligence/feed/"),
        ("The Verge AI",      "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"),
        ("Wired AI",          "https://www.wired.com/feed/category/artificial-intelligence/latest/rss"),
    ],
    "Science": [
        ("Phys.org",          "https://phys.org/rss-feed/"),
        ("ScienceDaily",      "https://www.sciencedaily.com/rss/all.xml"),
        ("Quanta Mag",        "https://www.quantamagazine.org/feed/"),
        ("New Scientist",     "https://www.newscientist.com/feed/home/"),
        ("Live Science",      "https://www.livescience.com/feeds/all"),
        ("EurekAlert",        "https://www.eurekalert.org/rss.xml"),
        ("Nature News",       "https://www.nature.com/news.rss"),
        ("Cosmos Mag",        "https://cosmosmagazine.com/feed/"),
        ("IFL Science",       "https://www.iflscience.com/backend/feeds/rss"),
        ("Popular Sci",       "https://www.popsci.com/feed/"),
    ],
    "Space": [
        ("NASA News",         "https://www.nasa.gov/news-release/feed/"),
        ("SpaceNews",         "https://spacenews.com/feed/"),
        ("Space.com",         "https://www.space.com/feeds/all"),
        ("SpaceflightNow",    "https://spaceflightnow.com/feed/"),
        ("Universe Today",    "https://www.universetoday.com/feed/"),
        ("NASASpaceflight",   "https://www.nasaspaceflight.com/feed/"),
        ("Planetary Society", "https://www.planetary.org/feed"),
        ("ESA News",          "https://www.esa.int/rssfeed.xml"),
        ("arXiv Astrophys",   "https://arxiv.org/rss/astro-ph"),
        ("Sky & Telescope",   "https://skyandtelescope.org/feed/"),
    ],
    "Physics": [
        ("arXiv Physics",     "https://arxiv.org/rss/physics"),
        ("arXiv HEP",         "https://arxiv.org/rss/hep-ph"),
        ("arXiv Cond-Mat",    "https://arxiv.org/rss/cond-mat"),
        ("Fermilab",          "https://news.fnal.gov/feed/"),
        ("CERN News",         "https://home.cern/api/news/news/feed.rss"),
        ("APS Physics",       "https://physics.aps.org/rss/recent.xml"),
        ("Physics World",     "https://physicsworld.com/feed/"),
    ],
    "Quantum": [
        ("arXiv Quantum",     "https://arxiv.org/rss/quant-ph"),
        ("Quanta Physics",    "https://www.quantamagazine.org/physics/feed/"),
        ("Physics World",     "https://physicsworld.com/feed/"),
        ("APS Physics",       "https://physics.aps.org/rss/recent.xml"),
        ("Phys.org Quantum",  "https://phys.org/physics-news/quantum-physics/rss-feed/"),
        ("ScienceDaily QP",   "https://www.sciencedaily.com/rss/matter_energy/quantum_physics.xml"),
        ("CERN News",         "https://home.cern/api/news/news/feed.rss"),
    ],
    "EV & Auto": [
        ("Electrek",          "https://electrek.co/feed/"),
        ("InsideEVs",         "https://insideevs.com/feed/all/"),
        ("CleanTechnica",     "https://cleantechnica.com/feed/"),
        ("Green Car Reports", "https://www.greencarreports.com/rss/all.xml"),
        ("Teslarati",         "https://www.teslarati.com/feed/"),
        ("Motor Trend",       "https://www.motortrend.com/rss/all/"),
        ("Car and Driver",    "https://www.caranddriver.com/rss/all.xml/"),
        ("Autoblog",          "https://www.autoblog.com/rss.xml"),
        ("The Drive",         "https://www.thedrive.com/feed"),
        ("Charged EVs",       "https://chargedevs.com/feed/"),
    ],
    "Geopolitics": [
        ("Reuters World",     "https://feeds.reuters.com/reuters/worldNews"),
        ("BBC World",         "http://feeds.bbci.co.uk/news/world/rss.xml"),
        ("Al Jazeera",        "https://www.aljazeera.com/xml/rss/all.xml"),
        ("Guardian World",    "https://www.theguardian.com/world/rss"),
        ("Foreign Policy",    "https://foreignpolicy.com/feed/"),
        ("The Diplomat",      "https://thediplomat.com/feed/"),
        ("AP News",           "https://apnews.com/apf-topnews"),
        ("DW World",          "https://rss.dw.com/xml/rss-en-world"),
        ("France 24",         "https://www.france24.com/en/rss"),
        ("NPR World",         "https://feeds.npr.org/1004/rss.xml"),
    ],
    "Business": [
        ("Reuters Business",  "https://feeds.reuters.com/reuters/businessNews"),
        ("Bloomberg Markets", "https://feeds.bloomberg.com/markets/news.rss"),
        ("CNBC Finance",      "https://www.cnbc.com/id/10000664/device/rss/rss.html"),
        ("MarketWatch",       "https://feeds.marketwatch.com/marketwatch/topstories/"),
        ("WSJ Markets",       "https://feeds.a.dj.com/rss/RSSMarketsMain.xml"),
        ("FT Markets",        "https://www.ft.com/rss/home/uk"),
        ("ET Markets",        "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"),
        ("Mint Markets",      "https://www.livemint.com/rss/markets"),
        ("Abnormal Returns",  "https://abnormalreturns.com/feed/"),
        ("Hedgeweek",         "https://www.hedgeweek.com/feed/"),
        ("arXiv q-fin",       "https://arxiv.org/rss/q-fin"),
        ("Google Blog",       "https://blog.google/rss/"),
        ("Microsoft Blog",    "https://blogs.microsoft.com/feed/"),
        ("NVIDIA News",       "https://nvidianews.nvidia.com/rss"),
        ("Apple Newsroom",    "https://www.apple.com/newsroom/rss-feed.rss"),
        ("Crunchbase News",   "https://news.crunchbase.com/feed/"),
        ("TechCrunch Starts", "https://techcrunch.com/category/startups/feed/"),
    ],
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

SLOW_THRESHOLD_S = 3.0   # seconds — warn if response takes longer
DEAD_THRESHOLD_S = 10.0  # seconds — mark as dead if no response


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class FeedResult:
    category: str
    name: str
    url: str
    status: str        # "healthy" | "slow" | "dead" | "error"
    http_code: Optional[int] = None
    response_ms: Optional[int] = None
    error: Optional[str] = None
    items_found: int = 0


# ── Core check function ───────────────────────────────────────────────────────

def check_feed(category: str, name: str, url: str, timeout: float) -> FeedResult:
    start = time.time()
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        elapsed_ms = int((time.time() - start) * 1000)
        elapsed_s = elapsed_ms / 1000

        # Count <item> or <entry> tags as a proxy for article count
        items = resp.text.count("<item>") + resp.text.count("<entry>")

        if resp.status_code >= 400:
            return FeedResult(
                category=category, name=name, url=url,
                status="dead", http_code=resp.status_code,
                response_ms=elapsed_ms,
                error=f"HTTP {resp.status_code}",
            )

        status = "slow" if elapsed_s > SLOW_THRESHOLD_S else "healthy"
        return FeedResult(
            category=category, name=name, url=url,
            status=status, http_code=resp.status_code,
            response_ms=elapsed_ms, items_found=items,
        )

    except requests.exceptions.Timeout:
        elapsed_ms = int((time.time() - start) * 1000)
        return FeedResult(
            category=category, name=name, url=url,
            status="dead", response_ms=elapsed_ms,
            error=f"Timeout after {timeout}s",
        )
    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)
        return FeedResult(
            category=category, name=name, url=url,
            status="dead", response_ms=elapsed_ms,
            error=str(e)[:80],
        )


# ── Report generation ─────────────────────────────────────────────────────────

def generate_report(results: list[FeedResult], elapsed_total: float) -> str:
    healthy = [r for r in results if r.status == "healthy"]
    slow    = [r for r in results if r.status == "slow"]
    dead    = [r for r in results if r.status == "dead"]

    avg_ms = int(sum(r.response_ms for r in results if r.response_ms) / max(len(results), 1))

    lines = [
        "# PankuWire — RSS Feed Health Report",
        f"\nGenerated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"Total feeds checked: {len(results)} | "
        f"Healthy: {len(healthy)} | Slow (>{SLOW_THRESHOLD_S}s): {len(slow)} | "
        f"Dead: {len(dead)} | Scan time: {elapsed_total:.1f}s | Avg response: {avg_ms}ms",
        "",
    ]

    # Summary table
    lines += [
        "## Summary by Category",
        "",
        "| Category | Total | Healthy | Slow | Dead |",
        "|---|---|---|---|---|",
    ]
    categories = sorted(set(r.category for r in results))
    for cat in categories:
        cat_results = [r for r in results if r.category == cat]
        h = sum(1 for r in cat_results if r.status == "healthy")
        s = sum(1 for r in cat_results if r.status == "slow")
        d = sum(1 for r in cat_results if r.status == "dead")
        icon = "✅" if d == 0 else ("⚠️" if d < len(cat_results) / 2 else "❌")
        lines.append(f"| {icon} {cat} | {len(cat_results)} | {h} | {s} | {d} |")

    # Dead feeds
    if dead:
        lines += ["", "## Dead Feeds", ""]
        for r in sorted(dead, key=lambda x: x.category):
            lines.append(f"- **[{r.category}] {r.name}** — {r.error or 'no response'} "
                         f"({r.response_ms}ms) `{r.url}`")

    # Slow feeds
    if slow:
        lines += ["", "## Slow Feeds", ""]
        for r in sorted(slow, key=lambda x: -(x.response_ms or 0)):
            lines.append(f"- **[{r.category}] {r.name}** — {r.response_ms}ms "
                         f"(HTTP {r.http_code}) `{r.url}`")

    # Full results per category
    lines += ["", "## Full Results", ""]
    for cat in categories:
        lines.append(f"### {cat}")
        lines.append("")
        lines.append("| Feed | Status | HTTP | Response | Items |")
        lines.append("|---|---|---|---|---|")
        for r in [x for x in results if x.category == cat]:
            icon = {"healthy": "✅", "slow": "⚠️", "dead": "❌"}.get(r.status, "?")
            code  = str(r.http_code) if r.http_code else "—"
            ms    = f"{r.response_ms}ms" if r.response_ms else "—"
            items = str(r.items_found) if r.items_found else "—"
            error = f" ({r.error})" if r.error else ""
            lines.append(f"| {r.name} | {icon} {r.status}{error} | {code} | {ms} | {items} |")
        lines.append("")

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PankuWire RSS feed health checker")
    parser.add_argument("--timeout",  type=float, default=10.0, help="Request timeout in seconds (default: 10)")
    parser.add_argument("--workers",  type=int,   default=20,   help="Concurrent workers (default: 20)")
    parser.add_argument("--output",   type=str,   default=None, help="Save markdown report to file")
    parser.add_argument("--dead-only",action="store_true",      help="Only show dead/slow feeds")
    args = parser.parse_args()

    # Flatten all feeds
    all_feeds = [
        (category, name, url)
        for category, feeds in FEEDS.items()
        for name, url in feeds
    ]

    total = len(all_feeds)
    print(f"PankuWire Feed Health Checker")
    print(f"Checking {total} feeds with {args.workers} workers (timeout={args.timeout}s)...")
    print()

    results = []
    completed = 0
    start_time = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(check_feed, cat, name, url, args.timeout): (cat, name, url)
            for cat, name, url in all_feeds
        }
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            results.append(result)
            completed += 1

            icon = {"healthy": "✅", "slow": "⚠️", "dead": "❌"}.get(result.status, "?")
            if not args.dead_only or result.status != "healthy":
                ms = f"{result.response_ms}ms" if result.response_ms else "timeout"
                err = f" — {result.error}" if result.error else ""
                print(f"[{completed:3d}/{total}] {icon} [{result.category}] {result.name} ({ms}){err}")
            else:
                # Print a simple progress dot for healthy feeds
                print(f"[{completed:3d}/{total}] ✅ [{result.category}] {result.name} ({result.response_ms}ms)")

    elapsed = time.time() - start_time

    # Summary
    healthy = sum(1 for r in results if r.status == "healthy")
    slow    = sum(1 for r in results if r.status == "slow")
    dead    = sum(1 for r in results if r.status == "dead")

    print()
    print(f"Done in {elapsed:.1f}s")
    print(f"Results: {healthy} healthy | {slow} slow | {dead} dead out of {total} feeds")

    # Generate and save report
    report = generate_report(results, elapsed)

    output_path = args.output or f"feed_health_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}.md"
    with open(output_path, "w") as f:
        f.write(report)
    print(f"Report saved to: {output_path}")

    # Exit with error code if more than 20% feeds are dead (useful for CI)
    dead_pct = dead / total
    if dead_pct > 0.20:
        print(f"WARNING: {dead_pct:.0%} of feeds are dead (threshold: 20%)")
        sys.exit(1)


if __name__ == "__main__":
    main()
