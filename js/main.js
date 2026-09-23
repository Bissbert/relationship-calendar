// UI wiring. All user text goes through textContent; nothing is parsed as HTML.

import {
  isValidDate, parts, fromParts, daysInMonth, today, addDays, diffDays, addMonthsClamped,
  weekday, occurrences, nextOccurrence, monthShort, monthLong, weekdayShort,
  formatDate, formatLong, relative, ordinal,
} from './dates.js';
import { CATEGORIES, REPEATS, REMINDERS, newId, normalizeEvent, load, save, sortEvents, merge } from './model.js';
import { MILESTONE_SETS, milestones } from './milestones.js';
import { toICS, fromICS } from './ics.js';
import { shareLink, readShareLink, toBackup, fromBackup, googleCalendarLink, download } from './share.js';

const $ = (id) => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';

const state = load();
const ui = {
  view: 'list',
  filter: 'all',
  showPast: false,
  editingId: null,
  month: today().slice(0, 7),
  selectedDay: today(),
  fresh: new Set(),
  saveWarned: false,
};

// ------------------------------------------------------------ helpers

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'on') for (const [type, fn] of Object.entries(value)) node.addEventListener(type, fn);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

function icon(name, cls = 'icon') {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

function persist() {
  if (!save(state) && !ui.saveWarned) {
    ui.saveWarned = true;
    toast('This browser is not letting us save. Download a backup so nothing is lost.');
  }
}

// Every change goes through here so it can be undone from the toast.
function change(message, mutate) {
  const before = { events: state.events.map((e) => ({ ...e })), settings: structuredClone(state.settings) };
  mutate();
  persist();
  render();
  toast(message, () => {
    state.events = before.events;
    state.settings = before.settings;
    if (ui.editingId && !state.events.some((e) => e.id === ui.editingId)) resetForm();
    persist();
    syncSettingsInputs();
    render();
    toast('Undone.');
  });
}

function coupleName() {
  const [a, b] = state.settings.names;
  if (a && b) return `${a} & ${b}`;
  return a || b || '';
}

function formatTime(event) {
  if (!event.time) return '';
  const hours = event.duration / 60;
  const length = event.duration % 60 === 0 ? `${hours} h` : event.duration < 60 ? `${event.duration} min` : `${hours.toFixed(1)} h`;
  return `${event.time} · ${length}`;
}

// ------------------------------------------------------------ toast

let toastTimer = 0;
let toastUndo = null;

function toast(message, undo = null) {
  const box = $('toast');
  $('toast-text').textContent = message;
  toastUndo = undo;
  $('toast-action').hidden = !undo;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; toastUndo = null; }, undo ? 9000 : 5000);
}

$('toast-action').addEventListener('click', () => {
  const fn = toastUndo;
  toastUndo = null;
  $('toast').hidden = true;
  fn?.();
});

// ------------------------------------------------------------ tickets

function stamp(date, { showYear }) {
  const { y, m, d } = parts(date);
  return el('div', { class: 'stamp', 'aria-hidden': 'true' }, [
    el('span', { class: 'stamp-day', text: String(d) }),
    el('span', { class: 'stamp-month', text: monthShort(m) }),
    el('span', { class: 'stamp-year', text: showYear ? String(y) : weekdayShort(date) }),
  ]);
}

function metaList(event, { long = false, occ } = {}) {
  const cat = CATEGORIES[event.category];
  const items = [
    el('li', { class: `kind kind-${event.category}` }, [icon(cat.icon), el('span', { text: cat.label })]),
  ];
  if (long) items.unshift(el('li', {}, [el('span', { text: formatLong(occ) })]));
  if (event.repeat !== 'none') {
    const until = event.until ? ` until ${formatDate(event.until)}` : '';
    items.push(el('li', {}, [icon('repeat'), el('span', { text: `${REPEATS[event.repeat]}${until}` })]));
  }
  if (event.time) items.push(el('li', {}, [icon('clock'), el('span', { text: formatTime(event) })]));
  if (event.place) items.push(el('li', {}, [icon('pin'), el('span', { text: event.place })]));
  if (event.reminder !== 'none') items.push(el('li', {}, [icon('bell'), el('span', { text: REMINDERS[event.reminder] })]));
  return el('ul', { class: 'ticket-meta' }, items);
}

function ticket(event, occ, { past = false, big = false, now = today() } = {}) {
  const when = relative(occ, now);
  const showYear = parts(occ).y !== parts(now).y;
  const label = `${event.title}, ${formatLong(occ)}, ${when}`;

  const side = [el('span', { class: `when${occ === now ? ' is-today' : ''}`, text: when })];
  if (!big) {
    side.push(el('div', { class: 'ticket-actions' }, [
      el('button', { type: 'button', class: 'icon-btn', 'data-edit': event.id, 'aria-label': `Edit “${event.title}”`, on: { click: () => startEdit(event.id) } }, icon('pencil')),
      el('a', { class: 'icon-btn', href: googleCalendarLink(event), target: '_blank', rel: 'noopener', 'aria-label': `Add “${event.title}” to Google Calendar (opens in a new tab)` }, icon('cal-plus')),
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Delete “${event.title}”`, on: { click: () => removeEvent(event.id) } }, icon('trash')),
    ]));
  }

  const body = el('div', { class: 'ticket-body' }, [
    el('div', {}, [
      el(big ? 'p' : 'h3', { class: 'ticket-title', text: event.title }),
      metaList(event, { long: big, occ }),
    ]),
    el('div', { class: 'ticket-side' }, side),
    !big && event.notes ? el('p', { class: 'ticket-notes', text: event.notes }) : null,
  ]);

  const card = el('article', { class: `ticket${past ? ' is-past' : ''}`, 'aria-label': label }, [
    el('div', { class: 'stub' }, stamp(occ, { showYear })),
    body,
  ]);
  const fresh = ui.fresh.has(event.id);
  return el(big ? 'div' : 'li', { class: `ticket-wrap${fresh ? ' is-new' : ''}` }, card);
}

// ------------------------------------------------------------ header

function renderHeader(now) {
  const [a, b] = state.settings.names;
  const names = $('couple-names');
  names.replaceChildren();
  if (a && b) names.append(a, el('span', { class: 'amp', text: ' & ' }), b);
  else names.textContent = a || b || 'Our calendar';
  document.title = coupleName() ? `${coupleName()} · Relationship Calendar` : 'Relationship Calendar';

  const together = $('together');
  together.replaceChildren();
  const since = state.settings.since;
  if (!since) {
    together.append(el('button', {
      type: 'button',
      class: 'together-link',
      text: 'Add the day you got together to start the counter',
      on: { click: () => openSettings('since') },
    }));
  } else if (since > now) {
    together.append(el('span', { text: `Starts ${relative(since, now)}, on ${formatDate(since)}` }));
  } else {
    const n = diffDays(since, now) + 1;
    together.append(
      el('span', { class: 'count', text: `Day ${n.toLocaleString('en-US')}` }),
      el('span', { text: `together, since ${formatDate(since)}` }),
    );
  }
}

function renderNext(upcoming, now) {
  const box = $('next-ticket');
  box.replaceChildren();
  const first = upcoming[0];
  if (!first) {
    box.append(el('div', { class: 'next-empty' }, el('p', { text: 'Nothing planned yet. Add a date and it will be stamped here.' })));
    return;
  }
  box.append(ticket(first.event, first.occ, { big: true, now }));
}

// ------------------------------------------------------------ list

// Most recent occurrence of an event that has none left.
function lastOccurrence(event, now) {
  if (event.repeat === 'none') return event.date;
  const end = event.until || now;
  const from = addDays(end, -400);
  return occurrences(event, from > event.date ? from : event.date, end).at(-1) || event.date;
}

function split(now) {
  const upcoming = [];
  const past = [];
  for (const event of state.events) {
    const occ = nextOccurrence(event, now);
    if (occ) upcoming.push({ event, occ });
    else {
      past.push({ event, occ: lastOccurrence(event, now) });
    }
  }
  const byOcc = (x, y) => (x.occ + x.event.time).localeCompare(y.occ + y.event.time) || x.event.title.localeCompare(y.event.title);
  upcoming.sort(byOcc);
  past.sort((x, y) => byOcc(y, x));
  return { upcoming, past };
}

const matches = (event) => ui.filter === 'all' || event.category === ui.filter;

function renderFilters() {
  const box = $('filters');
  box.replaceChildren();
  const counts = {};
  for (const e of state.events) counts[e.category] = (counts[e.category] || 0) + 1;
  const present = Object.keys(CATEGORIES).filter((k) => counts[k]);
  if (present.length < 2) {
    ui.filter = 'all';
    return;
  }
  if (ui.filter !== 'all' && !counts[ui.filter]) ui.filter = 'all';
  const chip = (key, label, n, iconName) => el('button', {
    type: 'button',
    class: 'chip',
    'aria-pressed': String(ui.filter === key),
    on: { click: () => { ui.filter = key; render(); } },
  }, [iconName ? icon(iconName) : null, el('span', { text: label }), el('span', { class: 'n', text: String(n) })]);
  box.append(chip('all', 'All', state.events.length));
  for (const key of present) box.append(chip(key, CATEGORIES[key].label, counts[key], CATEGORIES[key].icon));
}

function groupByMonth(items, now, past) {
  const frag = document.createDocumentFragment();
  let current = null;
  let list = null;
  for (const item of items) {
    const key = item.occ.slice(0, 7);
    if (key !== current) {
      current = key;
      const { y, m } = parts(item.occ);
      const title = el('h3', { class: 'group-title' }, [
        el('span', { text: monthLong(m) }),
        y !== parts(now).y ? el('span', { class: 'year', text: String(y) }) : null,
      ]);
      list = el('ul', { class: 'tickets' });
      frag.append(el('section', { class: 'group', 'aria-label': `${monthLong(m)} ${y}` }, [title, list]));
    }
    list.append(ticket(item.event, item.occ, { past, now }));
  }
  return frag;
}

function emptyState() {
  return el('div', { class: 'empty' }, [
    el('h3', { text: 'Your first date goes here' }),
    el('p', { text: 'Add an anniversary, a birthday or the next date night. Or let the milestone generator find the days worth celebrating, like your 1,000th day together.' }),
    el('div', { class: 'empty-actions' }, [
      el('button', { type: 'button', class: 'btn btn-rose', on: { click: () => { selectTab('single'); focusComposer(); } } }, [icon('plus'), el('span', { text: 'Add a date' })]),
      el('button', { type: 'button', class: 'btn btn-ghost-light', on: { click: () => { selectTab('milestones'); focusComposer(); } } }, [icon('sparkle'), el('span', { text: 'Generate milestones' })]),
    ]),
  ]);
}

function renderList({ upcoming, past }, now) {
  const box = $('upcoming');
  box.replaceChildren();
  const shown = upcoming.filter((x) => matches(x.event));
  const shownPast = past.filter((x) => matches(x.event));

  if (!state.events.length) box.append(emptyState());
  else if (!shown.length) {
    box.append(el('div', { class: 'empty' }, [
      el('h3', { text: 'Nothing coming up' }),
      el('p', { text: ui.filter === 'all' ? 'All your dates are in the past. Add the next one.' : 'No upcoming dates of this kind.' }),
    ]));
  } else box.append(groupByMonth(shown, now, false));

  const toggle = $('past-toggle');
  toggle.hidden = !shownPast.length;
  toggle.textContent = ui.showPast ? 'Hide past dates' : `Show past dates (${shownPast.length})`;
  toggle.setAttribute('aria-expanded', String(ui.showPast));
  const pastBox = $('past');
  pastBox.hidden = !ui.showPast || !shownPast.length;
  pastBox.replaceChildren();
  if (!pastBox.hidden) pastBox.append(groupByMonth(shownPast, now, true));
}

$('past-toggle').addEventListener('click', () => {
  ui.showPast = !ui.showPast;
  render();
});

// ------------------------------------------------------------ month view

function monthRange() {
  const [y, m] = ui.month.split('-').map(Number);
  const first = fromParts(y, m, 1);
  const offset = (weekday(first) + 6) % 7;
  const start = addDays(first, -offset);
  const weeks = Math.ceil((offset + daysInMonth(y, m)) / 7);
  return { y, m, first, start, end: addDays(start, weeks * 7 - 1), weeks };
}

function eventsByDay(from, to) {
  const map = new Map();
  for (const event of state.events) {
    if (!matches(event)) continue;
    for (const d of occurrences(event, from, to, 60)) {
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(event);
    }
  }
  for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
  return map;
}

function renderMonth(now, focus = false) {
  const { y, m, start, end, weeks } = monthRange();
  $('month-title').textContent = `${monthLong(m)} ${y}`;
  if (ui.selectedDay.slice(0, 7) !== ui.month) ui.selectedDay = now.slice(0, 7) === ui.month ? now : fromParts(y, m, 1);
  const byDay = eventsByDay(start, end);

  const grid = $('month-grid');
  grid.replaceChildren();
  const head = el('tr', {}, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => el('th', {
    scope: 'col',
    abbr: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
    text: d,
  })));
  grid.append(el('thead', {}, head));
  const body = el('tbody');
  for (let w = 0; w < weeks; w++) {
    const row = el('tr');
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, w * 7 + i);
      const list = byDay.get(date) || [];
      const outside = date.slice(0, 7) !== ui.month;
      const selected = date === ui.selectedDay;
      const cls = ['day', outside && 'is-outside', date === now && 'is-today'].filter(Boolean).join(' ');
      const btn = el('button', {
        type: 'button',
        class: cls,
        'data-date': date,
        tabindex: selected ? '0' : '-1',
        'aria-label': `${formatLong(date)}${date === now ? ', today' : ''}${list.length ? `, ${plural(list.length, 'date')}` : ''}`,
        on: { click: () => selectDay(date, false) },
      }, [
        el('span', { class: 'day-num', text: String(parts(date).d) }),
        list.length ? el('span', { class: 'day-events' }, [
          ...list.slice(0, 2).map((e) => el('span', { class: `day-event kind-${e.category}` }, [icon(CATEGORIES[e.category].icon), el('span', { text: e.title })])),
          list.length > 2 ? el('span', { class: 'day-more', text: `+${list.length - 2} more` }) : null,
        ]) : null,
      ]);
      row.append(el('td', { role: 'gridcell', 'aria-selected': String(selected) }, btn));
    }
    body.append(row);
  }
  grid.append(body);
  renderDayDetail(byDay.get(ui.selectedDay) || [], now);
  if (focus) grid.querySelector(`[data-date="${ui.selectedDay}"]`)?.focus();
}

function renderDayDetail(list, now) {
  const box = $('day-detail');
  const day = ui.selectedDay;
  box.replaceChildren(
    el('div', { class: 'day-detail-head' }, [
      el('h3', { text: formatLong(day) }),
      el('button', {
        type: 'button',
        class: 'btn btn-rose btn-small',
        on: { click: () => { resetForm(); selectTab('single'); $('f-date').value = day; focusComposer(); } },
      }, [icon('plus'), el('span', { text: 'Add a date on this day' })]),
    ]),
    list.length
      ? el('ul', { class: 'tickets' }, list.map((e) => ticket(e, day, { past: day < now, now })))
      : el('p', { class: 'day-detail-empty', text: 'Nothing on this day.' }),
  );
}

function selectDay(date, focus = true) {
  ui.selectedDay = date;
  ui.month = date.slice(0, 7);
  renderMonth(today(), focus);
}

function shiftMonth(n) {
  const [y, m] = ui.month.split('-').map(Number);
  const target = addMonthsClamped(fromParts(y, m, 1), n);
  ui.month = target.slice(0, 7);
  const d = Math.min(parts(ui.selectedDay).d, daysInMonth(...target.split('-').slice(0, 2).map(Number)));
  ui.selectedDay = `${ui.month}-${String(d).padStart(2, '0')}`;
  renderMonth(today());
}

$('month-prev').addEventListener('click', () => shiftMonth(-1));
$('month-next').addEventListener('click', () => shiftMonth(1));
$('month-today').addEventListener('click', () => selectDay(today(), false));

$('month-grid').addEventListener('keydown', (e) => {
  const current = ui.selectedDay;
  const dow = (weekday(current) + 6) % 7;
  const moves = {
    ArrowLeft: () => addDays(current, -1),
    ArrowRight: () => addDays(current, 1),
    ArrowUp: () => addDays(current, -7),
    ArrowDown: () => addDays(current, 7),
    Home: () => addDays(current, -dow),
    End: () => addDays(current, 6 - dow),
    PageUp: () => addMonthsClamped(current, e.shiftKey ? -12 : -1),
    PageDown: () => addMonthsClamped(current, e.shiftKey ? 12 : 1),
  };
  if (!moves[e.key]) return;
  e.preventDefault();
  selectDay(moves[e.key]());
});

// ------------------------------------------------------------ views

function setView(view) {
  ui.view = view;
  for (const btn of document.querySelectorAll('.seg')) btn.setAttribute('aria-pressed', String(btn.dataset.view === view));
  $('list-view').hidden = view !== 'list';
  $('month-view').hidden = view !== 'month';
  try { localStorage.setItem('relationship-calendar:view', view); } catch { /* per-viewer nicety only */ }
  render();
}

for (const btn of document.querySelectorAll('.seg')) btn.addEventListener('click', () => setView(btn.dataset.view));

// ------------------------------------------------------------ render

function render() {
  const now = today();
  const groups = split(now);
  renderHeader(now);
  renderNext(groups.upcoming, now);
  renderFilters();
  if (ui.view === 'list') renderList(groups, now);
  else renderMonth(now);
  renderTakeaway();
  if (!$('milestone-form').hidden) renderMilestonePreview();
  ui.fresh.clear();
}

function renderTakeaway() {
  const n = state.events.length;
  $('export-label').textContent = n ? `Download calendar file · ${plural(n, 'date')}` : 'Download calendar file';
  for (const id of ['export-btn', 'share-btn', 'backup-btn', 'clear-btn']) $(id).disabled = !n;
}

// ------------------------------------------------------------ settings

function syncSettingsInputs() {
  $('name-a').value = state.settings.names[0];
  $('name-b').value = state.settings.names[1];
  $('since').value = state.settings.since;
}

function openSettings(focusId = 'name-a') {
  $('settings').hidden = false;
  $('settings-toggle').setAttribute('aria-expanded', 'true');
  $(focusId).focus();
}

function closeSettings() {
  $('settings').hidden = true;
  $('settings-toggle').setAttribute('aria-expanded', 'false');
}

$('settings-toggle').addEventListener('click', () => ($('settings').hidden ? openSettings() : closeSettings()));

$('settings').addEventListener('input', () => {
  state.settings.names = [$('name-a').value.trim().slice(0, 40), $('name-b').value.trim().slice(0, 40)];
  state.settings.since = isValidDate($('since').value) ? $('since').value : '';
  if (!$('m-since').value && state.settings.since) $('m-since').value = state.settings.since;
  persist();
  render();
});

$('settings').addEventListener('submit', (e) => {
  e.preventDefault();
  closeSettings();
  $('settings-toggle').focus();
});

// ------------------------------------------------------------ composer

function buildComposer() {
  const kinds = $('f-kinds');
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    kinds.append(el('label', { class: 'kind-option' }, [
      el('input', { type: 'radio', name: 'category', value: key, checked: key === 'other' }),
      el('span', {}, [icon(cat.icon), cat.label]),
    ]));
  }
  for (const [key, label] of Object.entries(REPEATS)) $('f-repeat').append(el('option', { value: key, text: label }));
  for (const [key, label] of Object.entries(REMINDERS)) $('f-reminder').append(el('option', { value: key, text: label }));

  const sets = $('m-sets');
  for (const [key, set] of Object.entries(MILESTONE_SETS)) {
    sets.append(el('label', { class: 'check' }, [
      el('input', { type: 'checkbox', name: 'set', value: key, checked: key !== 'fun' }),
      el('span', {}, [set.label, el('small', { text: set.hint })]),
    ]));
  }
}

function selectTab(which) {
  const single = which === 'single';
  $('tab-single').setAttribute('aria-selected', String(single));
  $('tab-milestones').setAttribute('aria-selected', String(!single));
  $('tab-single').tabIndex = single ? 0 : -1;
  $('tab-milestones').tabIndex = single ? -1 : 0;
  $('event-form').hidden = !single;
  $('milestone-form').hidden = single;
  if (!single) {
    if (ui.editingId) resetForm();
    if (!$('m-since').value) $('m-since').value = state.settings.since;
    renderMilestonePreview();
  }
}

$('tab-single').addEventListener('click', () => selectTab('single'));
$('tab-milestones').addEventListener('click', () => selectTab('milestones'));
document.querySelector('.tabs').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const toSingle = e.key === 'Home' || ($('tab-single').getAttribute('aria-selected') !== 'true' && e.key !== 'End');
  selectTab(toSingle ? 'single' : 'milestones');
  $(toSingle ? 'tab-single' : 'tab-milestones').focus();
});

function focusComposer() {
  const target = $('event-form').hidden ? $('m-since') : $('f-title');
  document.querySelector('.composer').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
}

function syncConditionalFields() {
  const hasTime = Boolean($('f-time').value);
  $('duration-field').hidden = !hasTime;
  const repeat = $('f-repeat').value;
  $('until-field').hidden = repeat === 'none';

  const hint = $('repeat-hint');
  const date = $('f-date').value;
  let text = '';
  if (isValidDate(date)) {
    const { m, d } = parts(date);
    if (repeat === 'monthly' && d > 28) text = `Months without a ${ordinal(d)} are skipped, the way calendar apps do it. Pick the 28th or earlier to get every month.`;
    if (repeat === 'yearly' && m === 2 && d === 29) text = 'This only comes around in leap years. Calendar apps skip the other years.';
  }
  hint.textContent = text;
  hint.hidden = !text;
}

for (const id of ['f-time', 'f-repeat', 'f-date']) $(id).addEventListener('input', syncConditionalFields);

function setError(id, message) {
  const input = $(id);
  $(`${id}-error`).textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  return !message;
}

for (const id of ['f-title', 'f-date', 'f-until', 'm-since']) $(id).addEventListener('input', () => setError(id, ''));

function readForm() {
  const title = $('f-title').value.trim();
  const date = $('f-date').value;
  const repeat = $('f-repeat').value;
  const until = repeat === 'none' ? '' : $('f-until').value;
  const ok = [
    setError('f-title', title ? '' : 'Give this date a name.'),
    setError('f-date', isValidDate(date) ? '' : 'Pick a day.'),
    setError('f-until', !until || !isValidDate(date) || until >= date ? '' : 'The end has to be on or after the first date.'),
  ];
  if (ok.includes(false)) {
    document.querySelector('#event-form [aria-invalid="true"]')?.focus();
    return null;
  }
  return {
    title,
    date,
    time: $('f-time').value,
    duration: $('f-duration').value,
    category: document.querySelector('#f-kinds input:checked')?.value || 'other',
    repeat,
    until,
    reminder: $('f-reminder').value,
    place: $('f-place').value,
    notes: $('f-notes').value,
  };
}

function setSubmitMode(editing) {
  $('composer-heading').textContent = editing ? 'Edit date' : 'Add a date';
  $('submit-label').textContent = editing ? 'Save changes' : 'Add date';
  $('submit-btn').querySelector('use').setAttribute('href', editing ? '#i-check' : '#i-plus');
  $('cancel-edit').hidden = !editing;
  document.querySelector('.composer .card').classList.toggle('is-editing', editing);
}

function resetForm() {
  ui.editingId = null;
  $('event-form').reset();
  for (const id of ['f-title', 'f-date', 'f-until']) setError(id, '');
  $('more-details').open = false;
  setSubmitMode(false);
  syncConditionalFields();
}

function startEdit(id) {
  const event = state.events.find((e) => e.id === id);
  if (!event) return;
  selectTab('single');
  resetForm();
  ui.editingId = id;
  $('f-title').value = event.title;
  $('f-date').value = event.date;
  $('f-time').value = event.time;
  if (event.time) {
    const select = $('f-duration');
    if (![...select.options].some((o) => Number(o.value) === event.duration)) {
      select.append(el('option', { value: String(event.duration), text: `${event.duration} minutes` }));
    }
    select.value = String(event.duration);
  }
  document.querySelector(`#f-kinds input[value="${event.category}"]`).checked = true;
  $('f-repeat').value = event.repeat;
  $('f-until').value = event.until;
  $('f-reminder').value = event.reminder;
  $('f-place').value = event.place;
  $('f-notes').value = event.notes;
  $('more-details').open = Boolean(event.place || event.notes);
  setSubmitMode(true);
  syncConditionalFields();
  focusComposer();
}

$('cancel-edit').addEventListener('click', () => {
  const id = ui.editingId;
  resetForm();
  document.querySelector(`[data-edit="${id}"]`)?.focus();
});

$('event-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = readForm();
  if (!raw) return;
  const stamp = new Date().toISOString();

  if (ui.editingId) {
    const old = state.events.find((x) => x.id === ui.editingId);
    const updated = normalizeEvent({ ...raw, id: old.id, group: old.group, created: old.created, updated: stamp });
    ui.fresh.add(updated.id);
    resetForm();
    change(`Saved “${updated.title}”.`, () => {
      state.events = sortEvents(state.events.map((x) => (x.id === updated.id ? updated : x)));
    });
    return;
  }

  const event = normalizeEvent({ ...raw, created: stamp, updated: stamp });
  ui.fresh.add(event.id);
  resetForm();
  change(`Added “${event.title}” on ${formatDate(event.date)}.`, () => {
    state.events = sortEvents([...state.events, event]);
  });
  $('f-title').focus();
});

function removeEvent(id) {
  const event = state.events.find((e) => e.id === id);
  if (!event) return;
  if (ui.editingId === id) resetForm();
  change(`Deleted “${event.title}”.`, () => {
    state.events = state.events.filter((e) => e.id !== id);
  });
  document.querySelector('#dates').focus({ preventScroll: true });
}

// ------------------------------------------------------------ milestones

function chosenSets() {
  const sets = {};
  for (const input of document.querySelectorAll('#m-sets input')) sets[input.value] = input.checked;
  return sets;
}

function pendingMilestones() {
  const since = $('m-since').value;
  if (!isValidDate(since)) return null;
  const now = today();
  const existing = new Set(state.events.map((e) => `${e.title}|${e.date}`));
  return milestones(since, chosenSets())
    .filter((m) => $('m-past').checked || m.date >= now)
    .filter((m) => !existing.has(`${m.title}|${m.date}`));
}

function renderMilestonePreview() {
  const list = pendingMilestones();
  const preview = $('m-preview');
  preview.replaceChildren();
  const button = $('m-submit');
  if (!list) {
    $('m-count').textContent = 'Pick the day you got together to see your milestones.';
    $('m-submit-label').textContent = 'Add milestones';
    button.disabled = true;
    return;
  }
  const now = today();
  $('m-count').textContent = list.length ? `${plural(list.length, 'date')} to add` : 'Nothing new to add with these choices.';
  $('m-submit-label').textContent = list.length ? `Add ${plural(list.length, 'milestone')}` : 'Add milestones';
  button.disabled = !list.length;
  for (const m of list.slice(0, 8)) {
    preview.append(el('li', {}, [
      el('span', { text: m.title }),
      el('span', {}, [el('span', { class: 'd', text: formatDate(m.date) }), ' ', el('span', { class: 'p', text: relative(m.date, now) })]),
    ]));
  }
  if (list.length > 8) preview.append(el('li', { class: 'p', text: `and ${list.length - 8} more` }));
}

$('milestone-form').addEventListener('input', () => {
  setError('m-since', '');
  renderMilestonePreview();
});

$('milestone-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const since = $('m-since').value;
  if (!setError('m-since', isValidDate(since) ? '' : 'Pick the day you got together.')) {
    $('m-since').focus();
    return;
  }
  const list = pendingMilestones();
  if (!list.length) return;
  const group = newId();
  const reminder = $('m-remind').checked ? '1d' : 'none';
  const events = list.map((m) => normalizeEvent({ title: m.title, date: m.date, category: 'milestone', reminder, group }));
  for (const ev of events) ui.fresh.add(ev.id);
  change(`Added ${plural(events.length, 'milestone')}.`, () => {
    state.events = sortEvents([...state.events, ...events]);
    if (!state.settings.since) state.settings.since = since;
  });
  syncSettingsInputs();
  if (ui.view !== 'list') setView('list');
});

// ------------------------------------------------------------ take away

$('export-btn').addEventListener('click', () => {
  if (!state.events.length) return;
  const name = coupleName() ? `${coupleName()} · Relationship Calendar` : 'Relationship Calendar';
  download('relationship-calendar.ics', toICS(state.events, { name }), 'text/calendar');
  toast(`Downloaded ${plural(state.events.length, 'date')}. Open the file to add them to your calendar.`);
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = el('textarea', { class: 'visually-hidden', readonly: true });
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

$('share-btn').addEventListener('click', async () => {
  if (!state.events.length) return;
  const link = await shareLink(state.events, state.settings, `${location.origin}${location.pathname}`);
  const copied = await copyText(link);
  if (!copied) toast('Could not copy the link. Save a backup and send the file instead.');
  else if (link.length > 8000) toast(`Link copied. It is long (${plural(state.events.length, 'date')}); some chat apps cut long links, so a backup file may travel better.`);
  else toast(`Share link copied with ${plural(state.events.length, 'date')}. Paste it to your partner.`);
});

$('backup-btn').addEventListener('click', () => {
  if (!state.events.length) return;
  download(`relationship-calendar-backup-${today()}.json`, toBackup(state.events, state.settings), 'application/json');
  toast(`Backup saved with ${plural(state.events.length, 'date')}.`);
});

function applyIncoming(incoming, settings, source) {
  const result = merge(state.events, incoming);
  if (!result.added && !result.updated) {
    toast(`Nothing new in ${source}. You already have ${incoming.length === 1 ? 'that date' : 'all of these dates'}.`);
    return;
  }
  for (const ev of incoming) ui.fresh.add(ev.id);
  const bits = [result.added && `added ${plural(result.added, 'date')}`, result.updated && `updated ${result.updated}`].filter(Boolean).join(', ');
  change(`From ${source}: ${bits}.`, () => {
    state.events = sortEvents(result.events);
    if (settings) {
      if (!state.settings.names.some(Boolean)) state.settings.names = settings.names;
      if (!state.settings.since) state.settings.since = settings.since;
    }
  });
  syncSettingsInputs();
}

$('import-input').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast('That file is too large to be a calendar or backup.');
    return;
  }
  const text = await file.text();
  try {
    if (/\.json$/i.test(file.name) || text.trimStart().startsWith('{')) {
      const data = fromBackup(text);
      applyIncoming(data.events, data.settings, 'the backup');
    } else if (text.includes('BEGIN:VCALENDAR')) {
      const { events, skipped, simplified } = fromICS(text);
      if (!events.length) {
        toast('No dates found in that calendar file.');
        return;
      }
      applyIncoming(events, null, 'the calendar file');
      const notes = [skipped && `${plural(skipped, 'entry', 'entries')} without a date skipped`, simplified && `${plural(simplified, 'repeat')} too complex to keep, added once`].filter(Boolean);
      if (notes.length) setTimeout(() => toast(`${notes.join('; ')}.`), 2500);
    } else {
      toast('That is not a calendar (.ics) or backup (.json) file.');
    }
  } catch (err) {
    toast(err instanceof SyntaxError ? 'That backup file is damaged and could not be read.' : err.message);
  }
});

$('clear-btn').addEventListener('click', () => {
  const n = state.events.length;
  if (!n) return;
  resetForm();
  change(`Removed ${plural(n, 'date')}.`, () => {
    state.events = [];
  });
});

// ------------------------------------------------------------ share links

async function checkShareLink() {
  const data = await readShareLink(location.hash);
  if (!location.hash.startsWith('#share=')) return;
  const clear = () => history.replaceState(null, '', `${location.pathname}${location.search}`);
  const banner = $('share-banner');
  if (!data || !data.events.length) {
    clear();
    toast('That share link is incomplete or damaged. Ask for a fresh one.');
    return;
  }
  const from = data.settings.names.filter(Boolean).join(' & ');
  $('share-text').textContent = `${plural(data.events.length, 'shared date is', 'shared dates are')} ready to add${from ? ` from ${from}` : ''}.`;
  banner.hidden = false;
  $('share-accept').onclick = () => {
    banner.hidden = true;
    clear();
    applyIncoming(data.events, data.settings, 'the share link');
  };
  $('share-dismiss').onclick = () => {
    banner.hidden = true;
    clear();
  };
}

window.addEventListener('hashchange', checkShareLink);

// ------------------------------------------------------------ start

buildComposer();
syncSettingsInputs();
syncConditionalFields();
try {
  if (localStorage.getItem('relationship-calendar:view') === 'month') setView('month');
} catch { /* ignore */ }
render();
checkShareLink();

// Keep "today" honest for tabs left open overnight.
let lastDay = today();
setInterval(() => {
  if (today() !== lastDay) {
    lastDay = today();
    render();
  }
}, 60_000);
