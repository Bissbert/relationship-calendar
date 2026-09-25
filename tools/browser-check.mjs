// Drives the page in headless Chromium and prints what it sees. Run by
// tools/linux-run.sh inside the Playwright container; needs `playwright`.
//
//   node tools/browser-check.mjs <repo-dir>
//
// The clock is fixed at 2026-09-24 10:00 so dates in the output are stable.
// Robin & Kai are fictional.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.argv[2] || '.');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const file = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.clock.setFixedTime(new Date('2026-09-24T10:00:00'));
await page.addInitScript(() => localStorage.setItem('relationship-calendar:welcomed', '1'));
await page.goto(base);

const say = (label, value) => console.log(`${label.padEnd(34)} ${value}`);
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('relationship-calendar:v2') || '{"events":[]}').events);
const toastText = () => page.evaluate(() => (document.getElementById('toast').hidden ? '(hidden)' : document.getElementById('toast-text').textContent));

say('browser', `Chromium ${browser.version()}`);
say('composer open on empty calendar', await page.getAttribute('#composer-toggle', 'aria-expanded'));

// A weekly date with an end date, and markup in the title.
await page.fill('#f-title', 'Walk with <b>Kai</b>');
await page.fill('#f-date', '2026-10-01');
await page.selectOption('#f-repeat', 'weekly');
say('"Until" field shown for weekly', !(await page.isHidden('#until-field')));
await page.fill('#f-until', '2026-10-29');
await page.click('#submit-btn');
let events = await stored();
say('stored events after add', events.length);
say('stored repeat / until', `${events[0].repeat} / ${events[0].until}`);
say('title rendered as text', await page.evaluate(() => !document.querySelector('#upcoming b') && document.getElementById('upcoming').textContent.includes('<b>Kai</b>')));
say('toast after add', await toastText());
say('Undo button shown', !(await page.isHidden('#toast-action')));

// Delete from the ticket, then undo.
await page.click('.ticket-action-delete');
say('stored events after delete', (await stored()).length);
say('toast after delete', await toastText());
await page.click('#toast-action');
say('stored events after undo', (await stored()).length);
say('toast after undo', await toastText());

// Start over: the button and its confirmation live in their own section.
say('#clear-btn inside #start-over', await page.evaluate(() => document.getElementById('start-over').contains(document.getElementById('clear-btn'))));
await page.click('#clear-btn');
say('confirmation shown', !(await page.isHidden('#clear-confirm')));
say('confirmation text', await page.textContent('#clear-question'));
await page.click('#clear-no');
say('stored events after "Keep them"', (await stored()).length);

// Calendar help: the dialog leads with the steps for the device in hand.
await page.click('#cal-help-btn');
say('help dialog open', await page.evaluate(() => document.getElementById('cal-help').open));
say('help leads with (desktop UA)', await page.getAttribute('#cal-help-here .cal-help-steps', 'data-platform'));
say('other devices in disclosure', await page.locator('.cal-help-other .cal-help-steps').count());
const [file] = await Promise.all([page.waitForEvent('download'), page.click('#cal-help-download')]);
say('download from dialog', file.suggestedFilename());
say('dialog still open after download', await page.evaluate(() => document.getElementById('cal-help').open));
await page.keyboard.press('Escape');
say('dialog closed by Escape', await page.evaluate(() => !document.getElementById('cal-help').open));
for (const [name, userAgent] of [
  ['iPhone Safari', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'],
  ['iPhone Chrome', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1'],
  ['Android Chrome', 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'],
]) {
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent, hasTouch: true });
  await phone.addInitScript(() => localStorage.setItem('relationship-calendar:welcomed', '1'));
  await phone.goto(base);
  await phone.click('#cal-help-btn');
  const lead = await phone.getAttribute('#cal-help-here .cal-help-steps', 'data-platform');
  const wide = await phone.evaluate(() => document.getElementById('cal-help').scrollWidth > document.getElementById('cal-help').clientWidth);
  say(`help leads with (${name})`, `${lead}${wide ? ', overflows' : ''}`);
  await phone.close();
}

say('page wider than 390 px viewport', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
say('console / page errors', errors.length ? errors.join(' | ') : 'none');

await browser.close();
server.close();
