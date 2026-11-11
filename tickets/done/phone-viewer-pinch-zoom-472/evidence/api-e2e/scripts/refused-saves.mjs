// autobyteus-472 API/E2E (temporary): the node's page (the only frame the bridge answers) sends `saveFile` messages the app
// must refuse: a text type, a path in the name, a name whose extension does not match the type, a folder separator, an
// unknown type. For each: no toast (accessibility events for 4 s) and no new row in Downloads. Then a valid one, to show
// the same route saves when the message is valid.
import { evaluate, adb, sleep } from './droid.mjs'; import { spawn } from 'node:child_process';
const ADB = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;
const list = () => adb('shell', 'content', 'query', '--uri', 'content://media/external/downloads', '--projection', '_display_name').trim();
const cases = [
  { label: 'text/plain', fileName: 'notes-472.txt', mimeType: 'text/plain' },
  { label: 'path in name', fileName: '../../evil-472.pdf', mimeType: 'application/pdf' },
  { label: 'folder in name', fileName: 'sub/evil-472.pdf', mimeType: 'application/pdf' },
  { label: 'pdf type, png name', fileName: 'evil-472.png', mimeType: 'application/pdf' },
  { label: 'html', fileName: 'evil-472.html', mimeType: 'text/html' },
  { label: 'valid (control)', fileName: 'control-472.pdf', mimeType: 'application/pdf' },
];
const results = [];
for (const c of cases) {
  const before = list();
  const ev = spawn(ADB, ['-s', 'emulator-5640', 'shell', 'uiautomator', 'events']); let out = ''; ev.stdout.on('data', d => { out += d; }); await sleep(1500);
  const sent = await evaluate(`(() => { const s = window.AutoByteusShell; if (!s) return 'no bridge'; s.postMessage(JSON.stringify({ type: 'saveFile', fileName: ${JSON.stringify(c.fileName)}, mimeType: ${JSON.stringify(c.mimeType)}, base64: btoa('%PDF-1.4 REFUSED-472') })); return 'sent'; })()`);
  await sleep(4000); ev.kill(); try { adb('shell', 'pkill', '-f', 'uiautomator'); } catch {}
  const toasts = [...out.matchAll(/EventType: TYPE_NOTIFICATION_STATE_CHANGED;[^\n]*?Text: \[([^\]]*)\]/g)].map(m => m[1]);
  const after = list(); const added = after.split('\n').filter(l => !before.includes(l) && l.includes('_display_name'));
  results.push({ ...c, sent, toasts, addedToDownloads: added });
}
console.log(JSON.stringify(results, null, 1));
