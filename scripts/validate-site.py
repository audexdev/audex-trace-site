#!/usr/bin/env python3
"""Lightweight consistency checks for the Audex Trace static site.

Verifies, for every HTML page plus the changelog generator template:
  - mobile menu structure (nav id, .header-actions wrapper, menu toggle)
  - single stylesheet/script cache-bust version across all pages
  - every download CTA carries the version from current-release.json
  - raster og:image (PNG) metadata, not SVG
  - skip link targeting <main id="main">
  - sitemap.xml covers every HTML page

Run with no arguments; exits non-zero and prints every finding on failure.
"""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "scripts" / "generate-changelog.py"

findings: list[str] = []


def fail(page: str, message: str) -> None:
    findings.append(f"{page}: {message}")


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.header_depth = 0
        self.in_header = False
        self.nav_ids: list[str] = []
        self.header_actions = 0
        self.menu_toggles = 0
        self.style_versions: list[str] = []
        self.script_versions: list[str] = []
        self.og_images: list[str] = []
        self.og_image_types: list[str] = []
        self.twitter_images: list[str] = []
        self.skip_links: list[str] = []
        self.main_ids: list[str] = []
        self.download_versions: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        classes = (a.get("class") or "").split()

        if tag == "header" and (self.in_header or self.header_depth == 0):
            self.in_header = True
            self.header_depth = 1
            return
        if self.in_header:
            self.header_depth += 1
            if tag == "nav" and a.get("id"):
                self.nav_ids.append(a["id"] or "")
            if "header-actions" in classes:
                self.header_actions += 1
            if "menu-toggle" in classes:
                self.menu_toggles += 1

        if tag == "a" and "skip-link" in classes:
            self.skip_links.append(a.get("href") or "")
        if tag == "main":
            self.main_ids.append(a.get("id") or "")
        if tag == "link" and (a.get("href") or "").startswith("styles.css"):
            self.style_versions.append(a["href"] or "")
        if tag == "script" and (a.get("src") or "").startswith("script.js"):
            self.script_versions.append(a["src"] or "")
        if tag == "meta":
            if a.get("property") == "og:image":
                self.og_images.append(a.get("content") or "")
            if a.get("property") == "og:image:type":
                self.og_image_types.append(a.get("content") or "")
            if a.get("name") == "twitter:image":
                self.twitter_images.append(a.get("content") or "")
        if (a.get("href") or "").startswith("https://trace-auth.audex.dev/download"):
            match = re.search(r"version=([0-9.]+)", a["href"] or "")
            self.download_versions.append(match.group(1) if match else "")

    def handle_endtag(self, tag: str) -> None:
        if self.in_header:
            self.header_depth -= 1
            if self.header_depth <= 0:
                self.in_header = False
                self.header_depth = 0


def check_page(name: str, page: Page, current_version: str) -> None:
    if "primary-navigation" not in page.nav_ids:
        fail(name, "nav lacks id=\"primary-navigation\" (mobile menu cannot be toggled)")
    if page.header_actions != 1:
        fail(name, f"expected 1 .header-actions wrapper, found {page.header_actions}")
    if page.menu_toggles != 1:
        fail(name, f"expected 1 .menu-toggle button, found {page.menu_toggles}")
    if len(page.style_versions) != 1:
        fail(name, f"expected 1 stylesheet link, found {page.style_versions}")
    if len(page.script_versions) != 1:
        fail(name, f"expected 1 script tag, found {page.script_versions}")
    for image in page.og_images + page.twitter_images:
        if not image.endswith("assets/og-image.png"):
            fail(name, f"og/twitter image is not the PNG: {image}")
    for image_type in page.og_image_types:
        if image_type != "image/png":
            fail(name, f"og:image:type is not image/png: {image_type}")
    if page.skip_links != ["#main"]:
        fail(name, f"expected skip link to #main, found {page.skip_links}")
    if "main" not in page.main_ids:
        fail(name, "<main> lacks id=\"main\" (skip link target)")
    if not page.download_versions:
        fail(name, "no download CTA found")
    for version in page.download_versions:
        if version != current_version:
            fail(name, f"download CTA version {version!r} != current-release.json {current_version!r}")


def main() -> int:
    current = json.loads((ROOT / "current-release.json").read_text())
    current_version = current["version"]

    pages: dict[str, Page] = {}
    for path in sorted(ROOT.glob("*.html")):
        page = Page()
        page.feed(path.read_text())
        pages[path.name] = page
        check_page(path.name, page, current_version)

    # Stylesheet / script cache-bust versions must match across all pages.
    style_versions = {v for p in pages.values() for v in p.style_versions}
    script_versions = {v for p in pages.values() for v in p.script_versions}
    if len(style_versions) != 1:
        fail("(all pages)", f"stylesheet cache-bust versions differ: {sorted(style_versions)}")
    if len(script_versions) != 1:
        fail("(all pages)", f"script cache-bust versions differ: {sorted(script_versions)}")

    # The changelog generator embeds its own copy of the chrome; keep it in sync.
    template = TEMPLATE.read_text()
    template_page = Page()
    template_page.feed(template)
    if "primary-navigation" not in template_page.nav_ids:
        fail("generate-changelog.py", "template nav lacks id=\"primary-navigation\"")
    if template_page.header_actions != 1:
        fail("generate-changelog.py", f"template .header-actions count {template_page.header_actions}")
    if template_page.menu_toggles != 1:
        fail("generate-changelog.py", f"template .menu-toggle count {template_page.menu_toggles}")
    if template_page.skip_links != ["#main"]:
        fail("generate-changelog.py", f"template skip link mismatch {template_page.skip_links}")
    for key in list(style_versions) + list(script_versions):
        if key not in template:
            fail("generate-changelog.py", f"template cache-bust {key!r} out of sync with pages")

    # Sitemap must list every HTML page.
    sitemap = (ROOT / "sitemap.xml").read_text()
    for name in pages:
        slug = "/" if name == "index.html" else "/" + name
        expected = f"https://trace.audex.dev{slug}"
        if f"<loc>{expected}</loc>" not in sitemap:
            fail("sitemap.xml", f"missing <loc>{expected}</loc>")

    if not (ROOT / "assets" / "og-image.png").exists():
        fail("assets", "og-image.png is missing")

    if findings:
        print("Site validation failed:")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    print(f"OK: {len(pages)} pages + changelog template; version {current_version}; "
          f"assets consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
