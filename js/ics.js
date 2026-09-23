// iCalendar (RFC 5545) export and import.
//
// Export: all-day events use VALUE=DATE; timed events use floating local
// time, so a date night at 19:00 stays at 19:00 wherever it is opened and no
// VTIMEZONE block is needed. Repeats become RRULEs, reminders VALARMs, and
// UIDs are stable so re-importing updates events instead of duplicating them.

import { fromParts, addDays, diffDays, occurrences, isValidDate } from './dates.js';
import { CATEGORIES, normalizeEvent } from './model.js';

const UID_DOMAIN = 'relationship-calendar';
const REMINDER_HOUR = 9;

const compact = (date) => date.replaceAll('-', '');
const pad = (n) => String(n).padStart(2, '0');

export function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Folds a content line at 75 octets without splitting a UTF-8 sequence.
export function fold(line) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const out = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const bytes = encoder.encode(ch).length;
    const max = out.length === 0 ? 75 : 74;
    if (size + bytes > max) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += bytes;
  }
  out.push(current);
  return out.join('\r\n ');
}

function stampUTC(date = new Date()) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function minutesOf(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function localDateTime(date, minutes) {
  const dayOffset = Math.floor(minutes / 1440);
  const rest = minutes - dayOffset * 1440;
  const day = addDays(date, dayOffset);
  return `${compact(day)}T${pad(Math.floor(rest / 60))}${pad(rest % 60)}00`;
}

export function durationString(minutes) {
  const sign = minutes < 0 ? '-' : '';
  let rest = Math.abs(minutes);
  const days = Math.floor(rest / 1440);
  rest -= days * 1440;
  const hours = Math.floor(rest / 60);
  const mins = rest % 60;
  let out = `${sign}P`;
  if (days) out += `${days}D`;
  if (hours || mins || !days) {
    out += 'T';
    if (hours) out += `${hours}H`;
    if (mins || (!hours)) out += `${mins}M`;
  }
  return out;
}

export function parseDuration(value) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value || '');
  if (!m) return null;
  const minutes = (+m[2] || 0) * 10080 + (+m[3] || 0) * 1440 + (+m[4] || 0) * 60 + (+m[5] || 0) + Math.round((+m[6] || 0) / 60);
  return m[1] === '-' ? -minutes : minutes;
}

// Every reminder fires at 09:00 local time (or at the start, if earlier).
export function reminderTrigger(event) {
  if (event.reminder === 'none') return null;
  const onTheDay = event.time ? Math.min(REMINDER_HOUR * 60 - minutesOf(event.time), 0) : REMINDER_HOUR * 60;
  const daysBefore = { day: 0, '1d': 1, '1w': 7 }[event.reminder] ?? 0;
  return durationString(onTheDay - daysBefore * 1440);
}

function reminderFromTrigger(minutesFromStart, startMinutes) {
  const fireAt = startMinutes + minutesFromStart;
  if (fireAt < -6 * 1440) return '1w';
  if (fireAt < 0) return '1d';
  return 'day';
}

export function eventLines(event, now = new Date()) {
  const lines = ['BEGIN:VEVENT', `UID:${event.id}@${UID_DOMAIN}`, `DTSTAMP:${stampUTC(now)}`];
  if (event.time) {
    const start = minutesOf(event.time);
    lines.push(`DTSTART:${localDateTime(event.date, start)}`);
    lines.push(`DTEND:${localDateTime(event.date, start + event.duration)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compact(event.date)}`);
    lines.push(`DTEND;VALUE=DATE:${compact(addDays(event.date, 1))}`);
    lines.push('TRANSP:TRANSPARENT');
  }
  if (event.repeat !== 'none') {
    let rule = `RRULE:FREQ=${event.repeat.toUpperCase()}`;
    if (event.until) rule += `;UNTIL=${compact(event.until)}${event.time ? 'T235959' : ''}`;
    lines.push(rule);
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.place) lines.push(`LOCATION:${escapeText(event.place)}`);
  if (event.notes) lines.push(`DESCRIPTION:${escapeText(event.notes)}`);
  lines.push(`CATEGORIES:${escapeText(CATEGORIES[event.category].label)}`);
  lines.push(`X-RC-CATEGORY:${event.category}`);
  if (event.group) lines.push(`X-RC-GROUP:${event.group}`);
  const updated = new Date(event.updated);
  if (!Number.isNaN(updated.getTime())) lines.push(`LAST-MODIFIED:${stampUTC(updated)}`);
  const trigger = reminderTrigger(event);
  if (trigger) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(event.title)}`, `TRIGGER:${trigger}`, 'END:VALARM');
  }
  lines.push('END:VEVENT');
  return lines;
}

export function toICS(events, { name = 'Relationship Calendar', now = new Date() } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Relationship Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
  ];
  for (const event of events) lines.push(...eventLines(event, now));
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------- import

function unescapeText(value) {
  return value.replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));
}

function parseLine(line) {
  const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  if (colon < 0) return null;
  const head = line.slice(0, colon).split(';');
  const params = {};
  for (const p of head.slice(1)) {
    const [k, v = ''] = p.split('=');
    params[k.toUpperCase()] = v.replace(/^"|"$/g, '');
  }
  return { name: head[0].toUpperCase(), params, value: line.slice(colon + 1) };
}

// Returns { date, time } in local terms for a DTSTART/DTEND value.
function parseDateValue(prop) {
  const v = prop.value.trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v);
  if (!m) return null;
  if (!m[4] || prop.params.VALUE === 'DATE') return { date: fromParts(+m[1], +m[2], +m[3]), time: '' };
  if (m[7]) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
    return { date: fromParts(d.getFullYear(), d.getMonth() + 1, d.getDate()), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
  }
  return { date: fromParts(+m[1], +m[2], +m[3]), time: `${m[4]}:${m[5]}` };
}

function minutesBetween(a, b) {
  const days = diffDays(a.date, b.date);
  return days * 1440 + (b.time ? minutesOf(b.time) : 0) - (a.time ? minutesOf(a.time) : 0);
}

function categoryFrom(props) {
  const own = props['X-RC-CATEGORY']?.value;
  if (own && own in CATEGORIES) return own;
  const list = (props.CATEGORIES?.value || '').toLowerCase();
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (list.includes(key) || list.includes(cat.label.toLowerCase())) return key;
  }
  return 'other';
}

// Parses .ics text into normalized events. Returns { events, skipped, simplified }.
export function fromICS(text) {
  const raw = String(text).replace(/\r\n[ \t]|\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let skipped = 0;
  let simplified = 0;
  let current = null;
  let alarm = null;

  for (const line of raw) {
    const prop = parseLine(line);
    if (!prop) continue;
    if (prop.name === 'BEGIN' && prop.value === 'VEVENT') {
      current = { props: {}, alarms: [] };
    } else if (prop.name === 'BEGIN' && prop.value === 'VALARM' && current) {
      alarm = {};
    } else if (prop.name === 'END' && prop.value === 'VALARM' && current) {
      if (alarm) current.alarms.push(alarm);
      alarm = null;
    } else if (prop.name === 'END' && prop.value === 'VEVENT' && current) {
      const result = buildEvent(current);
      if (result.event) events.push(result.event);
      else skipped++;
      if (result.simplified) simplified++;
      current = null;
    } else if (alarm) {
      alarm[prop.name] = prop;
    } else if (current && !(prop.name in current.props)) {
      current.props[prop.name] = prop;
    }
  }
  return { events, skipped, simplified };
}

function buildEvent({ props, alarms }) {
  const start = props.DTSTART && parseDateValue(props.DTSTART);
  if (!start || !isValidDate(start.date)) return { event: null };
  let simplified = false;

  let duration = 60;
  if (start.time) {
    const end = props.DTEND && parseDateValue(props.DTEND);
    const fromDuration = props.DURATION && parseDuration(props.DURATION.value);
    if (end && end.time) duration = minutesBetween(start, end);
    else if (fromDuration) duration = fromDuration;
  }

  let repeat = 'none';
  let until = '';
  if (props.RRULE) {
    const rule = Object.fromEntries(props.RRULE.value.split(';').map((p) => p.split('=')));
    const freq = (rule.FREQ || '').toLowerCase();
    const plain = ['weekly', 'monthly', 'yearly'].includes(freq) && (!rule.INTERVAL || rule.INTERVAL === '1') && !rule.BYDAY && !rule.BYSETPOS;
    if (plain) {
      repeat = freq;
      if (rule.UNTIL) until = parseDateValue({ value: rule.UNTIL, params: {} })?.date || '';
      if (rule.COUNT) {
        const list = occurrences({ date: start.date, repeat }, start.date, addDays(start.date, 366 * 200), +rule.COUNT);
        until = list[list.length - 1] || '';
      }
    } else {
      simplified = true;
    }
  }

  let reminder = 'none';
  const trigger = alarms.map((a) => a.TRIGGER).find((t) => t && !t.params.VALUE);
  const offset = trigger && parseDuration(trigger.value);
  if (offset !== null && offset !== undefined) reminder = reminderFromTrigger(offset, start.time ? minutesOf(start.time) : 0);

  const uid = props.UID?.value || '';
  const own = uid.endsWith(`@${UID_DOMAIN}`) ? uid.slice(0, -UID_DOMAIN.length - 1) : '';
  const modified = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(props['LAST-MODIFIED']?.value || '');

  const event = normalizeEvent({
    id: own || undefined,
    title: unescapeText(props.SUMMARY?.value || '') || 'Untitled date',
    date: start.date,
    time: start.time,
    duration,
    category: categoryFrom(props),
    repeat,
    until,
    place: unescapeText(props.LOCATION?.value || ''),
    notes: unescapeText(props.DESCRIPTION?.value || ''),
    reminder,
    group: props['X-RC-GROUP']?.value || '',
    updated: modified ? `${modified[1]}-${modified[2]}-${modified[3]}T${modified[4]}:${modified[5]}:${modified[6]}.000Z` : undefined,
  });
  return { event, simplified };
}
