#!/bin/sh
# Runs every check in docs/measurement.md inside Linux containers.
#
#   sh tools/linux-run.sh > media/captures/linux-run.txt
#
# The repository is mounted read-only and copied inside each container.
set -eu

REPO=$(cd "$(dirname "$0")/.." && pwd)
PY=python:3.12-slim-bookworm
NODE=node:22-bookworm-slim
PW=mcr.microsoft.com/playwright:v1.55.0-noble

for image in "$PY" "$NODE" "$PW"; do docker pull -q "$image" >/dev/null; done

docker run --rm -v "$REPO":/repo:ro "$PY" sh -c '
section() { printf "\n=== %s\n" "$*"; }
cp -r /repo /tmp/rc && cd /tmp/rc
section "environment (python)"
uname -srm
python3 --version
section "python3 tools/measure.py"
python3 tools/measure.py
'

docker run --rm -v "$REPO":/repo:ro "$NODE" sh -c '
section() { printf "\n=== %s\n" "$*"; }
cp -r /repo /tmp/rc && cd /tmp/rc
section "environment (node)"
node --version
section "node --test tests/*.test.mjs"
node --test --test-reporter=spec tests/*.test.mjs 2>&1 | grep "^ℹ"
'

docker run --rm --ipc=host -v "$REPO":/repo:ro "$PW" sh -c '
section() { printf "\n=== %s\n" "$*"; }
cp -r /repo /tmp/rc && mkdir /tmp/pw && cd /tmp/pw
npm init -y >/dev/null && npm install -q --no-audit --no-fund playwright@1.55.0 >/dev/null 2>&1
cp /tmp/rc/tools/browser-check.mjs .
section "environment (browser)"
node --version
section "node tools/browser-check.mjs"
node browser-check.mjs /tmp/rc
'
