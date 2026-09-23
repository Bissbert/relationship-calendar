// UI wiring. All user text goes through textContent; nothing is parsed as HTML.

import {
  isValidDate, parts, fromParts, daysInMonth, today, addDays, diffDays, addMonthsClamped,
  weekday, occurrences, nextOccurrence, monthShort, monthLong, weekdayShort,
  formatDate, formatLong, relative, ordinal,
} from './dates.js';
import { CATEGORIES, REPEATS, REMINDERS, newId, normalizeEvent, load, save, sortEvents, merge } from './model.js';
import { MILESTONE_SETS, milestones } from './milestones.js';
import { availablePresets } from './presets.js';
import { WELCOMED_KEY, shouldWelcome, welcomeChoices, welcomeMilestones, welcomeEvents } from './welcome.js';
import { toICS, fromICS } from './ics.js';
import { shareLink, readShareLink, toBackup, fromBackup, googleCalendarLink, download, addToDeviceCalendar } from './share.js';

const $ = (id) => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
// Phones get a one-tap button that hands the dates to their calendar app.
const onPhone = matchMedia('(pointer: coarse)').matches;

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

// The toast waits while it is hovered or focused, so Undo never slips away
// mid-reach.
let toastTimer = 0;
let toastUndo = null;
let toastLeft = 0;
let toastStarted = 0;
let toastPaused = false;

function hideToast() {
  clearTimeout(toastTimer);
  $('toast').hidden = true;
  toastUndo = null;
}

function runToastTimer(ms) {
  clearTimeout(toastTimer);
  toastPaused = false;
  toastLeft = ms;
  toastStarted = Date.now();
  toastTimer = setTimeout(hideToast, ms);
}

function toast(message, undo = null) {
  const box = $('toast');
  $('toast-text').textContent = message;
  toastUndo = undo;
  $('toast-action').hidden = !undo;
  box.hidden = false;
  runToastTimer(undo ? 12000 : 5000);
}

function pauseToast() {
  if ($('toast').hidden || toastPaused) return;
  toastPaused = true;
  clearTimeout(toastTimer);
  toastLeft = Math.max(0, toastLeft - (Date.now() - toastStarted));
}

function resumeToast() {
  if ($('toast').hidden || !toastPaused || $('toast').matches(':hover, :focus-within')) return;
  runToastTimer(Math.max(toastLeft, 3000));
}

$('toast').addEventListener('pointerenter', pauseToast);
$('toast').addEventListener('pointerleave', resumeToast);
$('toast').addEventListener('focusin', pauseToast);
$('toast').addEventListener('focusout', () => setTimeout(resumeToast));

$('toast-action').addEventListener('click', () => {
  const fn = toastUndo;
  hideToast();
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

  // Labelled actions on every ticket, the big one too. Delete sits apart at
  // the far end and wears the danger ink, so it is never mistaken for Edit.
  const actions = el('div', { class: 'ticket-actions' }, [
    el('button', { type: 'button', class: 'ticket-action', 'data-edit': event.id, 'aria-label': `Edit “${event.title}”`, on: { click: () => startEdit(event.id) } }, [icon('pencil'), el('span', { text: 'Edit' })]),
    el('a', { class: 'ticket-action', href: googleCalendarLink(event), target: '_blank', rel: 'noopener', 'aria-label': `Add “${event.title}” to Google Calendar (opens in a new tab)` }, [icon('cal-plus'), el('span', { text: 'Google Calendar' })]),
    el('button', { type: 'button', class: 'ticket-action ticket-action-delete', 'aria-label': `Delete “${event.title}”`, on: { click: () => removeEvent(event.id) } }, [icon('trash'), el('span', { text: 'Delete' })]),
  ]);

  const body = el('div', { class: 'ticket-body' }, [
    el('div', {}, [
      el(big ? 'p' : 'h3', { class: 'ticket-title', text: event.title }),
      metaList(event, { long: big, occ }),
    ]),
    el('div', { class: 'ticket-side' }, side),
    !big && event.notes ? el('p', { class: 'ticket-notes', text: event.notes }) : null,
    actions,
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
  renderQuickPicks(now);
  if (!$('milestone-form').hidden) renderMilestonePreview();
  ui.fresh.clear();
}

function renderTakeaway() {
  const n = state.events.length;
  $('export-label').textContent = onPhone ? 'Or download the file'
    : n ? `Download calendar file · ${plural(n, 'date')}` : 'Download calendar file';
  $('device-cal-label').textContent = n ? `Add to my calendar · ${plural(n, 'date')}` : 'Add to my calendar';
  for (const id of ['device-cal-btn', 'export-btn', 'share-btn', 'backup-btn', 'clear-btn']) $(id).disabled = !n;
  if (!n && !$('clear-confirm').hidden) askClear(false);
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
  $('delete-edit').hidden = !editing;
  document.querySelector('.composer .card').classList.toggle('is-editing', editing);
  renderQuickPicks();
}

// Quick picks fill the form with a common date and its usual rules. Once a
// date with the same name exists, its pick goes away.
function renderQuickPicks(now = today()) {
  const picks = ui.editingId ? [] : availablePresets(state.settings, state.events, now);
  $('quick-picks').hidden = !picks.length;
  $('f-quick').replaceChildren(...picks.map((p) => el('button', {
    type: 'button',
    class: 'quick-option',
    on: { click: () => applyPreset(p) },
  }, [el('span', {}, [icon(CATEGORIES[p.category].icon), p.label])])));
}

function applyPreset(p) {
  resetForm();
  $('f-title').value = p.title;
  $('f-date').value = p.date;
  $('f-time').value = p.time;
  $('f-duration').value = String(p.duration);
  document.querySelector(`#f-kinds input[value="${p.category}"]`).checked = true;
  $('f-repeat').value = p.repeat;
  $('f-reminder').value = p.reminder;
  syncConditionalFields();

  const rule = `${REPEATS[p.repeat].toLowerCase()}, reminder ${REMINDERS[p.reminder].toLowerCase()}`;
  let hint = `Filled in: ${rule}. Change anything, then press Add date.`;
  if (!p.date) hint = `Filled in: ${rule}. Pick the day, then press Add date.`;
  if (p.title === 'Birthday') hint = `Filled in: ${rule}. Add whose birthday it is and pick the day.`;
  $('quick-hint').textContent = hint;
  (p.title === 'Birthday' ? $('f-title') : p.date ? $('submit-btn') : $('f-date')).focus();
}

function resetForm() {
  ui.editingId = null;
  $('event-form').reset();
  for (const id of ['f-title', 'f-date', 'f-until']) setError(id, '');
  $('more-details').open = false;
  $('quick-hint').textContent = '';
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

$('delete-edit').addEventListener('click', () => removeEvent(ui.editingId));

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

function calendarFile() {
  const name = coupleName() ? `${coupleName()} · Relationship Calendar` : 'Relationship Calendar';
  return toICS(state.events, { name });
}

$('export-btn').addEventListener('click', () => {
  if (!state.events.length) return;
  download('relationship-calendar.ics', calendarFile(), 'text/calendar');
  toast(`Downloaded ${plural(state.events.length, 'date')}. Open the file to add them to your calendar.`);
});

// On phones the calendar app is one tap away, so that button leads and the
// plain download steps back to a secondary button.
if (onPhone) {
  $('device-cal-btn').hidden = false;
  $('device-cal-text').hidden = false;
  $('export-text').hidden = true;
  $('export-btn').classList.replace('btn-rose', 'btn-ghost-light');
}

$('device-cal-btn').addEventListener('click', async () => {
  if (!state.events.length) return;
  const route = await addToDeviceCalendar('relationship-calendar.ics', calendarFile());
  if (route === 'download') toast(`Downloaded ${plural(state.events.length, 'date')}. Tap the file in your downloads to open it in your calendar.`);
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

// Removing everything asks once, in place, and names how many dates go.
function askClear(open) {
  $('clear-btn').hidden = open;
  $('clear-confirm').hidden = !open;
  if (open) {
    const n = state.events.length;
    const what = n === 1 ? 'your one date' : `all ${plural(n, 'date')}`;
    $('clear-question').textContent = `Remove ${what}? You can undo it from the message that appears afterwards.`;
    $('clear-yes-label').textContent = n === 1 ? 'Yes, remove it' : `Yes, remove all ${n}`;
    $('clear-no').focus();
  }
}

$('clear-btn').addEventListener('click', () => { if (state.events.length) askClear(true); });
$('clear-no').addEventListener('click', () => { askClear(false); $('clear-btn').focus(); });
$('clear-confirm').addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  askClear(false);
  $('clear-btn').focus();
});
$('clear-yes').addEventListener('click', () => {
  const n = state.events.length;
  askClear(false);
  if (!n) return;
  resetForm();
  change(n === 1 ? 'Removed your one date.' : `Removed all ${plural(n, 'date')}.`, () => {
    state.events = [];
  });
  document.querySelector('#dates').focus({ preventScroll: true });
});

// ------------------------------------------------------------ first run

// A three-step setup for a brand-new calendar: names, start date, then the
// dates most couples know by heart. Names and start date save as they are
// typed, like the settings form; the dates are added in one undoable step.
const WELCOME_STEPS = 3;
let welcomeStep = 1;

function rememberWelcomed() {
  try { localStorage.setItem(WELCOMED_KEY, '1'); } catch { /* ignore */ }
}

function openWelcome() {
  document.body.classList.add('is-welcoming');
  $('welcome').hidden = false;
  $('w-name-a').value = state.settings.names[0];
  $('w-name-b').value = state.settings.names[1];
  $('w-since').value = state.settings.since;
  showWelcomeStep(1, false);
}

function closeWelcome() {
  document.body.classList.remove('is-welcoming');
  $('welcome').hidden = true;
}

function showWelcomeStep(step, focus = true) {
  welcomeStep = step;
  for (const panel of document.querySelectorAll('.welcome-step')) panel.hidden = Number(panel.dataset.step) !== step;
  if (step === WELCOME_STEPS) buildWelcomeDates();
  $('w-back').hidden = step === 1;
  $('w-progress').textContent = `Step ${step} of ${WELCOME_STEPS}`;
  $('w-next-label').textContent = step === WELCOME_STEPS ? 'Start my calendar' : 'Next';
  if (focus) document.querySelector(`.welcome-step[data-step="${step}"] .welcome-title`).focus();
}

function buildWelcomeDates() {
  const { ticks, fields } = welcomeChoices(state.settings, today());
  const rule = (p) => `${REPEATS[p.repeat]}, reminder ${REMINDERS[p.reminder].toLowerCase()}`;
  $('w-ticks').replaceChildren(...ticks.map((p) => el('label', { class: 'check' }, [
    el('input', { type: 'checkbox', name: p.key, checked: p.checked }),
    el('span', {}, [p.label, el('small', { text: `${rule(p)} · first on ${formatDate(p.date)}` })]),
  ])));
  const now = today();
  const marks = welcomeMilestones(state.settings.since, now);
  $('w-ms-hint').textContent = marks.length
    ? 'Counted from the day you got together, with a reminder the day before.'
    : 'Go back and add the day you got together to pick milestones like 1 month and 6 months.';
  $('w-ms').replaceChildren(...marks.map((m) => el('label', { class: 'check' }, [
    el('input', { type: 'checkbox', name: m.key, checked: m.checked }),
    el('span', {}, [m.title, el('small', { text: `${m.past ? 'Already passed' : relative(m.date, now)} · ${formatDate(m.date)}` })]),
  ])));
  $('w-fields').replaceChildren(...fields.map((p) => el('label', { class: 'field' }, [
    el('span', { class: 'field-label' }, [p.title, ' ', el('span', { class: 'optional', text: '(optional)' })]),
    el('input', { type: 'date', name: p.key }),
    el('span', { class: 'field-hint', text: p.category === 'birthday' ? 'Birth date is fine; it repeats yearly.' : rule(p) }),
  ])));
}

function syncWelcomeSettings() {
  state.settings.names = [$('w-name-a').value.trim().slice(0, 40), $('w-name-b').value.trim().slice(0, 40)];
  state.settings.since = isValidDate($('w-since').value) ? $('w-since').value : '';
  persist();
  syncSettingsInputs();
  render();
}

function finishWelcome() {
  const ticked = new Set([...$('welcome-form').querySelectorAll('.check input:checked')].map((i) => i.name));
  const dates = Object.fromEntries([...$('w-fields').querySelectorAll('input')].map((i) => [i.name, i.value]));
  const added = welcomeEvents(state.settings, today(), ticked, dates);
  rememberWelcomed();
  closeWelcome();
  if (state.settings.since && !$('m-since').value) $('m-since').value = state.settings.since;
  if (added.length) {
    for (const e of added) ui.fresh.add(e.id);
    change(`Added ${plural(added.length, 'date')}. Delete or edit any of them from its ticket.`, () => {
      state.events.push(...added);
    });
  } else {
    render();
  }
  document.querySelector('#dates').focus({ preventScroll: true });
}

$('welcome-form').addEventListener('input', (e) => {
  if (e.target.closest('.welcome-step[data-step="1"], .welcome-step[data-step="2"]')) syncWelcomeSettings();
});
$('welcome-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (welcomeStep < WELCOME_STEPS) showWelcomeStep(welcomeStep + 1);
  else finishWelcome();
});
$('w-back').addEventListener('click', () => showWelcomeStep(welcomeStep - 1));
$('w-skip').addEventListener('click', () => {
  rememberWelcomed();
  closeWelcome();
  render();
  $('f-title').focus();
});

// ------------------------------------------------------------ share links

async function checkShareLink() {
  const data = await readShareLink(location.hash);
  if (!location.hash.startsWith('#share=')) return;
  closeWelcome();
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
let welcomed = false;
try { welcomed = Boolean(localStorage.getItem(WELCOMED_KEY)); } catch { /* ignore */ }
if (shouldWelcome(state, location.hash, welcomed)) openWelcome();
checkShareLink();

// Keep "today" honest for tabs left open overnight.
let lastDay = today();
setInterval(() => {
  if (today() !== lastDay) {
    lastDay = today();
    render();
  }
}, 60_000);
