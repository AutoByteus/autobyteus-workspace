// autobyteus-472 API/E2E (temporary): taps Download in the phone viewer (a real tap), catches the app's toast (screenshots
// and uiautomator dumps for 6 s), then reads Downloads through MediaStore and compares the saved bytes with the node's
// file (sha256). Usage: node download.mjs <file name> <label>
import { tap, adb, sleep, evaluate } from './droid.mjs'; import fs from 'node:fs'; import { execFileSync } from 'node:child_process'; import { createHash } from 'node:crypto';
const [name, label] = process.argv.slice(2); const s = JSON.parse(fs.readFileSync('/tmp/abtest472/state.json', 'utf8'));
const expected = Object.values(s.facts).find(f => f.name === name);
const ADB = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;
const shot = n => fs.writeFileSync(`/tmp/abtest472/${label}-${n}.png`, execFileSync(ADB, ['-s', 'emulator-5640', 'exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 }));
const listDownloads = () => adb('shell', 'content', 'query', '--uri', 'content://media/external/downloads', '--projection', '_display_name:_size:relative_path:is_pending').trim();
const before = listDownloads();
// Toast text: `uiautomator events` prints the accessibility event a toast raises (TYPE_NOTIFICATION_STATE_CHANGED, Text).
const { spawn } = await import('node:child_process');
const ev = spawn(ADB, ['-s', 'emulator-5640', 'shell', 'uiautomator', 'events']); let evOut = ''; ev.stdout.on('data', d => { evOut += d; });
await sleep(1500);
const t0 = Date.now(); await tap('[data-testid="mobile-file-download"]');
for (const at of [400, 1200]) { await sleep(at - (Date.now() - t0) > 0 ? at - (Date.now() - t0) : 0); shot(`after-${at}ms`); }
let toast = null;
for (let i = 0; i < 60 && !toast; i++) { const m = /EventType: TYPE_NOTIFICATION_STATE_CHANGED;[^\n]*?Text: \[([^\]]*)\]/.exec(evOut); if (m) toast = { text: m[1], seenWithin: Date.now() - t0 }; else await sleep(250); }
ev.kill(); try { adb('shell', 'pkill', '-f', 'uiautomator'); } catch {}
let after = listDownloads(); for (let i = 0; i < 120 && !after.includes(`_display_name=${name}`) && !(toast && /Couldn/.test(toast.text)); i++) { await sleep(500); after = listDownloads(); }
const row = after.split('\n').find(l => l.includes(`_display_name=${name}`)) ?? null;
let saved = null;
if (row) { adb('shell', 'cp', `/sdcard/Download/${name}`, `/data/local/tmp/${name}`); execFileSync(ADB, ['-s', 'emulator-5640', 'pull', `/data/local/tmp/${name}`, `/tmp/abtest472/pulled-${name}`], { stdio: 'ignore' });
  const b = fs.readFileSync(`/tmp/abtest472/pulled-${name}`); saved = { bytes: b.length, sha256: createHash('sha256').update(b).digest('hex') }; adb('shell', 'rm', `/data/local/tmp/${name}`); }
const page = await evaluate(`({ viewer: !!document.querySelector('[data-testid="mobile-file-viewer"]'), title: document.querySelector('[data-testid="mobile-file-viewer"] [data-testid="mobile-screen-title"]')?.textContent?.trim() })`);
console.log(JSON.stringify({ file: name, toast, downloadsBefore: before, downloadsRow: row, saved, expected: expected && { bytes: expected.bytes, sha256: expected.sha256 },
  sameBytes: !!saved && !!expected && saved.sha256 === expected.sha256, toastMsAfterTap: toast?.seenWithin ?? null, page }, null, 1));
