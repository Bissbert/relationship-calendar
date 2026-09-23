// First-run setup: decides who sees it and turns the answers into dates.
// DOM wiring lives in main.js; this stays pure so it can be tested.

import { isValidDate } from './dates.js';
import { normalizeEvent } from './model.js';
import { presets } from './presets.js';

export const WELCOMED_KEY = 'relationship-calendar:welcomed';

// Only a truly empty calendar gets the setup, and never someone arriving
// from a share link: they came to add someone else's dates first.
export function shouldWelcome(state, hash, welcomed) {
  if (welcomed) return false;
  if (String(hash || '').startsWith('#share=')) return false;
  if (state.events.length) return false;
  return !state.settings.names.some(Boolean) && !state.settings.since;
}

// Picks with a known date are offered as checkboxes; the rest need a day
// only the couple knows, so they get a date field.
export function welcomeChoices(settings, now) {
  const all = presets(settings, now);
  return {
    ticks: all.filter((p) => p.date).map((p) => ({ ...p, checked: p.key !== 'date-night' })),
    fields: all.filter((p) => !p.date),
  };
}

// `ticked` is a set of pick keys, `dates` maps pick keys to YYYY-MM-DD.
export function welcomeEvents(settings, now, ticked, dates) {
  return presets(settings, now)
    .map((p) => {
      if (p.date) return ticked.has(p.key) ? p : null;
      return isValidDate(dates[p.key]) ? { ...p, date: dates[p.key] } : null;
    })
    .filter(Boolean)
    .map(({ title, date, time, duration, category, repeat, reminder }) =>
      normalizeEvent({ title, date, time, duration, category, repeat, reminder }))
    .filter(Boolean);
}
