// Probe-only: closes the Voice Input spine gaps of use-case-spines.md (V2 fresh install with real downloads,
// V3 the one-time move of today's install, V11 reading the log, V12 a broken extension does not break others).
// Usage: node run-usecase-probe.mjs <scratch>  (scratch prepared by run-usecase-probe.sh). Writes only inside <scratch>.
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ExtensionHost, loadCatalog } from './host.mjs';
import { moveOldVoiceInstall } from './move-old-voice-install.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const scratch = process.argv[2];
const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`); };
const en = await fs.readFile(path.join(scratch, 'en.wav'));

// Signed catalog with two extensions
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const pack = async (folder) => {
  const description = JSON.parse(await fs.readFile(path.join(here, folder, 'extension.json'), 'utf8'));
  const archive = path.join(scratch, `${description.id}.tar.gz`);
  execFileSync('tar', ['-czf', archive, '-C', path.join(here, folder), 'extension.json', 'server', 'ui']);
  return { ...description, packageUrl: pathToFileURL(archive).href, sha256: createHash('sha256').update(await fs.readFile(archive)).digest('hex') };
};
const bytes = Buffer.from(JSON.stringify({ extensions: [await pack('voice-input-extension'), await pack('hello-extension')] }));
await fs.writeFile(path.join(scratch, 'catalog.json'), bytes);
await fs.writeFile(path.join(scratch, 'catalog.json.sig'), sign(null, bytes, privateKey));
const catalog = await loadCatalog(path.join(scratch, 'catalog.json'), path.join(scratch, 'catalog.json.sig'), publicKey);

// --- V3: the one-time move of today's install (a copy-on-write clone of the founder's ~/.autobyteus/extensions) ---
const home = path.join(scratch, 'home-extensions');
const moved = await moveOldVoiceInstall(home);
check('V3 move: today\'s install recognised and moved by rename', moved.moved && moved.enabled === true && moved.language === 'en' && typeof moved.microphone === 'string', JSON.stringify({ ...moved, microphone: moved.microphone ? `${moved.microphone.slice(0, 8)}…` : null }));
const visible = async (dir) => (await fs.readdir(dir)).filter((n) => !n.startsWith('.')).sort().join(','); // Finder's .DS_Store files are left as they are
const layout = `${await visible(path.join(home, 'voice-input'))} | ${await visible(home)}`;
check('V3 move: new layout (data/ with runtime and models, state.json, no old registry)', layout === 'data | state.json,voice-input', layout);
const desktop = new ExtensionHost({ root: home, catalog, isDesktopNode: true });
let t = Date.now();
await desktop.install('voice-input');
let voice = (await desktop.list()).find((e) => e.id === 'voice-input');
check('V3 first start: package fetched, runtime adopted, still On with English, nothing big downloaded', voice.state === 'installed' && voice.enabled && voice.ready && /en/.test(voice.message), `${Date.now() - t} ms; ${JSON.stringify(voice)}`);
t = Date.now();
const r1 = await desktop.callAction('voice-input', 'transcribe', { bytes: en });
check('V3 dictation works after the move', /meeting/i.test(r1.text), `${Date.now() - t} ms: "${r1.text}"`);

// --- V11: reading the log ---
const log = await desktop.readLog('voice-input', 50);
check('V11 the card can read the extension\'s last log lines', log.some((l) => /adopted existing runtime/.test(l)) && log.some((l) => /worker started/.test(l)), `${log.length} lines`);

// --- V12: a broken extension does not break the node or other extensions ---
await desktop.install('hello');
await desktop.setEnabled('hello', true);
await desktop.stopAll();
const broken = path.join(home, 'voice-input', 'package', 'extension.json');
await fs.writeFile(broken, '{ this is not json');
const fresh = new ExtensionHost({ root: home, catalog, isDesktopNode: true });
const listed = await fresh.list();
const v = listed.find((e) => e.id === 'voice-input'); const h = listed.find((e) => e.id === 'hello');
check('V12 the broken extension shows Failed with a message', v.state === 'failed' && /cannot be read/.test(v.message), JSON.stringify(v));
check('V12 the other extension keeps working', h.state === 'installed' && h.ready && (await fresh.callAction('hello', 'hello', {})).hello === 'world', JSON.stringify(h));
check('V12 nothing is deleted or rewritten', (await fs.readFile(broken, 'utf8')) === '{ this is not json' && (await fs.access(path.join(home, 'voice-input', 'data', 'models')).then(() => true, () => false)));
await fs.writeFile(path.join(home, 'state.json'), 'garbage');
const afterGarbage = await new ExtensionHost({ root: home, catalog, isDesktopNode: true }).list();
check('V12 an unreadable state file: the list still works (everything shown Off)', afterGarbage.length === 2 && afterGarbage.every((e) => e.state === 'failed' || e.enabled === false), JSON.stringify(afterGarbage.map((e) => `${e.id}:${e.state}:${e.enabled}`)));

// --- V2: a fresh install with the real downloads (runtime from GitHub, model from Hugging Face) ---
if (process.env.SKIP_FRESH !== '1') {
  const freshRoot = path.join(scratch, 'fresh-node');
  const host = new ExtensionHost({ root: freshRoot, catalog, isDesktopNode: true });
  const phases = new Set();
  const poll = setInterval(async () => { const e = (await host.list()).find((x) => x.id === 'voice-input'); if (e.state === 'installing') phases.add(`${e.message}${e.percent != null ? ` ${e.percent}%` : ''}`.replace(/\d+%/, 'n%')); }, 500);
  t = Date.now();
  try { await host.install('voice-input'); } finally { clearInterval(poll); }
  const installMs = Date.now() - t;
  voice = (await host.list()).find((e) => e.id === 'voice-input');
  check('V2 fresh install: real runtime and model downloaded, installed Off and ready', voice.state === 'installed' && !voice.enabled && voice.ready, `${Math.round(installMs / 1000)} s; phases seen: ${[...phases].join(' / ')}`);
  await host.setEnabled('voice-input', true);
  await host.callAction('voice-input', 'setLanguage', { json: { language: 'en' } });
  t = Date.now();
  const r2 = await host.callAction('voice-input', 'transcribe', { bytes: en });
  check('V2 dictation works on the fresh install', /meeting/i.test(r2.text), `${Date.now() - t} ms first call: "${r2.text}"`);
  const size = execFileSync('du', ['-sh', path.join(freshRoot, 'voice-input')], { encoding: 'utf8' }).split('\t')[0];
  check('V2 size on disk', true, size);
  await host.stopAll();
}
await desktop.stopAll(); await fresh.stopAll();
await fs.writeFile(path.join(scratch, 'usecase-results.json'), `${JSON.stringify(results, null, 2)}\n`);
const failed = results.filter((x) => !x.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
