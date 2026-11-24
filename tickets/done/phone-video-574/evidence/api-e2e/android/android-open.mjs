// Temporary API/E2E measurement (autobyteus-574 AC-001, Android): one open of a video from the page, timed on the device
// clock. A screen recording runs from 2 s before the tap; the player's "Displayed" log line (ActivityManager, device clock)
// anchors the recording: its first mostly-black frame (the player appearing) is that moment. The first frame whose video
// area is bright (the test video's colour bars) is the first video frame. Usage: node android-open.mjs <label> <step…>
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
const [label, ...step] = process.argv.slice(2);
const S = 'emulator-5580';
const adb = (...args) => execFileSync('adb', ['-s', S, ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const out = `/tmp/api574/opens/${label}`;
fs.mkdirSync(out, { recursive: true });
adb('logcat', '-c');
const recorder = spawn('adb', ['-s', S, 'shell', 'screenrecord', '--bit-rate', '8000000', '--time-limit', '24', '/sdcard/open.mp4']);
await sleep(2500);
const stepOut = execFileSync('node', ['/tmp/api574/scripts/android-step.mjs', ...step], { encoding: 'utf8' });
const tap = JSON.parse(stepOut.trim().split('\n').pop()).at ?? Date.now();
await sleep(19_000);
await new Promise((resolve) => { recorder.on('close', resolve); setTimeout(resolve, 8_000); });
execFileSync('adb', ['-s', S, 'pull', '/sdcard/open.mp4', `${out}/open.mp4`], { stdio: 'ignore' });
const logcat = adb('logcat', '-d', '-v', 'epoch');
fs.writeFileSync(`${out}/logcat.txt`, logcat);
const displayedLine = logcat.split('\n').find((line) => /Displayed org\.autobyteus\.mobile\/\.video\.VideoPlayerActivity/.test(line));
const displayedAt = displayedLine ? Math.round(Number(displayedLine.trim().split(/\s+/)[0]) * 1000) : null;
const startLine = logcat.split('\n').find((line) => /START u0 .*VideoPlayerActivity/.test(line));
const startAt = startLine ? Math.round(Number(startLine.trim().split(/\s+/)[0]) * 1000) : null;
const frames = (vf) => execFileSync('ffmpeg', ['-v', 'fatal', '-i', `${out}/open.mp4`, '-vf', `${vf},signalstats,metadata=print:file=-`, '-fps_mode', 'passthrough', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 << 20 })
  .split('\n').reduce((list, line) => {
    const pts = /pts_time:([\d.]+)/.exec(line); if (pts) list.push({ t: Number(pts[1]) });
    const y = /lavfi\.signalstats\.YAVG=([\d.]+)/.exec(line); if (y && list.length) list[list.length - 1].y = Number(y[1]);
    return list;
  }, []);
const whole = frames('scale=270:-1');
const video = frames('crop=1080:420:0:1000,scale=270:-1');
const blackAt = whole.find((frame) => frame.y < 25)?.t ?? null;
const firstVideo = video.find((frame) => blackAt !== null && frame.t > blackAt && frame.y > 60)?.t ?? null;
const firstVideoAt = displayedAt !== null && blackAt !== null && firstVideo !== null ? Math.round(displayedAt + (firstVideo - blackAt) * 1000) : null;
const result = { label, tap, tapToStart: startAt && startAt - tap, tapToDisplayed: displayedAt && displayedAt - tap, displayedToFirstVideoFrame: firstVideoAt && firstVideoAt - displayedAt,
  tapToFirstVideoFrame: firstVideoAt && firstVideoAt - tap, recording: { blackAt, firstVideo }, playerError: /The video stopped|could not be opened/.test(logcat) };
fs.writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result));
