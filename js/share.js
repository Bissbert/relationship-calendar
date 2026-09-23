// Share links, JSON backups, and Google Calendar links. A share link carries
// the compressed dates in the URL fragment, which browsers never send to the
// server, so sharing needs no backend.

import { addDays } from './dates.js';
import { normalizeEvent, normalizeSettings } from './model.js';

const SHARE_PARAM = 'share';
const FIELDS = ['id', 'title', 'date', 'time', 'duration', 'category', 'repeat', 'until', 'place', 'notes', 'reminder', 'group', 'updated'];

function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

// Compact payload: arrays of values in FIELDS order, empty values trimmed.
function pack(events, settings) {
  return {
    v: 2,
    s: settings,
    e: events.map((ev) => {
      const row = FIELDS.map((f) => ev[f] ?? '');
      while (row.length && (row[row.length - 1] === '' || row[row.length - 1] === 0)) row.pop();
      return row;
    }),
  };
}

function unpack(data) {
  if (!data || data.v !== 2 || !Array.isArray(data.e)) return null;
  const events = data.e
    .map((row) => (Array.isArray(row) ? Object.fromEntries(FIELDS.map((f, i) => [f, row[i]])) : null))
    .map(normalizeEvent)
    .filter(Boolean);
  return { events, settings: normalizeSettings(data.s) };
}

export async function shareLink(events, settings, base = location.href) {
  const json = new TextEncoder().encode(JSON.stringify(pack(events, settings)));
  let payload;
  if (typeof CompressionStream === 'function') {
    payload = `z${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
  } else {
    payload = `j${toBase64Url(json)}`;
  }
  const url = new URL(base);
  url.hash = `${SHARE_PARAM}=${payload}`;
  return url.toString();
}

export async function readShareLink(hash = location.hash) {
  const match = new RegExp(`^#${SHARE_PARAM}=([zj])([\\w-]+)$`).exec(hash);
  if (!match) return null;
  try {
    let bytes = fromBase64Url(match[2]);
    if (match[1] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    return unpack(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

export function toBackup(events, settings) {
  return JSON.stringify({ app: 'relationship-calendar', version: 2, exported: new Date().toISOString(), settings, events }, null, 2);
}

export function fromBackup(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.events)) throw new Error('This file is not a Relationship Calendar backup.');
  return {
    events: data.events.map(normalizeEvent).filter(Boolean),
    settings: normalizeSettings(data.settings),
  };
}

export function googleCalendarLink(event) {
  const compact = (d) => d.replaceAll('-', '');
  let dates;
  if (event.time) {
    const [h, m] = event.time.split(':').map(Number);
    const end = h * 60 + m + event.duration;
    const endDay = addDays(event.date, Math.floor(end / 1440));
    const endMin = end % 1440;
    const hhmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}${String(mins % 60).padStart(2, '0')}00`;
    dates = `${compact(event.date)}T${hhmm(h * 60 + m)}/${compact(endDay)}T${hhmm(endMin)}`;
  } else {
    dates = `${compact(event.date)}/${compact(addDays(event.date, 1))}`;
  }
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates });
  if (event.notes) params.set('details', event.notes);
  if (event.place) params.set('location', event.place);
  if (event.repeat !== 'none') {
    let rule = `RRULE:FREQ=${event.repeat.toUpperCase()}`;
    if (event.until) rule += `;UNTIL=${compact(event.until)}`;
    params.set('recur', rule);
  }
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
