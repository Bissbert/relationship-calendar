#!/bin/sh
# Copies only the files the site serves into dist/ for `wrangler pages deploy`.
set -eu
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist/fonts
cp index.html favicon.svg _headers dist/
cp -R css js dist/
cp fonts/*.woff2 fonts/OFL-*.txt dist/fonts/
echo "dist/ ready: $(find dist -type f | wc -l | tr -d ' ') files"
