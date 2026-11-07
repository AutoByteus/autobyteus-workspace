#!/usr/bin/env node
// API-08 helper (autobyteus-403): runs one journey step against an isolated desktop instance over its CDP control port.
// The step module exports `default async ({ browser, pages, page, shot, log }) => result`; `page` is the window whose URL
// contains <window match> (or the first window). Prints the step's JSON result.
// Usage: node abx403-desktop-step.mjs <worktree> <controlPort> <window match|-> <step module> <evidence dir>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const [worktree, controlPort, match, stepFile, evidenceDir] = process.argv.slice(2);
const require = createRequire(path.join(worktree, 'autobyteus-web', 'package.json'));
const { chromium } = require('playwright-core');
setTimeout(() => { console.log(JSON.stringify({ ok: false, error: 'step timed out (STEP_TIMEOUT_MS)' })); process.exit(2); }, Number(process.env.STEP_TIMEOUT_MS ?? 100000)).unref?.();
console.error('connecting');
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`);
const pages = browser.contexts().flatMap(context => context.pages());
const page = (match && match !== '-' ? pages.find(p => p.url().includes(match)) : null) ?? pages[0];
const shot = (target, name) => target.screenshot({ path: path.join(evidenceDir, `${name}.png`) });
console.error('connected', pages.length);
const step = (await import(pathToFileURL(path.resolve(stepFile)).href)).default;
let output;
try {
  output = { ok: true, result: await step({ browser, pages, page, shot, log: (...a) => console.error(...a) }) };
} catch (error) {
  output = { ok: false, error: error.message, details: error.details ?? null };
}
console.log(JSON.stringify(output, null, 1));
// Exit without browser.close(): the app's windows must stay as they are.
process.exit(output.ok ? 0 : 1);
