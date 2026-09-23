// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { occurrences, nextOccurrence, addMonthsClamped, relative, ordinal, isValidDate } from '../js/dates.js';
import { normalizeEvent, migrateLegacy, merge } from '../js/model.js';
import { milestones } from '../js/milestones.js';
import { toICS, fromICS, fold, escapeText, reminderTrigger, parseDuration } from '../js/ics.js';
import { shareLink, readShareLink, googleCalendarLink, toBackup, fromBackup } from '../js/share.js';

const ev = (fields) => normalizeEvent({ title: 'Test', date: '2026-01-31', ...fields });

test('dates validate real calendar days only', () => {
  assert.ok(isValidDate('2024-02-29'));
  assert.ok(!isValidDate('2025-02-29'));
  assert.ok(!isValidDate('2026-13-01'));
  assert.ok(!isValidDate('31.01.2026'));
});

test('monthly repeats keep the day of month and skip short months', () => {
  const list = occurrences(ev({ repeat: 'monthly' }), '2026-01-01', '2026-12-31');
  assert.deepEqual(list, ['2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31', '2026-08-31', '2026-10-31', '2026-12-31']);
});

test('yearly repeats do not drift across leap years', () => {
  const list = occurrences(ev({ date: '2023-06-15', repeat: 'yearly' }), '2023-01-01', '2030-12-31');
  assert.equal(list.length, 8);
  assert.ok(list.every((d) => d.endsWith('-06-15')));
});

test('weekly repeats stop at the end date and start from the window', () => {
  const e = ev({ date: '2026-01-01', repeat: 'weekly', until: '2026-02-01' });
  assert.deepEqual(occurrences(e, '2026-01-10', '2026-12-31'), ['2026-01-15', '2026-01-22', '2026-01-29']);
});

test('repeats without an end date terminate', () => {
  const e = ev({ date: '2020-03-01', repeat: 'weekly' });
  assert.equal(nextOccurrence(e, '2026-09-23'), '2026-09-27');
});

test('clamped months keep a one-off milestone in short months', () => {
  assert.equal(addMonthsClamped('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonthsClamped('2024-02-29', 12), '2025-02-28');
});

test('relative wording and ordinals', () => {
  assert.equal(relative('2026-09-23', '2026-09-23'), 'today');
  assert.equal(relative('2026-09-24', '2026-09-23'), 'tomorrow');
  assert.equal(relative('2026-10-05', '2026-09-23'), 'in 12 days');
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th']);
});

test('normalizeEvent rejects bad input and cleans fields', () => {
  assert.equal(normalizeEvent({ title: '', date: '2026-01-01' }), null);
  assert.equal(normalizeEvent({ title: 'x', date: 'nope' }), null);
  const e = normalizeEvent({ title: '  Dinner ', date: '2026-01-01', repeat: 'hourly', until: '2025-01-01', category: 'evil', time: '25:00' });
  assert.equal(e.title, 'Dinner');
  assert.equal(e.repeat, 'none');
  assert.equal(e.until, '');
  assert.equal(e.category, 'other');
  assert.equal(e.time, '');
});

test('legacy data migrates with real months', () => {
  const out = migrateLegacy([
    { title: 'Monthly', start: '2026-01-31', pattern: 'linear', interval: '30', until: '' },
    { title: 'Growing', start: '2026-01-01', pattern: 'exponential' },
    { title: 'Once', start: '2026-02-14', pattern: 'single' },
  ]);
  assert.equal(out[0].repeat, 'monthly');
  assert.equal(out.filter((e) => e.title === 'Growing').length, 15);
  assert.equal(out.at(-1).date, '2026-02-14');
});

test('merge skips duplicates and keeps newer copies', () => {
  const a = ev({ id: 'aaaaaaaa', updated: '2026-01-01T00:00:00.000Z' });
  const newer = { ...a, title: 'Renamed', updated: '2026-02-01T00:00:00.000Z' };
  const dupe = ev({ id: 'bbbbbbbb' });
  const fresh = ev({ id: 'cccccccc', date: '2026-03-01' });
  const result = merge([a], [newer, dupe, fresh]);
  assert.equal(result.updated, 1);
  assert.equal(result.added, 1);
  assert.equal(result.events.length, 2);
  assert.equal(result.events.find((e) => e.id === 'aaaaaaaa').title, 'Renamed');
});

test('milestones count the first day as day one', () => {
  const list = milestones('2026-01-01', { days: true, months: true, years: true, fun: false });
  assert.equal(list.find((m) => m.title === '100 days together').date, '2026-04-10');
  assert.equal(list.find((m) => m.title === '1 month together').date, '2026-02-01');
  assert.equal(list.find((m) => m.title === '1st anniversary').date, '2027-01-01');
});

test('ics export: all-day, RRULE, alarm, CRLF, folding', () => {
  const e = ev({ id: 'fixed-id-1', title: 'Our anniversary; with, commas', repeat: 'yearly', reminder: '1d', category: 'anniversary' });
  const text = toICS([e], { now: new Date(Date.UTC(2026, 8, 23)) });
  assert.ok(text.includes('DTSTART;VALUE=DATE:20260131\r\n'));
  assert.ok(text.includes('DTEND;VALUE=DATE:20260201\r\n'));
  assert.ok(text.includes('RRULE:FREQ=YEARLY\r\n'));
  assert.ok(text.includes('UID:fixed-id-1@relationship-calendar'));
  assert.ok(text.includes('SUMMARY:Our anniversary\\; with\\, commas'));
  assert.ok(text.includes('TRIGGER:-PT15H'));
  assert.ok(text.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75));
  assert.equal(fold('x'.repeat(80)), `${'x'.repeat(75)}\r\n ${'x'.repeat(5)}`);
  assert.equal(escapeText('a\nb'), 'a\\nb');
});

test('ics export: timed floating events and reminders', () => {
  const e = ev({ time: '19:30', duration: 180, reminder: 'day' });
  const text = toICS([e]);
  assert.ok(text.includes('DTSTART:20260131T193000\r\n'));
  assert.ok(text.includes('DTEND:20260131T223000\r\n'));
  assert.equal(reminderTrigger(e), '-PT10H30M');
  assert.equal(reminderTrigger({ ...e, reminder: '1w' }), '-P7DT10H30M');
  assert.equal(parseDuration('-P6DT15H'), -(6 * 1440 + 900));
});

test('ics round-trip keeps every field', () => {
  const list = [
    ev({ id: 'round-trip-1', title: 'Trip to Lisbon', category: 'trip', place: 'Lisbon, PT', notes: 'Line one\nLine two', reminder: '1w' }),
    ev({ id: 'round-trip-2', date: '2026-03-14', time: '19:00', duration: 150, repeat: 'monthly', until: '2026-12-31', category: 'date', reminder: 'day' }),
    ev({ id: 'round-trip-3', date: '2026-05-02', title: 'Ünïcödé 💞 '.repeat(8).trim(), repeat: 'weekly' }),
  ];
  const { events, skipped } = fromICS(toICS(list));
  assert.equal(skipped, 0);
  for (const original of list) {
    const back = events.find((e) => e.id === original.id);
    for (const key of ['title', 'date', 'time', 'duration', 'category', 'repeat', 'until', 'place', 'notes', 'reminder']) {
      assert.deepEqual(back[key], original[key], `${original.id}.${key}`);
    }
  }
});

test('ics import handles foreign calendars', () => {
  const text = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:abc@example.com',
    'DTSTART;TZID=Europe/Zurich:20260214T200000',
    'DURATION:PT2H',
    'RRULE:FREQ=YEARLY;COUNT=3',
    'SUMMARY:Valentine\'s dinner',
    'CATEGORIES:Birthday,Work',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'DTSTART:20260301',
    'RRULE:FREQ=WEEKLY;INTERVAL=2',
    'SUMMARY:Every other week',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:No date',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
  const { events, skipped, simplified } = fromICS(text);
  assert.equal(events.length, 2);
  assert.equal(skipped, 1);
  assert.equal(simplified, 1);
  assert.equal(events[0].time, '20:00');
  assert.equal(events[0].duration, 120);
  assert.equal(events[0].until, '2028-02-14');
  assert.equal(events[0].category, 'birthday');
  assert.equal(events[1].repeat, 'none');
});

test('share link round-trips through the URL fragment', async () => {
  const list = [ev({ id: 'share-1', notes: 'hello' }), ev({ id: 'share-2', date: '2026-02-01', time: '08:15' })];
  const settings = { names: ['Alex', 'Sam'], since: '2020-05-05' };
  const url = await shareLink(list, settings, 'https://calendar.example/');
  const back = await readShareLink(new URL(url).hash);
  assert.deepEqual(back.settings, settings);
  assert.deepEqual(back.events.map((e) => [e.id, e.date, e.time, e.notes]), list.map((e) => [e.id, e.date, e.time, e.notes]));
  assert.equal(await readShareLink('#share=zgarbage'), null);
});

test('backup round-trips', () => {
  const list = [ev({ id: 'backup-1' })];
  const back = fromBackup(toBackup(list, { names: ['A', 'B'], since: '' }));
  assert.equal(back.events[0].id, 'backup-1');
  assert.throws(() => fromBackup('{"nope":1}'));
});

test('google calendar link', () => {
  const link = new URL(googleCalendarLink(ev({ time: '23:00', duration: 120, repeat: 'yearly' })));
  assert.equal(link.searchParams.get('dates'), '20260131T230000/20260201T010000');
  assert.equal(link.searchParams.get('recur'), 'RRULE:FREQ=YEARLY');
});
