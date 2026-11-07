#!/usr/bin/env node
// autobyteus-416 API/E2E desktop step runner (API-07…API-12). Connects to an isolated desktop instance over its CDP
// control port (playwright-core connectOverCDP) and runs one step module against it. Based on autobyteus-403's
// abx403-desktop-step.mjs. A step module exports `default async (ctx) => result`, where ctx has:
//   browser, main (the app window: URL contains /renderer/index.html), instance (the `isolated-app start` result),
//   out (evidence dir), args, shot(page, name), openTab(url) (the app's own window.electronAPI.openBrowserTab, the path
//   the UI and attachment opens use; returns { tabId, page }), navigateTab(tabId, url), tabPage(predicate),
//   nodeLog() (the embedded node's log lines), refusals(lines) (its Remote Access refusal lines), gql(query, vars)
//   (a program's GraphQL call to the embedded node: no Origin), sleep, assert, waitFor.
// The step's JSON result goes to <out>/<step name>-result.json and stdout. The app's windows are left as they are.
// Usage: node api-desktop-step.mjs <worktree> <instance.json> <node log file> <step module> <out dir> [args…]
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const [worktree, instanceFile, nodeLogFile, stepFile, out, ...args] = process.argv.slice(2);
const require = createRequire(path.join(worktree, 'autobyteus-web', 'package.json'));
const { chromium } = require('playwright-core');
const instance = JSON.parse(readFileSync(instanceFile, 'utf8')).result;
await fs.mkdir(out, { recursive: true });
setTimeout(() => { console.log(JSON.stringify({ ok: false, error: 'step timed out' })); process.exit(2); }, Number(process.env.STEP_TIMEOUT_MS ?? 240000)).unref?.();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (c, m, d) => { if (!c) throw Object.assign(new Error(m), { details: d }); };
const waitFor = async (what, fn, ms = 30_000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(250); } throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`); };
const browser = await chromium.connectOverCDP(instance.controlEndpoint);
const allPages = () => browser.contexts().flatMap(c => c.pages());
const main = allPages().find(p => p.url().includes('/renderer/index.html'));
assert(main, 'the app window', allPages().map(p => p.url()));
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`) }).catch(e => `screenshot failed: ${e.message}`);
const tabPage = (predicate, ms = 30_000) => waitFor('the in-app browser tab', async () => allPages().find(p => p !== main && predicate(p.url())), ms);
const openTab = async (url) => {
  const snapshot = await main.evaluate(request => window.electronAPI.openBrowserTab(request), { url, waitUntil: 'load' });
  const tabId = snapshot.activeTabId;
  const session = snapshot.sessions.find(s => s.tabId === tabId || s.id === tabId) ?? null;
  // Exact URL: several tabs can show the same route with different query strings (F1 ?path=…).
  const page = await tabPage(u => u === url || u === new URL(url).href);
  return { tabId, session, snapshot, page };
};
const navigateTab = (tabId, url) => main.evaluate(request => window.electronAPI.navigateBrowserTab(request), { tabId, url, waitUntil: 'load' });
// Complete lines only (the trailing empty element after the last newline is dropped), so `nodeLog().length` taken before an
// action is the index of the first line the action writes.
const nodeLog = () => { const lines = readFileSync(nodeLogFile, 'utf8').split('\n'); if (lines.at(-1) === '') lines.pop(); return lines; };
const refusals = (lines = nodeLog()) => lines.filter(l => /Remote Access request refused|Remote Access WebSocket rejected/.test(l));
const gql = async (query, variables = {}) => { const r = await fetch(instance.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const j = await r.json(); if (j.errors?.length) throw new Error(JSON.stringify(j.errors)); return j.data; };
const step = (await import(pathToFileURL(path.resolve(stepFile)).href)).default;
const name = path.basename(stepFile).replace(/\.mjs$/, '');
let output;
try { output = { ok: true, step: name, at: new Date().toISOString(), result: await step({ browser, main, instance, out, args, shot, openTab, navigateTab, tabPage, allPages, nodeLog, refusals, gql, sleep, assert, waitFor }) }; }
catch (error) { output = { ok: false, step: name, at: new Date().toISOString(), error: error.message, details: error.details ?? null, stack: error.stack }; }
await fs.writeFile(path.join(out, `${name}-result.json`), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 1));
process.exit(output.ok ? 0 : 1);
