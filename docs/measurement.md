# How this was measured

[← back to the overview](../README.md) · [documentation index](README.md)

## File inventory

`tools/measure.py` uses only the Python standard library. It counts lines and
bytes for the files the site serves (the same set `tools/build-dist.sh`
copies) and reads PNG dimensions from their headers.

```sh
python3 tools/measure.py
```

The command produced:

```text
Runtime files: 13
index.html: 334 lines, 18258 bytes
favicon.svg: 1 lines, 221 bytes
_headers: 10 lines, 559 bytes
css/app.css: 862 lines, 25444 bytes
js/dates.js: 154 lines, 5363 bytes
js/ics.js: 284 lines, 10588 bytes
js/main.js: 929 lines, 35263 bytes
js/milestones.js: 36 lines, 1550 bytes
js/model.js: 171 lines, 5585 bytes
js/share.js: 120 lines, 4495 bytes
Code total: 2901 lines, 107326 bytes
fonts/barlow-condensed-600.woff2: 14844 bytes
fonts/figtree.woff2: 20184 bytes
fonts/young-serif.woff2: 18520 bytes
Font total: 53548 bytes
Runtime total: 160874 bytes
PNG media files: 2
media/relationship-calendar-example.png: 740x700 pixels, 309395 bytes
media/relationship-calendar-month.png: 740x700 pixels, 255518 bytes
```

## Tests

```sh
node --test tests/
```

```text
ℹ tests 18
ℹ suites 0
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

The suite covers date validation, monthly and yearly repeats across short
months and leap years, legacy migration, merging, milestones, `.ics` export
(escaping, folding, alarms, timed and all-day events), an `.ics` round trip of
every field, import of a foreign calendar, share-link and backup round trips,
and Google Calendar links.

## Browser checks

The page was served with `python3 -m http.server` and exercised in Chrome with
the fictional couple Robin & Kai: adding a date with markup in the title
(rendered as text), validation, editing, deleting and undoing, month-view
keyboard navigation, generating 30 milestones, and a share-link round trip
(open the link, accept the merge banner, check the fragment is cleared). The console showed no errors. Phone layouts were
checked at 390 px wide.

## What was not measured

- No cross-browser matrix: Safari and Firefox were not tested.
- The exported `.ics` file was checked by the test suite, not by importing it
  into Apple Calendar, Google Calendar and Outlook one by one.
- No load-time benchmark was collected.
