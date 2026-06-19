#!/usr/bin/env python3
"""
PankuWire — RSS Feed Health Checker
====================================
Pings all RSS feeds used by PankuWire, measures response time,
and produces a markdown report showing healthy, slow, or dead feeds.
This file mirrors pages/api/news.js exactly — keep them in sync.

Usage:
    python3 scripts/feed_health.py
    python3 scripts/feed_health.py --timeout 8 --workers 30
    python3 scripts/feed_health.py --output report.md
    python3 scripts/feed_health.py --dead-only

Requirements:
    pip install requests
"""

import argparse
import concurrent.futures
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

try:
    import requests
except ImportError:
    print("Missing dependency: pip install requests")
    sys.exit(1)


# ── FEEDS — mirrors pages/api/news.js exactly ─────────────────────────────────

FEEDS = {
    "India": [
        ("The Hindu",         "https://www.thehindu.com/feeder/default.rss"),
        ("NDTV",              "https://feeds.feedburner.com/ndtvnews-top-stories"),
        ("Economic Times",    "https://economictimes.indiatimes.com/rssfeedstopstories.cms"),
        ("Mint",              "https://www.livemint.com/rss/news"),
        ("Business Standard", "https://www.business-standard.com/rss/home_page_top_stories.rss"),
        ("Times of India",    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"),
        ("Indian Express",    "https://indianexpress.com/feed/"),
        ("MoneyControl",      "https://www.moneycontrol.com/rss/latestnews.xml"),
        ("Scroll.in",         "https://scroll.in/feed"),
        ("Analytics India",   "https://analyticsindiamag.com/feed/"),
        ("The Wire",          "https://thewire.in/feed"),
        ("Outlook India",     "https://www.outlookindia.com/rss"),
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
        ("IEEE AI",           "https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss"),
    ],
    "Science": [
        ("Phys.org",          "https://phys.org/rss-feed/"),
        ("ScienceDaily",      "https://www.sciencedaily.com/rss/all.xml"),
        ("Quanta Mag",        "https://www.quantamagazine.org/feed/"),
        ("New Scientist",     "https://www.newscientist.com/feed/home/"),
        ("Live Science",      "https://www.livescience.com/feeds/all"),
        ("Popular Sci",       "https://www.popsci.com/feed/"),
        ("Science Alert",     "https://www.sciencealert.com/feed"),
        ("Discover Mag",      "https://www.discovermagazine.com/rss"),
        ("Scientific Am",     "https://rss.sciam.com/ScientificAmerican-Global"),
        ("Ars Science",       "https://feeds.arstechnica.com/arstechnica/science"),
    ],
    "Space": [
        ("NASA News",         "https://www.nasa.gov/news-release/feed/"),
        ("SpaceNews",         "https://spacenews.com/feed/"),
        ("Space.com",         "https://www.space.com/feeds/all"),
        ("SpaceflightNow",    "https://spaceflightnow.com/feed/"),
        ("Universe Today",    "https://www.universetoday.com/feed/"),
        ("arXiv Astrophys",   "https://arxiv.org/rss/astro-ph"),
        ("Spaceflight101",    "https://spaceflight101.com/feed/"),
        ("NASA JPL",          "https://www.jpl.nasa.gov/feeds/news"),
        ("Astronomy Mag",     "https://astronomy.com/rss/news"),
        ("Bad Astronomy",     "https://www.syfy.com/tags/bad-astronomy/rss"),
    ],
    "Physics": [
        ("arXiv Physics",     "https://arxiv.org/rss/physics"),
        ("arXiv HEP",         "https://arxiv.org/rss/hep-ph"),
        ("arXiv Cond-Mat",    "https://arxiv.org/rss/cond-mat"),
        ("Fermilab",          "https://news.fnal.gov/feed/"),
        ("Phys.org",          "https://phys.org/rss-feed/"),
        ("ScienceDaily Phys", "https://www.sciencedaily.com/rss/matter_energy/physics.xml"),
        ("Quanta Physics",    "https://www.quantamagazine.org/physics/feed/"),
        ("New Scientist",     "https://www.newscientist.com/feed/home/"),
    ],
    "Quantum": [
        ("arXiv Quantum",     "https://arxiv.org/rss/quant-ph"),
        ("Quanta Physics",    "https://www.quantamagazine.org/physics/feed/"),
        ("ScienceDaily QP",   "https://www.sciencedaily.com/rss/matter_energy/quantum_physics.xml"),
        ("Phys.org",          "https://phys.org/rss-feed/"),
        ("New Scientist",     "https://www.newscientist.com/feed/home/"),
        ("IBM Research",      "https://research.ibm.com/blog/feed"),
        ("arXiv Cond-Mat",    "https://arxiv.org/rss/cond-mat"),
    ],
    "EV & Auto": [
        ("Electrek",          "https://electrek.co/feed/"),
        ("CleanTechnica",     "https://cleantechnica.com/feed/"),
        ("Teslarati",         "https://www.teslarati.com/feed/"),
        ("Car and Driver",    "https://www.caranddriver.com/rss/all.xml/"),
        ("The Drive",         "https://www.thedrive.com/feed"),
        ("Charged EVs",       "https://chargedevs.com/feed/"),
        ("EV Magazine",       "https://evmagazine.com/feed/"),
        ("Wired Transport",   "https://www.wired.com/feed/category/transportation/latest/rss"),
        ("Ars Cars",          "https://feeds.arstechnica.com/arstechnica/cars"),
        ("TechCrunch EV",     "https://techcrunch.com/tag/electric-vehicles/feed/"),
    ],
    "Geopolitics": [
        ("BBC World",         "http://feeds.bbci.co.uk/news/world/rss.xml"),
        ("Al Jazeera",        "https://www.aljazeera.com/xml/rss/all.xml"),
        ("Guardian World",    "https://www.theguardian.com/world/rss"),
        ("Foreign Policy",    "https://foreignpolicy.com/feed/"),
        ("The Diplomat",      "https://thediplomat.com/feed/"),
        ("AP News",           "https://apnews.com/apf-topnews"),
        ("DW World",          "https://rss.dw.com/xml/rss-en-world"),
        ("France 24",         "https://www.france24.com/en/rss"),
        ("NPR World",         "https://feeds.npr.org/1004/rss.xml"),
        ("The Hindu World",   "https://www.thehindu.com/news/international/feeder/default.rss"),
    ],
    "Business": [
        ("Bloomberg Markets", "https://feeds.bloomberg.com/markets/news.rss"),
        ("Bloomberg Tech",    "https://feeds.bloomberg.com/technology/news.rss"),
        ("CNBC Finance",      "https://www.cnbc.com/id/10000664/device/rss/rss.html"),
        ("MarketWatch",       "https://feeds.marketwatch.com/marketwatch/topstories/"),
        ("WSJ Markets",       "https://feeds.a.dj.com/rss/RSSMarketsMain.xml"),
        ("WSJ Tech",          "https://feeds.a.dj.com/rss/RSSWSJD.xml"),
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
        ("Business Insider",  "https://feeds.businessinsider.com/custom/all"),
        ("Forbes Tech",       "https://www.forbes.com/innovation/feed/"),
    ],
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

SLOW_THRESHOLD_S = 3.0
DEAD_THRESHOLD_S = 10.0


@dataclass
class FeedResult:
    category: str
    name: str
    url: str
    status: str
    http_code: Optional[int] = None
    response_ms: Optional[int] = None
    error: Optional[str] = None
    items_found: int = 0


def check_feed(category: str, name: str, url: str, timeout: float) -> FeedResult:
    start = time.time()
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        elapsed_ms = int((time.time() - start) * 1000)
        items = resp.text.count("<item>") + resp.text.count("<entry>")

        if resp.status_code >= 400:
            return FeedResult(category=category, name=name, url=url,
                status="dead", http_code=resp.status_code, response_ms=elapsed_ms,
                error=f"HTTP {resp.status_code}")

        status = "slow" if elapsed_ms / 1000 > SLOW_THRESHOLD_S else "healthy"
        return FeedResult(category=category, name=name, url=url,
            status=status, http_code=resp.status_code,
            response_ms=elapsed_ms, items_found=items)

    except requests.exceptions.Timeout:
        return FeedResult(category=category, name=name, url=url,
            status="dead", response_ms=int((time.time() - start) * 1000),
            error=f"Timeout after {timeout}s")
    except Exception as e:
        return FeedResult(category=category, name=name, url=url,
            status="dead", response_ms=int((time.time() - start) * 1000),
            error=str(e)[:80])


def generate_report(results: list, elapsed_total: float) -> str:
    healthy = [r for r in results if r.status == "healthy"]
    slow    = [r for r in results if r.status == "slow"]
    dead    = [r for r in results if r.status == "dead"]
    avg_ms  = int(sum(r.response_ms for r in results if r.response_ms) / max(len(results), 1))

    lines = [
        "# PankuWire — RSS Feed Health Report",
        f"\nGenerated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"Total: {len(results)} | Healthy: {len(healthy)} | "
        f"Slow (>{SLOW_THRESHOLD_S}s): {len(slow)} | Dead: {len(dead)} | "
        f"Scan: {elapsed_total:.1f}s | Avg: {avg_ms}ms\n",
        "## Summary by Category\n",
        "| Category | Total | Healthy | Slow | Dead |",
        "|---|---|---|---|---|",
    ]

    for cat in sorted(set(r.category for r in results)):
        cr = [r for r in results if r.category == cat]
        h = sum(1 for r in cr if r.status == "healthy")
        s = sum(1 for r in cr if r.status == "slow")
        d = sum(1 for r in cr if r.status == "dead")
        icon = "✅" if d == 0 else ("⚠️" if d < len(cr) / 2 else "❌")
        lines.append(f"| {icon} {cat} | {len(cr)} | {h} | {s} | {d} |")

    if dead:
        lines += ["\n## Dead Feeds\n"]
        for r in sorted(dead, key=lambda x: x.category):
            lines.append(f"- **[{r.category}] {r.name}** — {r.error} ({r.response_ms}ms) `{r.url}`")

    if slow:
        lines += ["\n## Slow Feeds\n"]
        for r in sorted(slow, key=lambda x: -(x.response_ms or 0)):
            lines.append(f"- **[{r.category}] {r.name}** — {r.response_ms}ms `{r.url}`")

    lines += ["\n## Full Results\n"]
    for cat in sorted(set(r.category for r in results)):
        lines += [f"### {cat}\n", "| Feed | Status | HTTP | Response | Items |", "|---|---|---|---|---|"]
        for r in [x for x in results if x.category == cat]:
            icon  = {"healthy": "✅", "slow": "⚠️", "dead": "❌"}.get(r.status, "?")
            code  = str(r.http_code) if r.http_code else "—"
            ms    = f"{r.response_ms}ms" if r.response_ms else "—"
            items = str(r.items_found) if r.items_found else "—"
            err   = f" ({r.error})" if r.error else ""
            lines.append(f"| {r.name} | {icon} {r.status}{err} | {code} | {ms} | {items} |")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="PankuWire RSS feed health checker")
    parser.add_argument("--timeout",   type=float, default=10.0)
    parser.add_argument("--workers",   type=int,   default=20)
    parser.add_argument("--output",    type=str,   default=None)
    parser.add_argument("--dead-only", action="store_true")
    args = parser.parse_args()

    all_feeds = [(cat, name, url) for cat, feeds in FEEDS.items() for name, url in feeds]
    total = len(all_feeds)

    print(f"PankuWire Feed Health Checker")
    print(f"Checking {total} feeds with {args.workers} workers (timeout={args.timeout}s)...\n")

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
                ms  = f"{result.response_ms}ms" if result.response_ms else "timeout"
                err = f" — {result.error}" if result.error else ""
                print(f"[{completed:3d}/{total}] {icon} [{result.category}] {result.name} ({ms}){err}")
            else:
                print(f"[{completed:3d}/{total}] {icon} [{result.category}] {result.name} ({result.response_ms}ms)")

    elapsed = time.time() - start_time
    healthy = sum(1 for r in results if r.status == "healthy")
    slow    = sum(1 for r in results if r.status == "slow")
    dead    = sum(1 for r in results if r.status == "dead")

    print(f"\nDone in {elapsed:.1f}s")
    print(f"Results: {healthy} healthy | {slow} slow | {dead} dead out of {total} feeds")

    report = generate_report(results, elapsed)
    output_path = args.output or f"feed_health_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}.md"
    with open(output_path, "w") as f:
        f.write(report)
    print(f"Report saved to: {output_path}")

    if dead / total > 0.20:
        print(f"WARNING: {dead/total:.0%} of feeds are dead (threshold: 20%)")
        sys.exit(1)


if __name__ == "__main__":
    main()
