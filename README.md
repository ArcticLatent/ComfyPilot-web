# ComfyPilot website

The one-page site for [ComfyPilot](https://github.com/ArcticLatent/ComfyPilot), served at
**https://comfypilot.arcticlatent.ai** from Cloudflare Pages.

Plain HTML, CSS and JavaScript with no build step: everything in `public/` is deployed as is.

```
public/
  index.html        the page
  styles.css        layout and light/dark themes (colours from the app's Theme.qml)
  theme.js          applies a saved theme before first paint
  main.js           theme toggle, screenshot lightbox, copy buttons, download links
  404.html
  _headers          Cloudflare Pages headers: CSP, caching, noindex on *.pages.dev
  robots.txt, sitemap.xml
  screenshots/      WebP screenshots (full size and 960 px)
  fonts/            Geist and JetBrains Mono, subset to woff2 (OFL)
  og-image.jpg      social preview, favicon.*, apple-touch-icon.png, logo*.svg
scripts/
  sync-assets.sh    regenerates the images, icons and fonts from the app repo
```

## Download links

The download buttons in `index.html` point at a specific release, so they work without
JavaScript. On load, `main.js` asks the GitHub API for the latest release and swaps in its
files, version and sizes, so a new app release needs no change here. If that request fails
(for example, GitHub's limit of 60 requests an hour per visitor IP), the links from the HTML
stay; ComfyPilot updates itself after installing, so an older file is still fine.

Bump the fallback links in `index.html` now and then, after a release.

## Working on it

```bash
python3 -m http.server 8000 --directory public   # http://localhost:8000
```

`_headers` only applies on Cloudflare. To preview with it: `npx wrangler pages dev public`.

When the app's screenshots, logo or fonts change:

```bash
python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools brotli
PYTHON=/tmp/fontenv/bin/python scripts/sync-assets.sh ../ComfyPilot
```

The screenshots come from `docs/screenshots/` in the app repo (1440×900 PNG). The hero uses
`comfy-dark` or `comfy-light` to match the visitor's theme.

## Deploying

Cloudflare Pages builds from the `main` branch of this repository: framework preset **None**,
no build command, build output directory **`public`**. Every push to `main` goes live; other
branches and pull requests get their own preview URLs (kept out of search engines by `_headers`).
