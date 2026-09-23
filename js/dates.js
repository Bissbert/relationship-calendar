// Calendar-date helpers. Dates are plain 'YYYY-MM-DD' strings so that no
// timezone ever shifts an anniversary; arithmetic runs on UTC midnights.

const DAY_MS = 86400000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDate(value) {
  const m = ISO_DATE.exec(value || '');
  if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

export function parts(value) {
  const [y, m, d] = value.split('-').map(Number);
  return { y, m, d };
}

export function fromParts(y, m, d) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function toUTC(value) {
  const { y, m, d } = parts(value);
  return Date.UTC(y, m - 1, d);
}

export function fromUTC(ms) {
  const dt = new Date(ms);
  return fromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function today(now = new Date()) {
  return fromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(value, n) {
  return fromUTC(toUTC(value) + n * DAY_MS);
}

export function diffDays(a, b) {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

// Adds whole months. Returns null when the day does not exist in the target
// month (e.g. the 31st in April), matching how calendar apps expand RRULEs.
export function addMonthsStrict(value, n) {
  const { y, m, d } = parts(value);
  const index = (m - 1) + n;
  const ty = y + Math.floor(index / 12);
  const tm = ((index % 12) + 12) % 12 + 1;
  return d <= daysInMonth(ty, tm) ? fromParts(ty, tm, d) : null;
}

// Adds whole months, clamping to the last day of a short month. Used for
// one-off milestones such as "1 month together", which should still exist.
export function addMonthsClamped(value, n) {
  const { y, m, d } = parts(value);
  const index = (m - 1) + n;
  const ty = y + Math.floor(index / 12);
  const tm = ((index % 12) + 12) % 12 + 1;
  return fromParts(ty, tm, Math.min(d, daysInMonth(ty, tm)));
}

export function weekday(value) {
  return new Date(toUTC(value)).getUTCDay();
}

// Occurrences of an event (single or repeating) that fall in [from, to].
// Monthly/yearly repeats skip dates that do not exist, as RFC 5545 does.
export function occurrences(event, from, to, limit = 500) {
  const out = [];
  const start = event.date;
  if (!isValidDate(start)) return out;
  const last = event.until && event.until < to ? event.until : to;
  if (start > last) return out;

  if (!event.repeat || event.repeat === 'none') {
    if (start >= from) out.push(start);
    return out;
  }

  if (event.repeat === 'weekly') {
    const skip = start < from ? Math.ceil(diffDays(start, from) / 7) : 0;
    for (let i = skip; out.length < limit; i++) {
      const next = addDays(start, i * 7);
      if (next > last) break;
      out.push(next);
    }
    return out;
  }

  const step = event.repeat === 'yearly' ? 12 : 1;
  const { y, m } = parts(start);
  const f = parts(from);
  const monthsToFrom = (f.y - y) * 12 + (f.m - m);
  let i = Math.max(0, Math.floor(monthsToFrom / step) - 1);
  for (let guard = 0; out.length < limit && guard < 10000; i++, guard++) {
    const next = addMonthsStrict(start, i * step);
    if (next === null) continue;
    if (next > last) break;
    if (next >= from) out.push(next);
  }
  return out;
}

export function nextOccurrence(event, from) {
  const horizon = addDays(from, 366 * 9);
  return occurrences(event, from, horizon, 1)[0] || null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const monthShort = (m) => MONTHS[m - 1];
export const monthLong = (m) => MONTHS_LONG[m - 1];
export const weekdayShort = (value) => WEEKDAYS[weekday(value)];
export const weekdayLong = (value) => WEEKDAYS_LONG[weekday(value)];

export function formatDate(value, { weekday: withWeekday = false, year = true } = {}) {
  const { y, m, d } = parts(value);
  const main = `${d} ${MONTHS[m - 1]}${year ? ` ${y}` : ''}`;
  return withWeekday ? `${WEEKDAYS[weekday(value)]}, ${main}` : main;
}

export function formatLong(value) {
  const { y, m, d } = parts(value);
  return `${WEEKDAYS_LONG[weekday(value)]}, ${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

export function relative(value, from) {
  const n = diffDays(from, value);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 1 && n < 60) return `in ${n} days`;
  if (n < -1 && n > -60) return `${-n} days ago`;
  const months = Math.round(Math.abs(n) / 30.44);
  if (months < 24) return n > 0 ? `in ${months} months` : `${months} months ago`;
  const years = Math.round(Math.abs(n) / 365.25);
  return n > 0 ? `in ${years} years` : `${years} years ago`;
}

export function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
}
