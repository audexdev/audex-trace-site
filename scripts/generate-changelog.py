#!/usr/bin/env python3
"""Generate changelog.html from GitHub Releases."""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


@dataclass
class Release:
    tag: str
    name: str
    body: str
    published_at: datetime
    release_url: str
    download_url: str

    @property
    def version(self) -> str:
        return self.tag.removeprefix("v")


def run_json(args: list[str]) -> object:
    result = subprocess.run(args, check=True, text=True, stdout=subprocess.PIPE)
    return json.loads(result.stdout)


def github_release_url(repo: str, tag: str) -> str:
    return f"https://github.com/{repo}/releases/tag/{tag}"


def parse_github_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(ZoneInfo("Asia/Tokyo"))


def load_releases(repo: str, limit: int) -> list[Release]:
    release_list = run_json([
        "gh",
        "release",
        "list",
        "--repo",
        repo,
        "--limit",
        str(limit),
        "--json",
        "tagName,isDraft,isPrerelease",
    ])

    releases: list[Release] = []
    for release in release_list:
        if release["isDraft"] or release["isPrerelease"]:
            continue

        detail = run_json([
            "gh",
            "release",
            "view",
            release["tagName"],
            "--repo",
            repo,
            "--json",
            "tagName,name,body,publishedAt,assets",
        ])

        zip_assets = [
            asset
            for asset in detail.get("assets", [])
            if asset.get("name", "").endswith(".zip")
        ]
        tag = detail["tagName"]
        releases.append(
            Release(
                tag=tag,
                name=detail["name"],
                body=detail.get("body") or "",
                published_at=parse_github_datetime(detail["publishedAt"]),
                release_url=github_release_url(repo, tag),
                download_url=zip_assets[0]["url"] if zip_assets else github_release_url(repo, tag),
            )
        )

    return releases


def inline_markdown(text: str) -> str:
    escaped = html.escape(text)
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)


def release_body_to_html(body: str, release_name: str) -> str:
    lines = body.replace("\r\n", "\n").split("\n")
    if lines and lines[0].strip() == release_name:
        lines = lines[1:]

    output: list[str] = []
    paragraph: list[str] = []
    list_open = False

    def flush_paragraph() -> None:
        nonlocal paragraph
        if paragraph:
            output.append(f"<p>{inline_markdown(' '.join(paragraph))}</p>")
            paragraph = []

    def close_list() -> None:
        nonlocal list_open
        if list_open:
            output.append("</ul>")
            list_open = False

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            flush_paragraph()
            close_list()
            continue

        if line.startswith("- "):
            flush_paragraph()
            if not list_open:
                output.append("<ul>")
                list_open = True
            output.append(f"<li>{inline_markdown(line[2:])}</li>")
            continue

        close_list()
        if line.endswith(":") and len(line) <= 64:
            flush_paragraph()
            output.append(f"<h3>{inline_markdown(line[:-1])}</h3>")
            continue

        paragraph.append(line)

    flush_paragraph()
    close_list()
    return "\n".join(output)


def indent(text: str, spaces: int) -> str:
    prefix = " " * spaces
    return "\n".join(prefix + line if line else line for line in text.splitlines())


def release_label(index: int, release: Release) -> str:
    if index == 0:
        return "Current release"
    if release.version == "1.0":
        return "First public release"
    return "Release"


def render_release_entries(releases: list[Release]) -> str:
    entries: list[str] = []
    for index, release in enumerate(releases):
        entries.append(
            f"""          <article class="changelog-entry">
            <div class="changelog-meta">
              <span class="price-label">{release_label(index, release)}</span>
              <h2>{html.escape(release.version)}</h2>
              <p>{release.published_at.strftime("%B %-d, %Y")}</p>
              <a class="repository-link" href="{html.escape(release.release_url)}">GitHub Release</a>
            </div>
            <div class="changelog-details release-notes">
{indent(release_body_to_html(release.body, release.name), 14)}
            </div>
          </article>"""
        )
    return "\n".join(entries)


def render_changelog(releases: list[Release]) -> str:
    latest = releases[0]
    entries = render_release_entries(releases)
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Audex Trace changelog and release history.">
    <meta name="theme-color" content="#07090d">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="https://trace.audex.dev/changelog.html">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Audex Trace">
    <meta property="og:title" content="Audex Trace Changelog">
    <meta property="og:description" content="Release history for Audex Trace.">
    <meta property="og:url" content="https://trace.audex.dev/changelog.html">
    <meta property="og:image" content="https://trace.audex.dev/assets/apple-touch-icon.png">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Audex Trace Changelog">
    <meta name="twitter:description" content="Release history for Audex Trace.">
    <meta name="twitter:image" content="https://trace.audex.dev/assets/apple-touch-icon.png">
    <title>Audex Trace Changelog</title>
    <link rel="icon" type="image/svg+xml" href="assets/trace-mark.svg">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <div class="page-shell">
      <header class="site-header" data-elevate>
        <a class="brand" href="index.html#top" aria-label="Audex Trace home">
          <img class="brand-mark" src="assets/trace-mark.svg" alt="" aria-hidden="true">
          <span>Audex Trace</span>
        </a>
        <nav class="site-nav" aria-label="Primary navigation">
          <a href="index.html#features">Features</a>
          <a href="index.html#pricing">Pricing</a>
          <a href="index.html#privacy">Privacy</a>
          <a href="changelog.html" aria-current="page">Changelog</a>
          <a href="index.html#download">Download</a>
        </nav>
        <a class="header-cta" href="{html.escape(latest.download_url)}">Free Download</a>
      </header>

      <main>
        <section class="changelog-hero content-band" aria-labelledby="changelog-title">
          <div class="section-kicker">Release history</div>
          <h1 id="changelog-title">Audex Trace Changelog</h1>
          <p class="hero-subtitle">Signed and notarized macOS releases, generated from GitHub Releases.</p>
          <div class="download-actions">
            <a class="primary-cta" href="{html.escape(latest.download_url)}">Download {html.escape(latest.version)}</a>
            <a class="repository-link" href="{html.escape(latest.release_url)}">Latest GitHub Release</a>
          </div>
        </section>

        <section class="changelog-list content-band" aria-label="Audex Trace releases">
{entries}
        </section>
      </main>

      <footer class="site-footer">
        <span>Audex Trace</span>
        <span>© 2026 Audex</span>
        <nav aria-label="Footer links">
          <a href="index.html#privacy">Privacy</a>
          <a href="index.html#pricing">Pricing</a>
          <a href="changelog.html">Changelog</a>
          <a href="index.html#download">Download</a>
          <a href="mailto:support@audex.dev">Contact</a>
        </nav>
      </footer>
    </div>
    <script src="script.js"></script>
  </body>
</html>
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default="audexdev/trace-releases")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--output", default="changelog.html")
    args = parser.parse_args()

    releases = load_releases(args.repo, args.limit)
    if not releases:
        raise SystemExit("No published releases found")

    output = Path(args.output)
    output.write_text(render_changelog(releases), encoding="utf-8")
    print(f"Generated {output} from {len(releases)} releases; latest is {releases[0].tag}")


if __name__ == "__main__":
    main()
