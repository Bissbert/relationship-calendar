# Bugs found

[← back to the overview](../README.md) · [documentation index](README.md)

Three defects were found in the first version of the app (`js/app.js` and a
single-form `index.html`). All three were fixed. The rewrite that followed
replaced both files, so the locations below point into the first version.

| ID | Entry | Status |
|---|---|---|
| BUG-001 | Linear recurrence cannot be submitted | Fixed in [`7cca216`](https://github.com/Bissbert/relationship-calendar/commit/7cca216) |
| BUG-002 | Toast feedback never appears | Fixed in [`bff2aaf`](https://github.com/Bissbert/relationship-calendar/commit/bff2aaf) |
| BUG-003 | Unmatched closing element in the action section | Fixed in [`e35516f`](https://github.com/Bissbert/relationship-calendar/commit/e35516f) |

The [browser check](measurement.md#browser-check) covers the same three areas in
the current app: a repeating date with an end date is stored, every change shows
a toast with Undo, and **Start over** sits in its own section.

## BUG-001 — linear recurrence cannot be submitted

**Status:** fixed in [`7cca216`](https://github.com/Bissbert/relationship-calendar/commit/7cca216).

**Location:** `index.html:49` defines the end-date input as
`id="recurring-end"`; `js/app.js:168` looks up `linear-end`.

**What happened:** with the recurring checkbox enabled and the pattern left on
Linear, submitting a valid entry did not append it to the preview. The browser
reported:

```text
Uncaught TypeError: Cannot read properties of null (reading 'value')
```

**How it was reproduced** (first version):

1. Serve the repository with `python3 -m http.server 8000`.
2. Open the page and enter any valid fictional start date.
3. Enable **Make this a recurring (serial) event** and leave **Linear** selected.
4. Click **Add Event**.
5. Observe that the memory list stays empty and inspect the browser error.

**Fix:**

```diff
--- a/js/app.js
+++ b/js/app.js
@@ -165,5 +165,5 @@
     if (pattern === 'linear') {
       entry.interval = document.getElementById('linear-interval').value;
-      entry.until = document.getElementById('linear-end').value;
+      entry.until = document.getElementById('recurring-end').value;
     }
```

## BUG-002 — toast feedback never appears

**Status:** fixed in [`bff2aaf`](https://github.com/Bissbert/relationship-calendar/commit/bff2aaf). The fix also made each action show exactly one toast, and none when stored dates load.

**Location:** `js/app.js:2-6` looks for `toast` and `toast-message`.
`index.html:1-78` contains no elements with either ID.

**What happened:** `showToast` returned at its guard clause. Adding, removing, or
clearing an entry updated the list, but no success message was displayed. The
single-event browser run produced no toast and no related browser exception.

**How it was reproduced** (first version):

1. Open the page and add a single fictional event.
2. Observe the event in **Your Memory List**.
3. Observe that no toast notification appears.

**Fix:**

```diff
--- a/index.html
+++ b/index.html
@@ -70,6 +70,10 @@
       </button>
     </section>
   </div>
+  <div id="toast" class="hidden" role="status" aria-live="polite">
+    <span id="toast-message"></span>
+  </div>

 <script src="js/Blob.js"></script>
```

## BUG-003 — unmatched closing element in the action section

**Status:** fixed in [`e35516f`](https://github.com/Bissbert/relationship-calendar/commit/e35516f).

**Location:** `index.html:67`.

**What happened:** the action section contained a closing `</div>` without a
matching opening element immediately around it. The browser's HTML parser
recovered and both buttons still rendered, but the markup relied on parser
error recovery.

**How it was reproduced** (first version):

1. Open `index.html` in the repository.
2. Inspect the action section around the **Clear All Events** button.
3. Notice the closing `</div>` before the download button has no matching
   opening element in that section.

**Fix:**

```diff
--- a/index.html
+++ b/index.html
@@ -64,7 +64,6 @@
     <section class="flex flex-col gap-2">
       <button id="clear-btn" class="mb-2 bg-red-100 hover:bg-red-200 text-red-600 font-semibold py-2 px-4 rounded-xl w-full">🗑️ Clear All Events</button>
-      </div>
 <button id="download-btn" class="bg-[#f2e2cd] hover:bg-[#dadae3] text-black font-semibold py-2 px-4 rounded-xl w-full">
```
