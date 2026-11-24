// Temporary API/E2E check (autobyteus-574 AC-001 seek, Android): with the player playing an uncached video in portrait,
// show the controls, tap the time bar's middle (its place read from a portrait screenshot: y 2136, x 22…1058), and capture
// the screen 1, 2 and 3 s after the tap; the video's own timecode shows the position.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const S = 'emulator-5580';
const adb = (...args) => execFileSync('adb', ['-s', S, ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const out = process.argv[2] ?? '/tmp/api574/opens/seek';
fs.mkdirSync(out, { recursive: true });
// The controls may be shown or hidden: a first tap on the bar shows them (or already seeks); the second one seeks.
adb('shell', 'input', 'tap', '540', '2136');
await sleep(1500);
fs.writeFileSync(`${out}/before.png`, execFileSync('adb', ['-s', S, 'exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 }));
const tapAt = Number(adb('shell', 'date', '+%s%3N').trim());
adb('shell', 'input', 'tap', '540', '2136');
const shots = [];
for (const after of [1000, 2000, 3000]) {
  const now = Number(adb('shell', 'date', '+%s%3N').trim());
  if (tapAt + after > now) await sleep(tapAt + after - now);
  const at = Number(adb('shell', 'date', '+%s%3N').trim());
  fs.writeFileSync(`${out}/after-${after}.png`, execFileSync('adb', ['-s', S, 'exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 }));
  shots.push({ after, capturedAt: at - tapAt });
}
console.log(JSON.stringify({ tapAt, shots }));
