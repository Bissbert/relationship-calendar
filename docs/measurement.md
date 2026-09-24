# How this was measured

[← back to the overview](../README.md) · [documentation index](README.md)

Everything on this page comes from one script that runs in Linux containers:

```sh
sh tools/linux-run.sh > media/captures/linux-run.txt
```

[`tools/linux-run.sh`](../tools/linux-run.sh) mounts the repository read-only
and copies it inside each container. The full output is
[`media/captures/linux-run.txt`](../media/captures/linux-run.txt); every block
below is taken from it.

## Environment

| | |
|---|---|
| Kernel | Linux 6.5.11-linuxkit, aarch64 (Docker Desktop VM) |
| File inventory | `python:3.12-slim-bookworm` (`sha256:392307d2…23564e`), Python 3.12.14 |
| Tests | `node:22-bookworm-slim` (`sha256:43ac6c60…30b772c`), Node 22.23.3 |
| Browser | `mcr.microsoft.com/playwright:v1.55.0-noble` (`sha256:b27e719e…d7fb29`), Chromium 140.0.7339.16, Node 22.18.0 |
| Date | 2026-09-24 |

## File inventory

`tools/measure.py` uses only the Python standard library. It counts lines and
bytes for the files the site serves (the same set `tools/build-dist.sh`
copies) and reads PNG dimensions from their headers.

```text
Runtime files: 15
index.html: 427 lines, 23391 bytes
favicon.svg: 1 lines, 221 bytes
_headers: 10 lines, 559 bytes
css/app.css: 1037 lines, 32773 bytes
js/dates.js: 154 lines, 5363 bytes
js/ics.js: 284 lines, 10588 bytes
js/main.js: 1212 lines, 47616 bytes
js/milestones.js: 36 lines, 1550 bytes
js/model.js: 171 lines, 5585 bytes
js/presets.js: 90 lines, 2749 bytes
js/share.js: 158 lines, 6262 bytes
js/welcome.js: 65 lines, 2735 bytes
Code total: 3645 lines, 139392 bytes
fonts/barlow-condensed-600.woff2: 14844 bytes
fonts/figtree.woff2: 20184 bytes
fonts/young-serif.woff2: 18520 bytes
Font total: 53548 bytes
Runtime total: 192940 bytes
PNG media files: 2
media/relationship-calendar-example.png: 740x700 pixels, 309395 bytes
media/relationship-calendar-month.png: 740x700 pixels, 255518 bytes
```

## Tests

```sh
node --test tests/*.test.mjs
```

```text
ℹ tests 24
ℹ suites 0
ℹ pass 24
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

On Node 22, `node --test tests/` treats the directory as one module and fails
with `Cannot find module '/tmp/rc/tests'`, so the command names the files.

The suite covers date validation, monthly and yearly repeats across short
months and leap years, legacy migration, merging, milestones, quick picks, the
first-run welcome, `.ics` export (escaping, folding, alarms, timed and all-day
events), an `.ics` round trip of every field, import of a foreign calendar,
share-link and backup round trips, Google Calendar links and the "Add to my
calendar" routing per device.

## Browser check

[`tools/browser-check.mjs`](../tools/browser-check.mjs) serves the repository
from a small Node server and drives it in headless Chromium at 390 × 844 px,
with the clock fixed at 2026-09-24 10:00 and the first-run welcome skipped. It
adds a weekly date with an end date and markup in the title, deletes it from
its ticket, undoes the delete, and opens and cancels **Start over**:

```text
browser                            Chromium 140.0.7339.16
composer open on empty calendar    true
"Until" field shown for weekly     true
stored events after add            1
stored repeat / until              weekly / 2026-10-29
title rendered as text             true
toast after add                    Added “Walk with <b>Kai</b>” on 1 Oct 2026.
Undo button shown                  true
stored events after delete         0
toast after delete                 Deleted “Walk with <b>Kai</b>”.
stored events after undo           1
toast after undo                   Undone.
#clear-btn inside #start-over      true
confirmation shown                 true
confirmation text                  Remove your one date? You can undo it from the message that appears afterwards.
stored events after "Keep them"    1
page wider than 390 px viewport    false
console / page errors              none
```

## Not covered

- Safari, Firefox and real phones. The iOS and Android "Add to my calendar"
  paths are covered only by the routing tests.
- Importing the exported `.ics` file into Apple Calendar, Google Calendar and
  Outlook. The test suite checks the file itself.
- Load time.
