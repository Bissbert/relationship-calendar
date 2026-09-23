// Relationship milestones counted from a start date ("the day we met").

import { addDays, addMonthsClamped, ordinal } from './dates.js';

export const MILESTONE_SETS = {
  months: { label: 'Monthiversaries', hint: '1 to 11 months' },
  days: { label: 'Day counts', hint: '100, 500, 1000 days and more' },
  years: { label: 'Anniversaries', hint: '1st to 25th, numbered' },
  fun: { label: 'Fun numbers', hint: '1111, 1234, 2222 days…' },
};

const DAY_COUNTS = [100, 200, 300, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000];
const FUN_COUNTS = [1111, 1234, 2222, 3333, 4444, 5555];

// Day N together counts the start day as day 1, so "100 days" is start + 99.
// This matches how couples count ("today is our 100th day").
export function milestones(since, sets, label = 'together') {
  const out = [];
  if (sets.months) {
    for (let n = 1; n <= 11; n++) {
      out.push({ date: addMonthsClamped(since, n), title: `${n} ${n === 1 ? 'month' : 'months'} ${label}`, set: 'months' });
    }
  }
  if (sets.days) {
    for (const n of DAY_COUNTS) out.push({ date: addDays(since, n - 1), title: `${n.toLocaleString('en-US')} days ${label}`, set: 'days' });
  }
  if (sets.fun) {
    for (const n of FUN_COUNTS) out.push({ date: addDays(since, n - 1), title: `${n} days ${label}`, set: 'fun' });
  }
  if (sets.years) {
    for (let n = 1; n <= 25; n++) {
      out.push({ date: addMonthsClamped(since, n * 12), title: `${ordinal(n)} anniversary`, set: 'years' });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
