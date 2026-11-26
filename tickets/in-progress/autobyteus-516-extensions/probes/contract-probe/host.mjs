// Probe-only mini host: what AutoByteus would do with extension-contract.md (parts 3, 4, 6, 7).
// Not production code. No dependencies beyond Node and the system `tar`.
import { createHash, verify } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SUPPORTED_CONTRACT_VERSION = 1;
const DESCRIPTION_FIELDS = ['id', 'name', 'description', 'version', 'contractVersion', 'offeredOn', 'platforms'];
export const currentPlatform = () => `${process.platform}-${process.arch}`;

const exists = async (p) => fs.access(p).then(() => true, () => false);
const compareVersions = (a, b) => {
  const pa = a.split('.').map(Number); const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

/** Tolerant reader: requires the fields it uses, checks their types, ignores the rest. */
export function readDescription(value) {
  const ok = value && typeof value.id === 'string' && /^[a-z0-9-]+$/.test(value.id)
    && typeof value.name === 'string' && typeof value.description === 'string'
    && typeof value.version === 'string' && /^\d+\.\d+\.\d+$/.test(value.version)
    && Number.isInteger(value.contractVersion)
    && (value.offeredOn === 'desktop-node' || value.offeredOn === 'every-node')
    && Array.isArray(value.platforms) && value.platforms.every((p) => typeof p === 'string');
  if (!ok) throw new Error(`invalid extension description: ${JSON.stringify(value).slice(0, 200)}`);
  return Object.fromEntries(DESCRIPTION_FIELDS.map((k) => [k, value[k]]));
}

/** Part 3: the catalog is trusted only when its exact bytes carry AutoByteus's signature. */
export async function loadCatalog(catalogPath, signaturePath, publicKey) {
  const bytes = await fs.readFile(catalogPath);
  const signature = await fs.readFile(signaturePath);
  if (!verify(null, bytes, publicKey, signature)) throw new Error('catalog signature does not verify');
  const parsed = JSON.parse(bytes.toString('utf8'));
  return parsed.extensions.map((entry) => {
    if (typeof entry.packageUrl !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256)) throw new Error(`invalid catalog entry ${entry.id}`);
    return { ...readDescription(entry), packageUrl: entry.packageUrl, sha256: entry.sha256 };
  });
}

export class ExtensionHost {
  constructor({ root, catalog, isDesktopNode, platform = currentPlatform() }) {
    Object.assign(this, { root, catalog, isDesktopNode, platform });
    this.progress = new Map();
    this.modules = new Map();
  }

  folder(id) { return path.join(this.root, id); }
  context(id) {
    const logPath = path.join(this.folder(id), 'extension.log');
    return {
      dir: path.join(this.folder(id), 'data'),
      platform: this.platform,
      log: (line) => { fs.appendFile(logPath, `${new Date().toISOString()} ${line}\n`).catch(() => {}); },
    };
  }
  /** Tolerant: keeps the entries it can read; an unreadable file means nothing is on, and is logged, never rewritten until a change. */
  async readState() {
    let raw;
    try { raw = await fs.readFile(path.join(this.root, 'state.json'), 'utf8'); } catch { return {}; }
    try {
      const parsed = JSON.parse(raw);
      return Object.fromEntries(Object.entries(parsed).filter(([, v]) => v && typeof v.enabled === 'boolean'));
    } catch (error) { console.warn(`extensions state.json unreadable: ${error.message}`); return {}; }
  }
  async writeState(state) { await fs.mkdir(this.root, { recursive: true }); await fs.writeFile(path.join(this.root, 'state.json'), `${JSON.stringify(state)}\n`); }

  /** Which catalog entries this node offers (REQ-011). */
  offered() { return this.catalog.filter((e) => e.offeredOn === 'every-node' || this.isDesktopNode); }

  /** null = not installed; throws when a package is there but cannot be read (shown as failed, never deleted). */
  async installedDescription(id) {
    const file = path.join(this.folder(id), 'package', 'extension.json');
    if (!(await exists(file))) return null;
    return readDescription(JSON.parse(await fs.readFile(file, 'utf8')));
  }

  /** Part 6: the last lines of an extension's log. */
  async readLog(id, lines = 200) {
    try { return (await fs.readFile(path.join(this.folder(id), 'extension.log'), 'utf8')).trimEnd().split('\n').slice(-lines); } catch { return []; }
  }

  async serverPart(id) {
    if (!this.modules.has(id)) {
      const url = pathToFileURL(path.join(this.folder(id), 'package', 'server', 'index.mjs'));
      url.search = `?v=${Date.now()}`; // a fresh import after an update
      this.modules.set(id, (await import(url.href)).default);
    }
    return this.modules.get(id);
  }

  /** Part 6: one state per offered extension. */
  async list() {
    const state = await this.readState();
    const out = [];
    for (const entry of this.offered()) {
      if (entry.contractVersion !== SUPPORTED_CONTRACT_VERSION || !entry.platforms.includes(this.platform)) { out.push({ id: entry.id, state: 'notAvailableHere' }); continue; }
      if (this.progress.has(entry.id)) { out.push({ id: entry.id, state: 'installing', ...this.progress.get(entry.id) }); continue; }
      let installed;
      try { installed = await this.installedDescription(entry.id); } catch (error) {
        console.warn(`extension ${entry.id}: installed package unreadable: ${error.message}`);
        out.push({ id: entry.id, state: 'failed', message: `Its installed files cannot be read: ${error.message}` }); continue;
      }
      if (!installed) { out.push({ id: entry.id, state: 'notInstalled' }); continue; }
      try {
        const s = await (await this.serverPart(entry.id)).status(this.context(entry.id));
        out.push({ id: entry.id, state: 'installed', version: installed.version, enabled: Boolean(state[entry.id]?.enabled), ready: s.ready, message: s.message, updateAvailable: compareVersions(entry.version, installed.version) > 0 });
      } catch (error) { out.push({ id: entry.id, state: 'failed', message: error.message }); }
    }
    return out;
  }

  async install(id) {
    const entry = this.offered().find((e) => e.id === id);
    if (!entry) throw new Error(`${id} is not offered on this node`);
    if (entry.contractVersion !== SUPPORTED_CONTRACT_VERSION) throw new Error(`${id} needs contract ${entry.contractVersion}; this AutoByteus supports ${SUPPORTED_CONTRACT_VERSION}`);
    if (!entry.platforms.includes(this.platform)) throw new Error(`${id} is not available on ${this.platform}`);
    const bytes = await fs.readFile(fileURLToPath(entry.packageUrl));
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (sha !== entry.sha256) throw new Error(`package checksum mismatch for ${id}`);
    const staging = `${this.folder(id)}.staging`;
    await fs.rm(staging, { recursive: true, force: true });
    await fs.mkdir(staging, { recursive: true });
    const archive = path.join(staging, 'package.tar.gz');
    await fs.writeFile(archive, bytes);
    execFileSync('tar', ['-xzf', archive, '-C', staging]);
    await fs.rm(archive);
    const description = readDescription(JSON.parse(await fs.readFile(path.join(staging, 'extension.json'), 'utf8')));
    for (const key of DESCRIPTION_FIELDS) {
      if (JSON.stringify(description[key]) !== JSON.stringify(entry[key])) throw new Error(`package ${key} differs from the catalog`);
    }
    // Replace the package, keep data/ (update keeps the extension's own files).
    if (this.modules.has(id)) { await this.modules.get(id).stop(this.context(id)); this.modules.delete(id); }
    await fs.mkdir(this.folder(id), { recursive: true });
    await fs.rm(path.join(this.folder(id), 'package'), { recursive: true, force: true });
    await fs.rename(staging, path.join(this.folder(id), 'package'));
    await fs.mkdir(this.context(id).dir, { recursive: true });
    this.progress.set(id, { message: 'Installing', percent: null });
    try {
      await (await this.serverPart(id)).install({ ...this.context(id), progress: (p) => this.progress.set(id, p) });
    } finally { this.progress.delete(id); }
    const state = await this.readState();
    state[id] = { enabled: Boolean(state[id]?.enabled) };
    await this.writeState(state);
  }

  async setEnabled(id, enabled) {
    const state = await this.readState();
    if (!state[id]) throw new Error(`${id} is not installed`);
    if (!enabled && this.modules.has(id)) await this.modules.get(id).stop(this.context(id));
    state[id] = { enabled };
    await this.writeState(state);
  }

  async callAction(id, action, input) {
    const state = await this.readState();
    if (!state[id]?.enabled) throw new Error(`${id} is turned off`);
    const part = await this.serverPart(id);
    if (!Object.hasOwn(part.actions, action) || typeof part.actions[action] !== 'function') throw new Error(`${id} has no action ${action}`);
    return part.actions[action](this.context(id), { json: input.json ?? null, bytes: input.bytes ?? null });
  }

  async remove(id) {
    if (this.modules.has(id)) { await this.modules.get(id).stop(this.context(id)); this.modules.delete(id); }
    await fs.rm(this.folder(id), { recursive: true, force: true });
    const state = await this.readState();
    delete state[id];
    await this.writeState(state);
  }

  async stopAll() { for (const [id, part] of this.modules) await part.stop(this.context(id)); }
}

export { exists, compareVersions };
