# Audex Trace Site

This repository contains the standalone GitHub Pages landing page for Audex Trace, an Apple Music-first macOS mini player for Lossless and Hi-Res listeners.

The site is plain static HTML, CSS, and JavaScript with no framework or build step. It is intended to be served from the repository root on the `main` branch.

Run `scripts/generate-changelog.py` after editing GitHub Releases to regenerate `changelog.html` from published release notes.

Search and AI-discovery source files include `sitemap.xml`, `robots.txt`, `llms.txt`, JSON-LD metadata in the HTML pages, and the social preview image at `assets/og-image.svg`.
