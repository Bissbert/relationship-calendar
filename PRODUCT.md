# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain static HTML, CSS and ES modules. No build step and no npm runtime
dependencies. Hosted on Cloudflare Pages (direct upload) at a bissbert.ch
subdomain.

## Users

Any couple who wants to keep their shared dates (anniversaries, birthdays,
date nights, trips, relationship milestones) in the calendar app they already
use. They usually open it on a phone, add or adjust a few dates, then export
or share. Visits are occasional, not daily.

## Product Purpose

Collect a couple's important dates in one place, show what is coming up and
how long they have been together, and hand the dates to real calendar apps
(`.ics` export, Google Calendar links) so reminders happen where the couple
already looks.

Success: dates land in the partner's calendar correctly (right day, all-day,
repeating properly, with reminders) without an account.

## Positioning

A private, account-free keepsake: everything stays in the browser, and sharing
with a partner happens through a link that carries the dates itself. It
generates relationship-specific milestones (monthiversaries, 100/500/1000
days, numbered anniversaries) that general calendar apps do not.

## Capabilities and Constraints

- Events: title, date, optional time, category, repeat (weekly, monthly,
  yearly, optional end date), place, notes, reminder.
- Milestone generator from a start date.
- Upcoming list with countdowns, month view, edit, delete with undo.
- Export `.ics` (RFC 5545, all-day by default, RRULE, VALARM, stable UIDs),
  import `.ics` and JSON backups, share link in the URL fragment.
- All data lives in `localStorage`. The only time dates reach the server is
  "Add to my calendar" on iOS: `/calendar.ics` turns them back into a file on
  the spot and stores nothing.
- English only.

## Brand Commitments

- Name: Relationship Calendar.
- Generic for any couple: no personal names or in-jokes baked into the UI.

## Evidence on Hand

No real user data, testimonials or usage numbers. Screenshots in `media/`
must use fictional example events.

## Product Principles

1. Correct dates beat features: an export that lands on the wrong day is the
   worst failure.
2. Private by default: no accounts, no uploads, no tracking.
3. Plain language over scheduling jargon.
4. Every destructive action is undoable.

## Accessibility & Inclusion

WCAG 2.2 AA: labelled fields, visible focus, keyboard access for every
action including the month grid, 44px touch targets on mobile, colour never
the only signal for category.
