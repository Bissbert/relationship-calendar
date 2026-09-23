// Event model, validation, and localStorage persistence.

import { isValidDate, addDays, addMonthsClamped } from './dates.js';

export const CATEGORIES = {
  anniversary: { label: 'Anniversary', icon: 'rings' },
  birthday: { label: 'Birthday', icon: 'cake' },
  date: { label: 'Date night', icon: 'glass' },
  trip: { label: 'Trip', icon: 'bag' },
  milestone: { label: 'Milestone', icon: 'flag' },
  other: { label: 'Other', icon: 'heart' },
};

export const REPEATS = {
  none: 'Does not repeat',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
};

export const REMINDERS = {
  none: 'No reminder',
  day: 'On the day',
  '1d': '1 day before',
  '1w': '1 week before',
};

const STORAGE_KEY = 'relationship-calendar:v2';
const LEGACY_KEY = 'relationshipEvents';
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

// Returns a clean event, or null when the input cannot be salvaged. Used for
// form input, imports, share links, and stored data alike.
export function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const date = String(raw.date || '');
  if (!isValidDate(date)) return null;
  const title = clip(raw.title, 120);
  if (!title) return null;

  const repeat = raw.repeat in REPEATS ? raw.repeat : 'none';
  const until = repeat !== 'none' && isValidDate(raw.until) && raw.until >= date ? raw.until : '';
  const time = TIME.test(raw.time || '') ? raw.time : '';
  const duration = time ? Math.min(Math.max(parseInt(raw.duration, 10) || 60, 15), 24 * 60) : 0;
  const stamp = new Date().toISOString();

  return {
    id: /^[\w-]{6,64}$/.test(raw.id || '') ? raw.id : newId(),
    title,
    date,
    time,
    duration,
    category: raw.category in CATEGORIES ? raw.category : 'other',
    repeat,
    until,
    place: clip(raw.place, 160),
    notes: clip(raw.notes, 2000),
    reminder: raw.reminder in REMINDERS ? raw.reminder : 'none',
    group: /^[\w-]{1,64}$/.test(raw.group || '') ? raw.group : '',
    created: typeof raw.created === 'string' ? raw.created : stamp,
    updated: typeof raw.updated === 'string' ? raw.updated : stamp,
  };
}

export function normalizeSettings(raw) {
  const names = Array.isArray(raw?.names) ? raw.names.slice(0, 2).map((n) => clip(n, 40)) : ['', ''];
  while (names.length < 2) names.push('');
  return {
    names,
    since: isValidDate(raw?.since) ? raw.since : '',
  };
}

// The first version stored { title, start, pattern, interval, until } with
// 30-day "months" and a fixed "exponential" schedule. Convert it faithfully.
export function migrateLegacy(list) {
  const out = [];
  for (const old of Array.isArray(list) ? list : []) {
    if (!old || !isValidDate(old.start)) continue;
    const base = { title: old.title || 'A special day', category: 'other' };
    if (old.pattern === 'linear') {
      const repeat = { 7: 'weekly', 30: 'monthly', 365: 'yearly' }[parseInt(old.interval, 10)] || 'weekly';
      out.push(normalizeEvent({ ...base, date: old.start, repeat, until: old.until || '' }));
    } else if (old.pattern === 'exponential') {
      const group = newId();
      let date = old.start;
      for (let i = 0; i < 4; i++) {
        out.push(normalizeEvent({ ...base, date, group }));
        date = addDays(date, 7);
      }
      for (let i = 0; i < 8; i++) {
        out.push(normalizeEvent({ ...base, date, group }));
        date = addMonthsClamped(date, 1);
      }
      for (let i = 0; i < 3; i++) {
        out.push(normalizeEvent({ ...base, date, group }));
        date = addMonthsClamped(date, 12);
      }
    } else {
      out.push(normalizeEvent({ ...base, date: old.start }));
    }
  }
  return out.filter(Boolean);
}

function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function load() {
  const stored = readStorage(STORAGE_KEY);
  if (stored) {
    return {
      events: (stored.events || []).map(normalizeEvent).filter(Boolean),
      settings: normalizeSettings(stored.settings),
    };
  }
  const legacy = readStorage(LEGACY_KEY);
  const state = { events: legacy ? migrateLegacy(legacy) : [], settings: normalizeSettings(null) };
  if (legacy) save(state);
  return state;
}

export function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ...state }));
    return true;
  } catch {
    return false;
  }
}

export function sortEvents(events) {
  return [...events].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.title.localeCompare(b.title));
}

// Merges incoming events into a list. Events with the same id replace the
// older copy; exact duplicates (same title, date and time) are skipped.
export function merge(existing, incoming) {
  const byId = new Map(existing.map((e) => [e.id, e]));
  const keys = new Set(existing.map((e) => `${e.title}|${e.date}|${e.time}`));
  let added = 0;
  let updated = 0;
  for (const ev of incoming) {
    if (byId.has(ev.id)) {
      if (byId.get(ev.id).updated < ev.updated) {
        byId.set(ev.id, ev);
        updated++;
      }
      continue;
    }
    const key = `${ev.title}|${ev.date}|${ev.time}`;
    if (keys.has(key)) continue;
    keys.add(key);
    byId.set(ev.id, ev);
    added++;
  }
  return { events: [...byId.values()], added, updated };
}
