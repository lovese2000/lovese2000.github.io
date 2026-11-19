#!/usr/bin/env python3
"""Content-parity check for the Eleventy migration.

Compares the built site (_site) against the original single-page index.html and
fails if any text node, project field, publication record or image reference was
lost. Run from the my-portfolio directory:

    python tools/verify-content.py

The original page is expected at ../index.html (the migration source).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from lxml import html as LH

ROOT = Path(__file__).resolve().parent.parent
ORIGINAL = (ROOT / ".." / "index.html").resolve()
SITE = ROOT / "_site"
SRC = ROOT / "src"

errors: list[str] = []
warnings: list[str] = []


def norm(value: str) -> str:
    return " ".join(str(value).split())


def read_html(path: Path):
    return LH.fromstring(path.read_text(encoding="utf-8"))


# Text that is intentionally not carried over because it is not content:
# icons/arrows that only existed in the removed modal, and the noscript notice
# that told visitors to enable JavaScript for lists that are now server-rendered.
IGNORED = {
    "✕", "←", "→", "↘", "↗", "·", "/", "—", "|", "中", "EN", "LB",
    "请启用 JavaScript 查看作品与出版列表。 / Please enable JavaScript to view works and publications.",
}

if not SITE.exists():
    sys.exit("missing _site — run `npm run build` first")
if not ORIGINAL.exists():
    sys.exit(f"missing original page: {ORIGINAL}")

original = read_html(ORIGINAL)
for bad in original.cssselect("script, style, noscript"):
    bad.getparent().remove(bad)

original_nodes: list[str] = []
for node in original.iter():
    # Comments such as <!-- HERO --> are markup, not content.
    if not isinstance(node.tag, str):
        continue
    if node.text and norm(node.text):
        original_nodes.append(norm(node.text))
    if node.tail and norm(node.tail):
        original_nodes.append(norm(node.tail))

generated_files = sorted(SITE.rglob("*.html"))
if not generated_files:
    sys.exit("no generated HTML found")

generated_chunks = []
for path in generated_files:
    page = read_html(path)
    for bad in page.cssselect("script, style"):
        bad.getparent().remove(bad)
    generated_chunks.append(norm(page.text_content()))
generated_text = " \n ".join(generated_chunks)

missing_text = []
for text in original_nodes:
    if len(text) < 2 or text in IGNORED:
        continue
    if text not in generated_text:
        missing_text.append(text)

if missing_text:
    errors.append(f"{len(missing_text)} original text node(s) missing from the built site:")
    errors.extend(f"  - {text}" for text in missing_text)

# ------------------------------------------------------------------ project data
data_match = re.search(r"const DATA = (\{.*?\});", ORIGINAL.read_text(encoding="utf-8"), re.S)
if not data_match:
    sys.exit("could not re-read DATA payload from the original page")
DATA = json.loads(data_match.group(1))

project_pages = sorted(SITE.glob("projects/*/index.html"))
if len(project_pages) != len(DATA["projects"]):
    errors.append(
        f"expected {len(DATA['projects'])} project pages, found {len(project_pages)}"
    )

for project in DATA["projects"]:
    page_path = SITE / "projects" / project["slug"] / "index.html"
    if not page_path.exists():
        errors.append(f"missing project page for slug {project['slug']}")
        continue
    page_text = norm(read_html(page_path).text_content())
    checks = {
        "title": project["cn"],
        "titleEn": project["en"],
        "year": project["year"],
        "team": project["team"],
        "descCn": project["descCn"],
        "descEn": project["descEn"],
    }
    for key, value in checks.items():
        if norm(value) not in page_text:
            errors.append(f"{project['slug']}: {key} not found on project page: {value!r}")
    for key in ("locationCn", "locationEn"):
        if project[key] and norm(project[key]) not in page_text:
            errors.append(f"{project['slug']}: {key} not found: {project[key]!r}")
    for tag in [t.strip() for t in project["tags"].split(",") if t.strip()]:
        if norm(tag) not in page_text:
            errors.append(f"{project['slug']}: tag not found: {tag!r}")
    for image in project["images"]:
        expected_ref = image.replace("assets/img/", "/imgs/")
        if expected_ref not in page_path.read_text(encoding="utf-8"):
            errors.append(f"{project['slug']}: image not referenced: {expected_ref}")
    if project["url"] and project["url"] not in page_path.read_text(encoding="utf-8"):
        errors.append(f"{project['slug']}: project url not linked: {project['url']}")

# ------------------------------------------------------------------ publications
home_text = norm(read_html(SITE / "index.html").text_content())
for pub in DATA["pubs"]:
    for key in ("title", "source", "authors", "year", "typeCn", "type"):
        if norm(pub[key]) not in home_text:
            errors.append(f"publication {pub['title']!r}: {key} missing from home page")

# ------------------------------------------------------------------ structure counts
def count(selector: str, page: Path) -> int:
    return len(read_html(page).cssselect(selector))


home = SITE / "index.html"
assertions = {
    ".works-grid .work": 15,
    "#pubList .pub": 25,
    ".research-row": 4,
    ".contact-grid > div": 3,
    ".site-nav a": 5,
    ".hero-stats > div": 3,
}
for selector, expected in assertions.items():
    actual = count(selector, home)
    if actual != expected:
        errors.append(f"home page: expected {expected} × {selector!r}, found {actual}")

about = SITE / "about" / "index.html"
if count(".facts > div", about) != 4:
    errors.append("about page: expected 4 fact rows")
if count(".timeline li", about) != 6:
    errors.append("about page: expected 6 timeline entries")

# ------------------------------------------------------------------ images
images_source = ROOT / ".." / "assets" / "img"
source_images = sorted(p.name for p in images_source.iterdir() if p.is_file())
copied_images = sorted(p.name for p in (SITE / "imgs").iterdir() if p.is_file())
if source_images != copied_images:
    errors.append(
        f"image set mismatch: source {len(source_images)}, site {len(copied_images)}"
    )
    errors.append(f"  missing: {sorted(set(source_images) - set(copied_images))}")
    errors.append(f"  extra: {sorted(set(copied_images) - set(source_images))}")

image_refs = set()
for path in list(SRC.rglob("*.md")) + list(SRC.rglob("*.njk")) + list(SRC.rglob("*.json")):
    image_refs.update(re.findall(r"/imgs/[A-Za-z0-9._-]+", path.read_text(encoding="utf-8")))
for ref in sorted(image_refs):
    if not (SITE / ref.lstrip("/")).exists():
        errors.append(f"broken image reference: {ref}")

# ------------------------------------------------------------------ stale refs
for path in list(SRC.rglob("*.md")) + list(SRC.rglob("*.njk")) + list(SRC.rglob("*.json")) + [
    ROOT / "src" / "assets" / "style.css",
    ROOT / "src" / "assets" / "main.js",
]:
    text = path.read_text(encoding="utf-8")
    if "assets/img" in text:
        errors.append(f"stale assets/img reference in {path.relative_to(ROOT)}")

# ------------------------------------------------------------------ meta
home_html = (SITE / "index.html").read_text(encoding="utf-8")
for expected in [
    "李飚 — 建筑生成设计与数字建造 / Li Biao",
    "jz.generator@gmail.com",
    "https://arch.seu.edu.cn/lb/main.psp",
    "https://archialgo.com/",
    "https://archialgo.com/publications/",
    "application/ld+json",
]:
    if expected not in home_html:
        errors.append(f"home page is missing: {expected!r}")

# ------------------------------------------------------------------ report
print(f"original text nodes checked: {len(original_nodes)}")
print(f"generated pages: {len(generated_files)}")
print(f"project pages: {len(project_pages)} | publications: {len(DATA['pubs'])}")
print(f"images copied: {len(copied_images)} | image references: {len(image_refs)}")
for warning in warnings:
    print("WARN:", warning)
if errors:
    print("\nFAILED — content parity errors:\n")
    for error in errors:
        print(error)
    sys.exit(1)
print("\nOK — no content lost. All original text, project fields, publications and images are present.")
