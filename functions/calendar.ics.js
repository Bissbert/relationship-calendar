// GET /calendar.ics?d=<payload>: turns the dates in the query string back
// into a .ics file so iOS shows its "Add All" calendar sheet. The payload is
// the same one share links use. Nothing is stored or logged, and the file is
// always rebuilt from normalized dates, so this can't echo arbitrary text.

import { readCalendarFileUrl } from '../js/share.js';
import { calendarName } from '../js/model.js';
import { toICS } from '../js/ics.js';

const PRIVATE = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex',
};

export async function onRequestGet({ request }) {
  const data = await readCalendarFileUrl(request.url);
  if (!data || !data.events.length) {
    return new Response('This calendar link is incomplete. Go back and tap “Add to my calendar” again.\n', {
      status: 400,
      headers: { ...PRIVATE, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return new Response(toICS(data.events, { name: calendarName(data.settings) }), {
    headers: {
      ...PRIVATE,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="relationship-calendar.ics"',
    },
  });
}
