// Probe-only: REQ-012 / contract §4 optional start step. Does warming the model at start remove the ~30 s first wait,
// and how much memory does the warm worker hold? Scratch prepared like run-probe.sh (clone of the founder's runtime + model).
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ExtensionHost, loadCatalog } from './host.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const scratch = process.argv[2];
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const archive = path.join(scratch, 'voice.tar.gz');
execFileSync('tar', ['-czf', archive, '-C', path.join(here, 'voice-input-extension'), 'extension.json', 'server', 'ui']);
const d = JSON.parse(await fs.readFile(path.join(here, 'voice-input-extension', 'extension.json'), 'utf8'));
const bytes = Buffer.from(JSON.stringify({ extensions: [{ ...d, packageUrl: pathToFileURL(archive).href, sha256: createHash('sha256').update(await fs.readFile(archive)).digest('hex') }] }));
await fs.writeFile(path.join(scratch, 'c.json'), bytes); await fs.writeFile(path.join(scratch, 'c.json.sig'), sign(null, bytes, privateKey));
const host = new ExtensionHost({ root: path.join(scratch, 'node'), catalog: await loadCatalog(path.join(scratch, 'c.json'), path.join(scratch, 'c.json.sig'), publicKey), isDesktopNode: true });
await host.install('voice-input'); await host.setEnabled('voice-input', true);
await host.callAction('voice-input', 'setLanguage', { json: { language: 'en' } });
const part = await host.serverPart('voice-input');
let t = Date.now(); await part.start(host.context('voice-input')); const warmMs = Date.now() - t;
const pids = execFileSync('pgrep', ['-f', path.join(scratch, 'node')], { encoding: 'utf8' }).trim().split('\n');
const rssKb = pids.map((p) => Number(execFileSync('ps', ['-o', 'rss=', '-p', p], { encoding: 'utf8' }).trim() || 0)).reduce((a, b) => a + b, 0);
const en = await fs.readFile(path.join(scratch, 'en.wav'));
t = Date.now(); const r = await host.callAction('voice-input', 'transcribe', { bytes: en }); const firstMs = Date.now() - t;
console.log(JSON.stringify({ warmUpMs: warmMs, firstDictationAfterWarmUpMs: firstMs, text: r.text, workerMemoryMB: Math.round(rssKb / 1024) }));
await host.stopAll();
