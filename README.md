# Audex Trace Site

This repository contains the standalone GitHub Pages landing page for Audex Trace, an Apple Music-first macOS mini player for Lossless and Hi-Res listeners.

The site is plain static HTML, CSS, and JavaScript with no framework or build step. It is intended to be served from the repository root on the `main` branch.

Run `scripts/generate-changelog.py` after editing GitHub Releases to regenerate `changelog.html` from published release notes. Run `python3 scripts/validate-site.py` before committing: it checks the shared header/footer chrome, cache-bust versions, download CTAs against `current-release.json`, og:image metadata, skip links, and sitemap coverage. Run `scripts/generate-og-image.sh` after editing `assets/og-image.svg` to regenerate the raster `assets/og-image.png` (1200×630) that social crawlers require.

When publishing a new release, also update the `lastmod` dates in `sitemap.xml` for every page that changed.

Search and AI-discovery source files include `sitemap.xml`, `robots.txt`, `llms.txt`, JSON-LD metadata in the HTML pages, and the social preview image at `assets/og-image.png` (source: `assets/og-image.svg`).
