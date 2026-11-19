"""Crawl the local preview and verify every internal link, asset and image is served."""
from __future__ import annotations

import sys
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

BASE = "http://127.0.0.1:8080"
seen: set[str] = set()
queue: list[str] = [BASE + "/"]
failures: list[tuple[str, str, int]] = []
pages: list[str] = []


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls: list[str] = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        for name in ("href", "src"):
            value = values.get(name)
            if value and not value.startswith(("mailto:", "data:", "javascript:", "#")):
                self.urls.append(value)


def fetch(url: str):
    request = urllib.request.Request(url, headers={"User-Agent": "parity-check"})
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.status, response.headers.get("Content-Type", ""), response.read()


while queue:
    url = queue.pop(0)
    if url in seen:
        continue
    seen.add(url)
    try:
        status, content_type, body = fetch(url)
    except urllib.error.HTTPError as error:
        failures.append((url, str(error), error.code))
        continue
    except Exception as error:  # noqa: BLE001 - report, don't crash the crawl
        failures.append((url, str(error), 0))
        continue
    if status != 200:
        failures.append((url, f"HTTP {status}", status))
        continue
    if "text/html" in content_type:
        pages.append(url)
        parser = Links()
        parser.feed(body.decode("utf-8", errors="replace"))
        for raw in parser.urls:
            absolute = urllib.parse.urljoin(url, raw)
            parsed = urllib.parse.urlparse(absolute)
            if parsed.netloc in ("127.0.0.1:8080", "localhost:8080"):
                clean = urllib.parse.urlunparse(parsed._replace(query="", fragment=""))
                if clean not in seen:
                    queue.append(clean)

print(f"pages crawled: {len(pages)}")
print(f"urls fetched: {len(seen)}")
for page in sorted(pages):
    print("  page", page)
if failures:
    print("\nFAILED:")
    for url, message, status in failures:
        print(f"  {status} {url} — {message}")
    sys.exit(1)
print("\nOK — every internal page, stylesheet, script and image returns HTTP 200.")
