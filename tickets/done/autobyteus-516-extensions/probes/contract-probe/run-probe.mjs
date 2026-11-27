// Probe-only runner for extension-contract.md. Usage: node run-probe.mjs <scratch-dir>
// The scratch dir must already hold an APFS clone of the voice runtime and model at
// <scratch>/node/voice-input/data/{runtime,models} (see run-probe.sh). Nothing outside <scratch> is written.
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ExtensionHost, loadCatalog, currentPlatform, exists } from './host.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const scratch = process.argv[2];
if (!scratch) throw new Error('scratch dir required');
const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`); };
const refuses = async (name, fn, expected) => {
  try { await fn(); check(name, false, 'was not refused'); } catch (e) { check(name, e.message.includes(expected), e.message); }
};

// --- Build: package, catalog, signature (AutoByteus's side of a release) ---
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const releases = path.join(scratch, 'releases');
await fs.mkdir(releases, { recursive: true });
async function buildPackage(version) {
  const src = path.join(scratch, `src-${version}`);
  await fs.rm(src, { recursive: true, force: true });
  await fs.cp(path.join(here, 'voice-input-extension'), src, { recursive: true });
  const description = JSON.parse(await fs.readFile(path.join(src, 'extension.json'), 'utf8'));
  description.version = version;
  await fs.writeFile(path.join(src, 'extension.json'), `${JSON.stringify(description, null, 2)}\n`);
  const archive = path.join(releases, `voice-input-${version}.tar.gz`);
  execFileSync('tar', ['-czf', archive, '-C', src, 'extension.json', 'server', 'ui']);
  const bytes = await fs.readFile(archive);
  return { ...description, packageUrl: pathToFileURL(archive).href, sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length };
}
async function publishCatalog(name, entries, { tamper = false } = {}) {
  const catalogPath = path.join(releases, `${name}.json`);
  const bytes = Buffer.from(`${JSON.stringify({ extensions: entries.map(({ size, ...e }) => e) }, null, 2)}\n`);
  await fs.writeFile(catalogPath, bytes);
  await fs.writeFile(`${catalogPath}.sig`, sign(null, bytes, privateKey));
  if (tamper) await fs.writeFile(catalogPath, bytes.toString().replace('Voice Input', 'Voice Inpu7'));
  return { catalogPath, signaturePath: `${catalogPath}.sig` };
}

const v100 = await buildPackage('1.0.0');
check('package is small', v100.size < 50_000, `${v100.size} bytes`);
const good = await publishCatalog('catalog', [v100]);
const catalog = await loadCatalog(good.catalogPath, good.signaturePath, publicKey);
check('signed catalog verifies and reads', catalog.length === 1 && catalog[0].id === 'voice-input');

// --- Refusals ---
const tampered = await publishCatalog('tampered', [v100], { tamper: true });
await refuses('tampered catalog refused', () => loadCatalog(tampered.catalogPath, tampered.signaturePath, publicKey), 'signature');
const otherKey = generateKeyPairSync('ed25519');
await refuses('catalog signed by another key refused', () => loadCatalog(good.catalogPath, good.signaturePath, otherKey.publicKey), 'signature');

const refusalRoot = path.join(scratch, 'refusal-node');
const badSha = await publishCatalog('bad-sha', [{ ...v100, sha256: 'a'.repeat(64) }]);
await refuses('package with wrong checksum refused',
  async () => new ExtensionHost({ root: refusalRoot, catalog: await loadCatalog(badSha.catalogPath, badSha.signaturePath, publicKey), isDesktopNode: true }).install('voice-input'), 'checksum');
const future = await publishCatalog('future', [{ ...v100, contractVersion: 2 }]);
const futureHost = new ExtensionHost({ root: refusalRoot, catalog: await loadCatalog(future.catalogPath, future.signaturePath, publicKey), isDesktopNode: true });
check('unsupported contract shows notAvailableHere', (await futureHost.list())[0].state === 'notAvailableHere');
await refuses('unsupported contract install refused', () => futureHost.install('voice-input'), 'needs contract 2');
const otherPlatform = new ExtensionHost({ root: refusalRoot, catalog, isDesktopNode: true, platform: 'linux-arm64' });
check('unsupported platform shows notAvailableHere', (await otherPlatform.list())[0].state === 'notAvailableHere');
await refuses('unsupported platform install refused', () => otherPlatform.install('voice-input'), 'not available on linux-arm64');
const dockerNode = new ExtensionHost({ root: refusalRoot, catalog, isDesktopNode: false });
check('desktop-node extension not listed on another node', (await dockerNode.list()).length === 0);
const lying = await publishCatalog('lying', [{ ...v100, name: 'Different Name' }]);
await refuses('package whose extension.json differs from the catalog refused',
  async () => new ExtensionHost({ root: refusalRoot, catalog: await loadCatalog(lying.catalogPath, lying.signaturePath, publicKey), isDesktopNode: true }).install('voice-input'), 'differs from the catalog');

// --- Install by adopting the existing runtime and model (no download) ---
const nodeRoot = path.join(scratch, 'node');
const host = new ExtensionHost({ root: nodeRoot, catalog, isDesktopNode: true });
check('before install: notInstalled', (await host.list())[0].state === 'notInstalled');
const t0 = Date.now();
await host.install('voice-input');
check('install adopts existing runtime without downloading', (Date.now() - t0) < 5_000, `${Date.now() - t0} ms`);
let listed = (await host.list())[0];
check('after install: installed, off, ready', listed.state === 'installed' && listed.enabled === false && listed.ready, JSON.stringify(listed));
await refuses('action refused while turned off', () => host.callAction('voice-input', 'getLanguage', {}), 'turned off');
await host.setEnabled('voice-input', true);
await refuses('unknown action refused', () => host.callAction('voice-input', 'readVault', {}), 'has no action');
await refuses('inherited property is not an action', () => host.callAction('voice-input', 'constructor', {}), 'has no action');

// --- Real transcription through the transcribe action (the microphone button's path) ---
const en = await fs.readFile(path.join(scratch, 'en.wav'));
await host.callAction('voice-input', 'setLanguage', { json: { language: 'en' } });
let t = Date.now();
const first = await host.callAction('voice-input', 'transcribe', { bytes: en });
const coldMs = Date.now() - t;
t = Date.now();
const second = await host.callAction('voice-input', 'transcribe', { bytes: en });
const warmMs = Date.now() - t;
check('English transcription (cold)', /meeting/i.test(first.text) && /team/i.test(first.text), `${coldMs} ms: "${first.text}"`);
check('English transcription (warm)', /meeting/i.test(second.text), `${warmMs} ms`);
if (await exists(path.join(scratch, 'zh.wav'))) {
  await host.callAction('voice-input', 'setLanguage', { json: { language: 'zh' } });
  t = Date.now();
  const zh = await host.callAction('voice-input', 'transcribe', { bytes: await fs.readFile(path.join(scratch, 'zh.wav')) });
  check('Chinese transcription', /[一-鿿]/.test(zh.text), `${Date.now() - t} ms: "${zh.text}" (${zh.detectedLanguage})`);
  await host.callAction('voice-input', 'setLanguage', { json: { language: 'en' } });
}
const silence = Buffer.alloc(44 + 32000 * 2);
silence.write('RIFF', 0); silence.writeUInt32LE(36 + 64000, 4); silence.write('WAVE', 8); silence.write('fmt ', 12);
silence.writeUInt32LE(16, 16); silence.writeUInt16LE(1, 20); silence.writeUInt16LE(1, 22); silence.writeUInt32LE(16000, 24);
silence.writeUInt32LE(32000, 28); silence.writeUInt16LE(2, 32); silence.writeUInt16LE(16, 34); silence.write('data', 36); silence.writeUInt32LE(64000, 40);
const quiet = await host.callAction('voice-input', 'transcribe', { bytes: silence });
check('silence reports no speech', quiet.noSpeech === true || quiet.text.trim() === '', JSON.stringify(quiet));

// --- Turn off stops the worker ---
const workerPids = () => { try { return execFileSync('pgrep', ['-f', path.join(nodeRoot, 'voice-input', 'data')]).toString().trim().split('\n').filter(Boolean); } catch { return []; } };
check('worker runs while on', workerPids().length > 0, `pids ${workerPids().join(',')}`);
await host.setEnabled('voice-input', false);
check('turning off stops the worker', workerPids().length === 0);

// --- Update keeps data and settings ---
await host.setEnabled('voice-input', true);
const v101 = await buildPackage('1.0.1');
const newer = await publishCatalog('catalog-1.0.1', [v101]);
host.catalog = await loadCatalog(newer.catalogPath, newer.signaturePath, publicKey);
check('newer catalog version shows Update', (await host.list())[0].updateAvailable === true);
await host.install('voice-input');
listed = (await host.list())[0];
check('after update: 1.0.1, still on, ready', listed.version === '1.0.1' && listed.enabled && listed.ready, JSON.stringify(listed));
check('update kept the language setting', (await host.callAction('voice-input', 'getLanguage', {})).language === 'en');
const after = await host.callAction('voice-input', 'transcribe', { bytes: en });
check('transcription works after update', /meeting/i.test(after.text));

// --- State file holds only what AutoByteus owns ---
const stateText = await fs.readFile(path.join(nodeRoot, 'state.json'), 'utf8');
check('state.json is only { id: { enabled } }', stateText.trim() === '{"voice-input":{"enabled":true}}', stateText.trim());
const log = await fs.readFile(path.join(nodeRoot, 'voice-input', 'extension.log'), 'utf8');
check('extension log written', /adopted existing runtime/.test(log) && /worker started/.test(log));

// --- Remove ---
await host.remove('voice-input');
check('remove deletes the folder and the state entry', !(await exists(path.join(nodeRoot, 'voice-input'))) && (await fs.readFile(path.join(nodeRoot, 'state.json'), 'utf8')).trim() === '{}');
check('no worker left after remove', workerPids().length === 0);

await fs.writeFile(path.join(scratch, 'results.json'), `${JSON.stringify({ platform: currentPlatform(), results }, null, 2)}\n`);
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
