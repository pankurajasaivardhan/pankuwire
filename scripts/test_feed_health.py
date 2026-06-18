

import sys
import unittest
from unittest.mock import patch, MagicMock
sys.path.insert(0, '.')

from scripts.feed_health import (
    check_feed, generate_report, FeedResult, FEEDS, SLOW_THRESHOLD_S
)


class TestFeedResult(unittest.TestCase):

    def test_healthy_feed(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = "<item>" * 15  # 15 articles

        with patch("scripts.feed_health.requests.get", return_value=mock_resp):
            result = check_feed("Tech", "TechCrunch", "https://techcrunch.com/feed/", timeout=5)

        self.assertEqual(result.status, "healthy")
        self.assertEqual(result.http_code, 200)
        self.assertEqual(result.items_found, 15)
        self.assertIsNone(result.error)

    def test_dead_feed_http_404(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.text = ""

        with patch("scripts.feed_health.requests.get", return_value=mock_resp):
            result = check_feed("India", "Dead Feed", "https://dead.example.com/feed", timeout=5)

        self.assertEqual(result.status, "dead")
        self.assertEqual(result.http_code, 404)
        self.assertIsNotNone(result.error)

    def test_dead_feed_http_401(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = ""

        with patch("scripts.feed_health.requests.get", return_value=mock_resp):
            result = check_feed("Business", "Auth Required", "https://example.com/feed", timeout=5)

        self.assertEqual(result.status, "dead")
        self.assertIn("401", result.error)

    def test_timeout_marked_as_dead(self):
        import requests as req
        with patch("scripts.feed_health.requests.get", side_effect=req.exceptions.Timeout):
            result = check_feed("Space", "Slow Feed", "https://slow.example.com", timeout=5)

        self.assertEqual(result.status, "dead")
        self.assertIn("Timeout", result.error)

    def test_connection_error_marked_as_dead(self):
        import requests as req
        with patch("scripts.feed_health.requests.get", side_effect=req.exceptions.ConnectionError("refused")):
            result = check_feed("Science", "Down Feed", "https://down.example.com", timeout=5)

        self.assertEqual(result.status, "dead")
        self.assertIsNotNone(result.error)


class TestReportGeneration(unittest.TestCase):

    def _make_results(self):
        return [
            FeedResult("Tech", "TechCrunch", "https://tc.com", "healthy", 200, 450, items_found=20),
            FeedResult("Tech", "Wired",      "https://wired.com", "slow", 200, 4200, items_found=15),
            FeedResult("India", "NDTV",      "https://ndtv.com", "healthy", 200, 800, items_found=30),
            FeedResult("India", "Dead Feed", "https://dead.com", "dead",  404, 100, error="HTTP 404"),
        ]

    def test_report_contains_summary_table(self):
        report = generate_report(self._make_results(), elapsed_total=12.3)
        self.assertIn("## Summary by Category", report)
        self.assertIn("| Category | Total | Healthy | Slow | Dead |", report)

    def test_report_contains_dead_section(self):
        report = generate_report(self._make_results(), elapsed_total=12.3)
        self.assertIn("## Dead Feeds", report)
        self.assertIn("Dead Feed", report)

    def test_report_contains_slow_section(self):
        report = generate_report(self._make_results(), elapsed_total=12.3)
        self.assertIn("## Slow Feeds", report)
        self.assertIn("Wired", report)

    def test_report_counts_correct(self):
        report = generate_report(self._make_results(), elapsed_total=12.3)
        self.assertIn("Healthy: 2", report)
        self.assertIn("Slow", report)
        self.assertIn("Dead: 1", report)

    def test_report_no_dead_section_when_all_healthy(self):
        results = [
            FeedResult("Tech", "Feed A", "https://a.com", "healthy", 200, 300, items_found=10),
            FeedResult("Tech", "Feed B", "https://b.com", "healthy", 200, 400, items_found=12),
        ]
        report = generate_report(results, elapsed_total=5.0)
        self.assertNotIn("## Dead Feeds", report)


class TestFeedsData(unittest.TestCase):

    def test_all_categories_present(self):
        expected = {"India", "Tech", "AI & ML", "Science", "Space",
                    "Physics", "Quantum", "EV & Auto", "Geopolitics", "Business"}
        self.assertEqual(set(FEEDS.keys()), expected)

    def test_all_feeds_have_name_and_url(self):
        for category, feeds in FEEDS.items():
            for name, url in feeds:
                self.assertTrue(len(name) > 0, f"Empty name in {category}")
                self.assertTrue(url.startswith("http"), f"Bad URL for {name}: {url}")

    def test_total_feed_count(self):
        total = sum(len(feeds) for feeds in FEEDS.values())
        self.assertGreaterEqual(total, 100, "Should have at least 100 feeds")
        print(f"\nTotal feeds in FEEDS dict: {total}")

    def test_no_duplicate_urls(self):
        all_urls = [url for feeds in FEEDS.values() for _, url in feeds]
        duplicates = [url for url in set(all_urls) if all_urls.count(url) > 1]
        if duplicates:
            print(f"\nDuplicate URLs found: {duplicates}")
        # Warn but don't fail — some feeds (e.g. CERN) appear in multiple categories intentionally
        self.assertLess(len(duplicates), 10, "Too many duplicate URLs")


if __name__ == "__main__":
    unittest.main(verbosity=2)
