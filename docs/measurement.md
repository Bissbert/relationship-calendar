# How this was measured

[← back to the overview](../README.md) · [documentation index](README.md)

This repository is a static browser app. The measurements here cover the local
smoke run, the shipped-file inventory, and the screenshot provenance. No page
load benchmark or export-file parser was added.

## File inventory

`tools/measure.py` uses only the Python standard library. It counts lines and
bytes for the five runtime files and reads PNG dimensions from their headers.

```sh
python3 tools/measure.py
```

The command produced:

```text
Runtime files: 5
index.html: 78 lines, 3618 bytes
js/app.js: 211 lines, 6813 bytes
js/Blob.js: 684 lines, 20611 bytes
js/ics.min.js: 2 lines, 3519 bytes
js/FileSaver.min.js: 2 lines, 2736 bytes
Runtime total: 977 lines, 37297 bytes
PNG media files: 2
media/relationship-calendar-empty.png: 1280x577 pixels, 44743 bytes
media/relationship-calendar-example.png: 1280x662 pixels, 50415 bytes
```

## Browser smoke run

The page was served from the repository root with:

```sh
python3 -m http.server 8000
```

A real local browser session opened `http://127.0.0.1:8000/`, captured the empty
state, entered the fictional event `Example stargazing night`, and captured the
populated preview. The date used for that sample was the fictional
`2099-01-01`; it is not personal data. The browser accessibility snapshot showed
the event in the memory list, and the browser error and console checks returned
no output during the single-event flow.

The download button was clicked once after the single-event flow and produced no
reported browser error. The downloaded file itself was not inspected, so this
pass does not publish a file-content or calendar-validity measurement.

## Recurring-event check

The recurring checkbox and linear controls were exercised with the same
fictional date. Submission did not append an entry. Capturing the page error
reported:

```text
Uncaught TypeError: Cannot read properties of null (reading 'value')
```

The source explained the cause: `index.html` names the end-date input
`recurring-end`, while `js/app.js` asked for `linear-end`. The measurement is
recorded as it was observed, not silently counted as a passing path. The defect
has since been fixed on the default branch; see [Bugs found](BUGS-FOUND.md).

## What was not measured

- GitHub Pages deployment was not inspected or triggered.
- No timing, bundle-size benchmark, accessibility score, or cross-browser matrix
  was collected.
- No animation is shipped: the screenshots are still captures from a real run,
  not mocked terminal output or generated animation frames.
