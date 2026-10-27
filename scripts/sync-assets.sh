#!/usr/bin/env bash
# Regenerates the site's images, icons and fonts from the ComfyPilot app repo.
# Run it after the app's screenshots, logo or fonts change, then commit public/.
#
#   scripts/sync-assets.sh [path/to/ComfyPilot]     (default: ../ComfyPilot)
#
# Needs ImageMagick 7 (magick, with WebP and librsvg) and a Python with
# fonttools and brotli (set PYTHON to use one from a virtualenv).
set -euo pipefail

app="${1:-$(dirname "$0")/../../ComfyPilot}"
app="$(cd "$app" && pwd)"
site="$(cd "$(dirname "$0")/.." && pwd)/public"
python="${PYTHON:-python3}"

shots="$app/docs/screenshots"
[[ -d "$shots" ]] || { echo "No screenshots in $shots" >&2; exit 1; }

mkdir -p "$site/screenshots" "$site/fonts"

echo "Screenshots"
for png in "$shots"/*.png; do
  name="$(basename "$png" .png)"
  magick "$png" -strip -quality 86 -define webp:method=6 "$site/screenshots/$name.webp"
  magick "$png" -strip -resize 960x -quality 84 -define webp:method=6 "$site/screenshots/$name-960.webp"
done

echo "Logo and icons"
cp "$app/app/qml/assets/logo.svg" "$site/logo.svg"
cp "$app/app/qml/assets/logo-light.svg" "$site/logo-light.svg"
cp "$app/app/icons/icon.svg" "$site/favicon.svg"
cp "$app/app/icons/favicon.ico" "$site/favicon.ico"
# Apple touch icons get no transparency: the symbol on the app's dark sidebar.
rsvg-convert -w 140 -h 140 "$app/app/icons/icon.svg" -o "$site/.icon-140.png"
magick -size 180x180 xc:'#141519' "$site/.icon-140.png" -gravity center -composite \
  -strip "$site/apple-touch-icon.png"
rm "$site/.icon-140.png"

echo "Social preview (og-image.jpg)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
rsvg-convert -w 440 "$app/app/qml/assets/logo.svg" -o "$tmp/logo.png"
magick "$shots/comfy-dark.png" -resize 820x \
  \( +clone -alpha extract -fill black -colorize 100 -fill white \
     -draw "roundrectangle 0,0 %[fx:w-1],%[fx:h-1] 14,14" \) \
  -alpha off -compose CopyOpacity -composite "$tmp/shot.png"
magick -size 1200x630 radial-gradient:'#3a2d5c-#141519' -gravity northwest \
  "$tmp/logo.png" -geometry +72+64 -composite \
  -font "$app/app/qml/fonts/Geist-Medium.ttf" -pointsize 30 -fill '#c9cad1' \
  -annotate +76+190 'Install, run and keep ComfyUI up to date.' \
  -fill '#8e919a' -pointsize 24 -annotate +76+236 'Native app for Linux and Windows' \
  "$tmp/shot.png" -geometry +330+300 -composite \
  -strip -quality 88 "$site/og-image.jpg"

echo "Fonts"
for f in Geist-Regular Geist-Medium Geist-SemiBold JetBrainsMono-Regular; do
  "$python" -m fontTools.subset "$app/app/qml/fonts/$f.ttf" \
    --unicodes='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2190-2199,U+2212,U+2215,U+FEFF,U+FFFD' \
    --layout-features='*' --flavor=woff2 --output-file="$site/fonts/$f.woff2"
done
cp "$app/app/qml/fonts/Geist-OFL.txt" "$app/app/qml/fonts/JetBrainsMono-OFL.txt" "$site/fonts/"

echo "Done: $site"
