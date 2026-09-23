---
name: Relationship Calendar
description: Claret velvet lining and paper ticket stubs for a couple's shared dates — an ink-stamped keepsake, not a form-over-list CRUD page.
colors:
  stamp: "#3b3a97"
  rose: "#eba6b1"
  rose-deep: "#a13a57"
  gold: "#dcb56c"
  lining: "#3a101d"
  lining-raised: "#4d1728"
  lining-line: "#6a2a3d"
  on-lining: "#f7eee3"
  on-lining-soft: "#dcc2c9"
  paper: "#f7efe4"
  paper-deep: "#ecdfcd"
  paper-line: "#d9c8b2"
  ink: "#2a1d23"
  ink-soft: "#62505a"
  danger: "#a3262f"
  danger-wash: "#f5dcdc"
  danger-on-lining: "#f2b3b8"
  danger-line: "#7c2b35"
  k-anniversary: "#9b2743"
  k-birthday: "#3b3a97"
  k-date: "#a33b66"
  k-trip: "#2b6650"
  k-milestone: "#86560f"
  k-other: "#5b4852"
typography:
  display:
    fontFamily: "'Young Serif', Georgia, serif"
    fontSize: "clamp(2.6rem, 8vw, 5.25rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Young Serif', Georgia, serif"
    fontSize: "clamp(1.25rem, 3vw, 2rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.14em"
rounded:
  sm: "9px"
  md: "14px"
  pill: "999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.stamp}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0.55rem 1.1rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "#2e2d80"
  button-rose:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.55rem 1.1rem"
    height: "2.75rem"
  button-rose-hover:
    backgroundColor: "#f3bdc6"
  button-ghost-light:
    backgroundColor: "transparent"
    textColor: "{colors.on-lining}"
    rounded: "{rounded.pill}"
    padding: "0.55rem 1.1rem"
    height: "2.75rem"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.55rem 1.1rem"
    height: "2.75rem"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.on-lining-soft}"
    rounded: "{rounded.pill}"
    padding: "0.3rem 0.8rem"
    height: "2.25rem"
  input:
    backgroundColor: "#fffaf3"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.55rem 0.75rem"
    height: "2.75rem"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "1.25rem"
---

# Design System: Relationship Calendar

## Overview

**Creative North Star: "The Velvet Keepsake Box"**

Relationship Calendar reads as a couple's dates kept like ticket stubs tucked into a velvet-lined box, not as a form sitting over a list. The page is built from exactly two grounds — a deep claret velvet lining that holds the header, the section chrome and the takeaway panels, and warm paper that every ticket, card and input sits on — and the system never blurs them into a third, in-between surface. Every interactive surface commits to one ground or the other: paper things get the violet-blue ink-stamp accent, velvet things get the rose foil accent, and nothing is shaded halfway to "neutral" gray. The signature device is the ticket itself: a real CSS-mask silhouette with two notch cutouts and a dashed tear line, topped with a rotated rubber-stamp badge in condensed numerals — built with actual geometry, not a texture image standing in for one.

The system refuses faked materiality. There is no paper-grain texture, no drop-shadow doing double duty as "depth," no gradient standing in for velvet nap — the claret ground is two soft radial gradients plus a flat fill, and the "paper" is a flat warm off-white with a slightly different flat off-white for its secondary surface. Depth, where it exists at all, is reserved for the handful of paper set-pieces that need to visually lift off the velvet (the composer card, the month sheet, the ticket, the toast); every button, chip, input and badge is flat at rest. Browser chrome carries the world too: selection, caret, scrollbar track/thumb, and the accent-color of native checkboxes/date pickers are all themed, so the illusion doesn't break at the edges of authored markup.

**Key Characteristics:**
- Two grounds, two accents — velvet lining (rose) and paper (violet-blue stamp), never mixed.
- The ticket is a real cut silhouette (CSS mask), not an illustrated or textured stand-in.
- Flat by default; shadow is reserved for paper set-pieces sitting on velvet.
- Barlow Condensed uppercase numerals do the "rubber stamp" work; Figtree stays plain for UI prose.
- Pill radius on everything actionable; 14px/9px radius on everything static.

## Colors

A deliberately narrow palette: one ink accent, one foil accent, one rare foil highlight, and two full neutral families — one per ground.

### Primary
- **Stamp Ink** (`#3b3a97`): the violet-blue date-stamper ink from the THESIS. Used as the default interactive accent on paper surfaces — primary buttons, focus rings and the checked state of native form controls (`accent-color`), the active tab underline, the selected day in the month grid, and the `kind-birthday` category mark.

### Secondary
- **Rose Foil** (`#eba6b1`): the accent for the velvet ground — link color, text-selection background, the input caret, the share banner background, and the `btn-rose` call-to-action used for "Copy share link," "Download calendar file" and "Add them." A deeper tone, **Rose Deep** (`#a13a57`), renders the ticket's date/time line and the "today" badge fill — always on paper, never on velvet.

### Tertiary
- **Gold Foil** (`#dcb56c`): the rarest color in the system, used only for the day-counter number beside the couple's names. It never becomes a background, a button, or a second accent — a single foil flourish, not a color family.

### Neutral

*Velvet ground:*
- **Lining** (`#3a101d`): the page background itself, built from two soft radial gradients over this flat claret.
- **Lining Raised** (`#4d1728`): panels sitting on the lining — the names/start-date settings drawer, ghost-button hover, and the three "take your dates with you" cards.
- **Lining Line** (`#6a2a3d`): borders and dividers on velvet (ghost-button border, empty-state dashed border, section rule above the takeaway strip).
- **On-Lining** (`#f7eee3`): primary text on velvet.
- **On-Lining Soft** (`#dcc2c9`): secondary/muted text on velvet (the "together since" line, section eyebrows, card descriptions).

*Paper ground:*
- **Paper** (`#f7efe4`): the base surface for tickets, the composer card and the month sheet.
- **Paper Deep** (`#ecdfcd`): a second paper tone for past tickets, the composer card header, and the milestone preview panel — paper that's slightly "further back."
- **Paper Line** (`#d9c8b2`): borders and dividers on paper (ticket dashed stub divider, card-head rule, day-grid rules).
- **Ink** (`#2a1d23`): primary text on paper.
- **Ink Soft** (`#62505a`): secondary/muted text on paper (ticket meta, field hints, month weekday labels).
- **Danger** (`#a3262f`): the one status color outside the two-ground system — field validation errors, every Delete action on paper, and the solid "Yes, remove all" confirm. It has three helpers: **Danger Wash** (`#f5dcdc`, hover fill for red actions on paper), **Danger On-Lining** (`#f2b3b8`, red text that stays legible on velvet) and **Danger Line** (`#7c2b35`, the border of the Start over panel and its button on velvet).

### Category Marks
Six additional colors identify a date's kind on the ticket meta line and inside the month grid: **Anniversary** (`#9b2743`), **Birthday** (`#3b3a97`, the same hue as Stamp Ink), **Date** (`#a33b66`), **Trip** (`#2b6650`), **Milestone** (`#86560f`) and **Other** (`#5b4852`). Per the source stylesheet's own comment, these are "always paired with an icon and label" — color is a reinforcement, never the sole signal (PRODUCT.md's WCAG 2.2 AA commitment).

### Named Rules
**The Two Grounds Rule.** Stamp Ink is the accent for things sitting on paper (buttons, inputs, focus rings, checked states inside the composer and tickets). Rose is the accent for things sitting on velvet (links, primary CTAs, selection, caret). A control never borrows the other ground's accent.

**The Foil Is Rare Rule.** Gold appears exactly once, on the day-counter numeral. It does not recur as a button, a border, or a second brand color — its rarity is what makes it read as foil rather than paint.

## Typography

**Display Font:** Young Serif (with Georgia, serif)
**Body Font:** Figtree (with system-ui, -apple-system, "Segoe UI", sans-serif)
**Label/Mono Font:** Barlow Condensed (with Arial Narrow, sans-serif)

**Character:** A warm literary serif for names and headings against a plain, humanist sans for interface prose, stamped through with a condensed all-caps numeral face wherever the design wants to feel rubber-stamped rather than typed.

### Hierarchy
- **Display** (400, `clamp(2.6rem, 8vw, 5.25rem)`, line-height 0.98, letter-spacing -0.025em): the couple's names — the one place Young Serif is allowed to be enormous.
- **Title** (400, 1.25rem–2rem, line-height 1.1–1.2): section titles, card/take/group/month titles, the enlarged "next up" ticket title, and empty-state headings — the same serif at editorial rather than hero scale.
- **Body** (400, 1rem/1.5): running UI prose. Semibold 600 Figtree carries button labels, tab labels, chip labels and field labels.
- **Label** (600, Barlow Condensed, uppercase, letter-spacing 0.02–0.14em): the numeral/stamp role — the "Next up" eyebrow (0.875rem, ls 0.14em), the stamp's day/month/year (1.85rem down to 0.75rem, larger still at 2.7rem on the "next up" ticket), the "together" day counter (1.6rem), the ticket's date/time line, the calendar day numbers, and the month-grid weekday header (0.8125rem, ls 0.12em). Always paired with `font-variant-numeric: tabular-nums` at the body level so digits never jitter.

### Named Rules
**The Stamp Numerals Rule.** Barlow Condensed 600 uppercase is reserved for dates, counters and short time-coded labels — never for running prose, button copy or field labels, which stay in Figtree.

## Layout

The page is built from a single `.wrap` container (`width: min(100% - 2rem, 70rem)`, centered): a 1rem gutter on narrow viewports, capping at 1120px. Three regions use the same two-column grammar at the `60rem` (960px) breakpoint — a flexible primary column beside a fixed `26rem` (416px) secondary column: the header (names/counter beside the "Next up" ticket), and the board (the dates list beside the composer card, which becomes `position: sticky; top: 1.25rem`). Below `60rem` the composer reorders above the list (`order: -1`) because adding a date is the primary mobile action, per the FIRST VIEWPORT contract — it is not simply stacked in source order.

The takeaway strip below the board becomes a 3-column grid at `48rem` (768px) and stacks single-column below it. Other breakpoints are component-local rather than global: `22rem` collapses the date/time row to one column, `30rem` shrinks the ticket's stub and stamp, `36rem` turns the settings drawer into 3 columns, and `40rem` compacts the month grid (day labels hide, event text collapses to dots).

Spacing is mostly fixed rem values reused at a handful of steps — 0.5rem/0.75rem/1rem/1.5rem/2rem/3rem for gaps and padding — with fluid `clamp()` reserved for section-level rhythm (header padding-block, board bottom padding, takeaway padding-block) so large vertical gaps compress gracefully rather than in discrete steps.

## Elevation & Depth

The system is flat by default; box-shadow is not an ambient decoration, it is reserved for the specific paper objects that need to visually lift off the velvet ground. Buttons, chips, inputs, badges and the view-switch/segmented control carry no shadow at rest — their affordance comes from fill, border and the pill radius, not from elevation.

### Shadow Vocabulary
- **Ticket shadow** (`--shadow-ticket: 0 1px 1px rgb(20 4 9 / 0.35), 0 6px 14px -4px rgb(20 4 9 / 0.55)`): used on the composer `.card` and the `.month-sheet` — the two rectangular paper containers.
- **Ticket drop-shadow** (`filter: drop-shadow(0 1px 1px rgb(20 4 9 / 0.35)) drop-shadow(0 6px 10px rgb(20 4 9 / 0.45))`): applied to `.ticket-wrap` rather than `.ticket` itself, because a CSS-masked element clips its own `box-shadow`; `filter: drop-shadow` renders outside the mask's alpha channel instead.
- **Toast shadow** (`0 10px 30px -8px rgb(10 2 5 / 0.7)`): the single floating overlay in the system and deliberately the heaviest shadow, so it reads above everything else.
- **Focus ring** (`0 0 0 3px rgb(59 58 151 / 0.25)`): a focus cue on paper inputs, not a depth cue — kept separate from the shadow vocabulary above.

### Named Rules
**The Flat-By-Default Rule.** Shadow only appears on paper set-pieces sitting on the velvet ground (card, month-sheet, ticket, toast). Nothing else — not a button, not a chip, not a badge — casts one at rest.

## Shapes

Two radii and one pill cover the whole system: `--radius-small` (9px) for compact static surfaces (inputs, the skip link, the day cell), `--radius` (14px) for larger static containers (composer card, month sheet, settings drawer, takeaway cards, empty states), and `999px` (fully round) for every actionable control — buttons, chips, the segmented view-switch, icon buttons, the "today" badge and the toast.

The signature silhouette is the ticket: a CSS `mask` built from two radial-gradients (`radial-gradient(circle at var(--stub) 0/100%, ...)` top and bottom) that punch a real circular notch out of each long edge where the stub meets the body, plus a dashed 1.5px border simulating the tear line between them. This is geometry, not an image or a texture — the notches are computed from the live `--stub` width, so the same mask works at the compact mobile stub (4.5rem), the standard stub (5.25rem) and the enlarged "next up" stub (7rem). A `forced-colors` media query drops the mask and substitutes a solid `CanvasText` border, so the ticket degrades to a plain bordered rectangle rather than disappearing under high-contrast mode.

## Components

### Buttons
- **Shape:** fully round (999px), minimum 2.75rem tall (44px, meeting the 44px touch-target commitment in PRODUCT.md); `btn-small` steps down to 2.25rem for inline/secondary contexts.
- **Primary** (`.btn-primary`): Stamp Ink fill, white text — used inside paper contexts (form submits: "Add date," "Add milestones").
- **Rose** (`.btn-rose`): Rose fill, ink text — the primary call-to-action wherever the surrounding ground is velvet ("Copy share link," "Download calendar file," banner's "Add them").
- **Ghost / Quiet:** `.btn-ghost-light` is transparent with an on-lining-line border, for secondary actions on velvet; `.btn-quiet` is transparent with a paper-line border and ink text, for secondary actions on paper.
- **Danger:** three strengths, one per job. `.btn-danger` (velvet, outlined in Danger Line, Danger On-Lining text) opens the Start over confirm; `.btn-danger-paper` (paper, outlined, Danger text, Danger Wash on hover) is "Delete this date" in the edit form; `.btn-danger-solid` (Danger fill, white text) is only ever the final "Yes, remove all N". Every destructive button carries the trash icon and a verb; none is icon-only.
- **Two-step removal:** removing one date is a single labelled click with a 12-second Undo toast. Removing everything first swaps "Remove all dates…" in place for a question that names the count ("Remove all 12 dates?"), a solid confirm and "Keep them" (focused, Escape also cancels). Nothing opens a modal.
- **Hover / Focus:** background/color/border transition over 160ms (`var(--ease-out)`); `:active` presses down 1px (`translateY(1px)`); focus uses the shared `:focus-visible` outline (2px rose, 2px offset), except inside paper/card contexts where the outline color swaps to Stamp Ink.

### Chips (if used)
- **Style:** transparent background, `on-lining-soft` text, `lining-line` 1px border, fully round; the filter chips and the "kind" selection chips in the composer share the same pill shape.
- **State:** `aria-pressed="true"` (filters, view-switch segments) or `:checked` (kind-option, an `<input>` hidden under a styled `<span>`) fills solid — on-lining/ink for filter chips, ink/paper (inverted) for kind options — rather than changing the border alone.
- **Quick picks:** the same pill as a kind option, as a `<button>` with a dashed border that turns solid on hover. The dashed edge marks them as actions that fill the form, not a choice that stays selected, so they never take a checked state.

### Cards / Containers
- **Corner Style:** 14px radius (`--radius`).
- **Background:** Paper, with a Paper Deep card-head band on the composer (`.card-head`) to separate the tab strip from the form.
- **Shadow Strategy:** `--shadow-ticket` (see Elevation & Depth) — the composer card and month sheet are the two containers that carry it.
- **Border:** none by default; the card-head uses a 1px `paper-line` bottom rule instead of a full border.
- **Internal Padding:** 1.25rem.

### Inputs / Fields
- **Style:** 9px radius, 1px `#c9b59c` border, a dedicated cream fill (`#fffaf3`) lighter than the surrounding paper — and, notably, `color-scheme: light` forced on every field even though the page shell is `color-scheme: dark`, so native date/time pickers render light and match the paper aesthetic instead of the velvet one. The paper surfaces themselves (card, month sheet, ticket, preview, toast) are also `color-scheme: light`, so checkboxes, radios and scrollbars on paper never pick up the dark native style.
- **Focus:** border shifts to Stamp Ink plus a 3px `rgb(59 58 151 / 0.25)` ring, `outline: none` — the ring replaces the outline rather than stacking with it.
- **Error / Disabled:** `[aria-invalid="true"]` forces the border to Danger red; `field-error` text is Danger-colored and collapses to nothing when empty (`:empty { display: none }`).

### Navigation
There is no persistent nav bar; in-page navigation is the segmented `.view-switch` (List/Month, `role="group"`, pill track with a paper-filled active segment) and the month grid's previous/next icon buttons. Both use the same flat, circular icon-button treatment: transparent at rest, `paper-deep` fill on hover, no shadow.

### Ticket (signature component)
A two-column grid — a narrow "stub" column (variable width via `--stub`) holding a rotated ink-stamp badge, and a body column with title, meta list and the right-aligned date/actions. The stamp badge is Barlow Condensed uppercase inside a double inset border (`box-shadow: inset 0 0 0 2px var(--paper), inset 0 0 0 3px currentColor`), rotated -3deg, colored by the event's kind. A dashed divider marks the tear line between stub and body. Three sizes share one mask: compact (mobile), standard (list), and enlarged (the "Next up" hero ticket, `--stub: 7rem`, serif title instead of the default weight-650 sans title). New tickets play a single authored motion — the stamp "presses" in (`rotate/scale/blur`, 520ms) while the ticket wrapper settles down 6px — the one keyframe animation the system permits itself, and it is disabled entirely under `prefers-reduced-motion`.

### Ticket action strip
Every ticket, the Next up hero included, ends with a labelled strip under a dashed `paper-line` rule: pill buttons "Edit" and "Google Calendar" on the left, "Delete" in Danger pushed to the right (`margin-left: auto`) so it is never the neighbour of Edit. Buttons are 2.25rem tall, 2.75rem under `pointer: coarse`. Actions are always visible; nothing hides behind hover.

### Toast
The paper toast at the bottom carries the Undo for every change. It stays 12 seconds when it has an Undo (5 otherwise) and pauses while hovered or focused, resuming with at least 3 seconds left, so Undo never slips away mid-reach.

### First-run setup
A brand-new calendar (no dates, no names, no start date) that was not opened from a share link shows a three-step paper card in place of the empty board: names (filling the velvet heading live), the day you got together, then the dates you already know (checkbox rows for picks with a known day; a "Milestones together" group with 1 month, 3 months, 100 days, 6 months, 500 days and 1,000 days, upcoming ones ticked and passed ones marked "Already passed"; optional date fields for birthdays, first date and moving in). Step titles are serif display, progress reads "Step 2 of 3" beside the buttons, and "Skip setup" is a plain underlined text button. Finishing adds everything in one undoable change; a `relationship-calendar:welcomed` flag keeps it from coming back.

## Do's and Don'ts

### Do:
- **Do** use Stamp Ink as the accent for anything sitting on paper, and Rose as the accent for anything sitting on velvet lining — check the ground before picking the accent.
- **Do** build any new ticket-like or stub-like shape with a real CSS `mask`/`clip-path`, keyed off a `--stub`-style custom property, never with a background image or texture.
- **Do** keep new actionable controls fully round (999px) and new static containers on the 9px/14px pair — don't introduce a third radius.
- **Do** reserve Barlow Condensed uppercase for dates, counters and short time-coded labels; keep prose, buttons and field labels in Figtree.
- **Do** provide a `forced-colors` fallback for any new masked shape (solid `CanvasText` border, mask dropped).

### Don't:
- **Don't** add a shadow to a button, chip, input or badge at rest — shadow is reserved for the paper set-pieces sitting on velvet (card, month-sheet, ticket, toast).
- **Don't** introduce a gradient, grain, or image standing in for paper or velvet texture — both grounds are flat fills (the lining's two radial gradients are ambient lighting, not material texture).
- **Don't** use icon fonts or glyph icon sets — icons are hand-drawn single-stroke (1.75) SVG symbols sharing one `<svg class="sprite">` sheet.
- **Don't** flip `color-scheme` on the page shell to light to "fix" a form control — the dark shell plus light-forced form fields and paper surfaces is the deliberate way native controls stay legible against paper.
