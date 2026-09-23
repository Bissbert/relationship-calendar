// Quick picks: common dates most couples keep, with sensible repeat and
// reminder rules. Picking one fills the form; nothing is saved until the
// person presses Add.

import { isValidDate, parts, fromParts, addDays, weekday, daysInMonth } from './dates.js';

// Next occurrence of a fixed month/day on or after `from`.
function nextOnOrAfter(from, m, d) {
  const { y } = parts(from);
  for (let year = y; year <= y + 8; year++) {
    if (d > daysInMonth(year, m)) continue;
    const date = fromParts(year, m, d);
    if (date >= from) return date;
  }
  return '';
}

// Next given weekday (0 = Sunday) on or after `from`.
function nextWeekday(from, day) {
  return addDays(from, (day - weekday(from) + 7) % 7);
}

const possessive = (name) => (/s$/i.test(name) ? `${name}’` : `${name}’s`);

// Returns the quick picks for the current names and start date. Each one
// has a stable key, a chip label and the form values it fills in. `date` is
// empty when only the couple can know it.
export function presets(settings, now) {
  const [a, b] = settings.names.map((n) => n.trim());
  const since = isValidDate(settings.since) ? settings.since : '';
  const birthdays = a || b
    ? [a, b].filter(Boolean).map((name, i) => ({
      key: `birthday-${i}`,
      title: `${possessive(name)} birthday`,
    }))
    : [{ key: 'birthday-0', title: 'Birthday' }];

  return [
    {
      key: 'anniversary',
      title: 'Our anniversary',
      category: 'anniversary',
      repeat: 'yearly',
      reminder: '1w',
      date: since,
    },
    ...birthdays.map((p) => ({ ...p, category: 'birthday', repeat: 'yearly', reminder: '1w', date: '' })),
    {
      key: 'first-date',
      title: 'Our first date',
      category: 'anniversary',
      repeat: 'yearly',
      reminder: 'day',
      date: '',
    },
    {
      key: 'date-night',
      label: 'Weekly date night',
      title: 'Date night',
      category: 'date',
      repeat: 'weekly',
      reminder: 'day',
      date: nextWeekday(now, 5),
      time: '19:00',
      duration: 180,
    },
    {
      key: 'valentines',
      title: 'Valentine’s Day',
      category: 'date',
      repeat: 'yearly',
      reminder: '1w',
      date: nextOnOrAfter(now, 2, 14),
    },
    {
      key: 'moved-in',
      title: 'Moved in together',
      category: 'milestone',
      repeat: 'yearly',
      reminder: 'day',
      date: '',
    },
  ].map((p) => ({ label: p.title, time: '', duration: 60, ...p }));
}

// A pick is hidden once a date with the same title exists.
export function availablePresets(settings, events, now) {
  const taken = new Set(events.map((e) => e.title.trim().toLowerCase()));
  return presets(settings, now).filter((p) => !taken.has(p.title.toLowerCase()));
}
