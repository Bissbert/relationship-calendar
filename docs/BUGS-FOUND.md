# Bugs found

[← back to the overview](../README.md) · [documentation index](README.md)

> **Historical record.** The files these bugs refer to (`js/app.js` and the
> old single-form `index.html`) were replaced by the rewrite described in the
> overview. The line numbers below point into that first version.

This ledger records defects found while documenting the application as it
stood. The proposed diffs were deliberately not applied during the
documentation pass itself.

> **Since this pass:** an independent adjudication confirmed all three entries,
> and a subsequent fix pass applied all three to the default branch: BUG-001 in
> commit `7cca216`, BUG-002 in commit `bff2aaf` and BUG-003 in commit `e35516f`.
> The linear branch now reads the `recurring-end` input, `index.html` carries
> the toast elements the feedback calls need — with one accurate notification
> per user action, and none when stored events are loaded — and the premature
> closing `</div>` between the action buttons is removed. Read the
> reproductions and diffs below as the state at the time of the pass, not as
> the current state of the default branch.

| ID | Location | Observed behavior |
|---|---|---|
| BUG-001 | `index.html:49`, `js/app.js:168` | Linear recurrence submission reads an element ID that is not in the page. |
| BUG-002 | `js/app.js:2-6`, `index.html:1-78` | Toast calls return early because the referenced toast elements are not present. |
| BUG-003 | `index.html:67` | An unmatched closing `</div>` appears between the two action buttons. |

## BUG-001 — linear recurrence cannot be submitted

**Location:** `index.html:49` defines the end-date input as
`id="recurring-end"`; `js/app.js:168` looks up `linear-end`.

**What happens:** with the recurring checkbox enabled and the pattern left on
Linear, submitting a valid entry does not append it to the preview. The browser
reports:

```text
Uncaught TypeError: Cannot read properties of null (reading 'value')
```

**How to reproduce:**

1. Serve the repository with `python3 -m http.server 8000`.
2. Open the page and enter any valid fictional start date.
3. Enable **Make this a recurring (serial) event** and leave **Linear** selected.
4. Click **Add Event**.
5. Observe that the memory list stays empty and inspect the browser error.

**Fix that would have been made:**

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

**Location:** `js/app.js:2-6` looks for `toast` and `toast-message`.
`index.html:1-78` contains no elements with either ID.

**What happens:** `showToast` returns at its guard clause. Adding, removing, or
clearing an entry updates the list, but no success message is displayed. The
single-event browser run produced no toast and no related browser exception.

**How to reproduce:**

1. Open the page and add a single fictional event.
2. Observe the event in **Your Memory List**.
3. Observe that no toast notification appears.

**Fix that would have been made:**

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

**Location:** `index.html:67`.

**What happens:** the action section contains a closing `</div>` without a
matching opening element immediately around it. The browser's HTML parser
recovers and the screenshot still renders both buttons, but the source markup
is malformed and relies on parser error recovery.

**How to reproduce:**

1. Open `index.html` in the repository.
2. Inspect the action section around the **Clear All Events** button.
3. Notice the closing `</div>` before the download button has no matching
   opening element in that section.

**Fix that would have been made:**

```diff
--- a/index.html
+++ b/index.html
@@ -64,7 +64,6 @@
     <section class="flex flex-col gap-2">
       <button id="clear-btn" class="mb-2 bg-red-100 hover:bg-red-200 text-red-600 font-semibold py-2 px-4 rounded-xl w-full">🗑️ Clear All Events</button>
-      </div>
 <button id="download-btn" class="bg-[#f2e2cd] hover:bg-[#dadae3] text-black font-semibold py-2 px-4 rounded-xl w-full">
```
