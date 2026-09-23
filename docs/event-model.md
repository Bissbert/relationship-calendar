# Event model

[← back to the overview](../README.md) · [documentation index](README.md)

`js/model.js` defines what a date is. Every path that brings data in (the
form, a share link, a backup, an `.ics` import, stored data) goes through
`normalizeEvent`, which returns a clean event or `null`.

| Field | Values |
|---|---|
| `id` | Stable identifier; kept across export, share and import. |
| `title` | Required, up to 120 characters. |
| `date` | Required, a real calendar day as `YYYY-MM-DD`. |
| `time`, `duration` | Optional `HH:MM` and 15 minutes to 24 hours. No time means all-day. |
| `category` | `anniversary`, `birthday`, `date`, `trip`, `milestone` or `other`. |
| `repeat`, `until` | `none`, `weekly`, `monthly` or `yearly`, with an optional last date. |
| `reminder` | `none`, `day` (on the day), `1d` or `1w` before. |
| `place`, `notes` | Optional text, up to 160 and 2,000 characters. |
| `group` | Shared by dates created together, such as a milestone batch. |
| `created`, `updated` | ISO timestamps; `updated` decides which copy wins in a merge. |

Settings hold the two names and the `since` date that drives the day counter
and the milestone generator.

## Dates and repeats

`js/dates.js` keeps dates as strings and does arithmetic on UTC midnights, so
time zones and daylight-saving changes never shift a day. `occurrences(event,
from, to)` expands repeats inside a window. Monthly and yearly repeats skip
days that do not exist (the 31st in April, 29 February outside leap years), the
same way calendar apps expand an `RRULE`, so what the page shows matches what
the exported file produces.

## Milestones

`js/milestones.js` counts the start day as day 1, so "100 days together" is
the start date plus 99 days, the way couples count. Month-based milestones
clamp to the end of short months, so "1 month together" from 31 January lands
on 28 February rather than disappearing. The composer skips milestones that
already exist and, unless asked, ones in the past.

## Storage and merging

State is saved as JSON under `relationship-calendar:v2`. On first load the
module converts the first version's `relationshipEvents` list, including its
fixed "exponential" schedule, into ordinary dates.

`merge(existing, incoming)` is used for share links and imports. A date with a
known `id` replaces the local copy only if it was updated more recently; a
date with the same title, day and time as an existing one is skipped. Local
names and the start date are only filled in from incoming data when they are
empty.

`localStorage` belongs to one browser on one origin. Clearing site data
removes the dates, which is why the takeaway section offers a backup file.
