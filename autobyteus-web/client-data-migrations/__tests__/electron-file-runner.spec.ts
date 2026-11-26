import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runElectronFileMigrations } from '../electron-file-runner';
import { loadNodeRegistrySnapshot, saveNodeRegistrySnapshot } from '../../electron/nodeRegistryStore';
import {
  SRV_BETA,
  releasedEmbedded,
  releasedRemoteIdentified,
  releasedRemoteUnidentified,
  releasedSnapshotText,
} from './releasedFixtures';

vi.mock('../../electron/logger', () => {
  const logger = { child: vi.fn(() => logger), info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger };
});

const OLD = 'node-registry.v1.json';
const NEW = 'node-registry.json';
const BAK = 'node-registry.v1.json.bak';
const dirs: string[] = [];
const userData = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-client-migrations-'));
  dirs.push(dir);
  return dir;
};
const log = () => ({ info: vi.fn(), warn: vi.fn() });
const files = (dir: string): string[] => fs.readdirSync(dir).sort();
const read = (dir: string, name: string): any => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const released = releasedSnapshotText([releasedEmbedded, releasedRemoteIdentified, releasedRemoteUnidentified]);

afterEach(() => dirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

describe('runElectronFileMigrations, SM-6 (autobyteus-290)', () => {
  it('converts the released node list to node-registry.json, keeps a backup, and the current reader loads it', () => {
    const dir = userData();
    fs.writeFileSync(path.join(dir, OLD), released);
    const sink = log();

    runElectronFileMigrations(dir, dir, sink);

    expect(files(dir)).toEqual([NEW, BAK].sort());
    expect(fs.readFileSync(path.join(dir, BAK), 'utf8')).toBe(released);
    expect(read(dir, NEW).nodes[1]).toEqual({ id: 'remote-6b0e', name: 'Beta', baseUrl: 'http://beta.tailnet:29695',
      nodeType: 'remote', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-02T00:00:00.000Z', nodeId: SRV_BETA });
    expect(sink.warn).not.toHaveBeenCalled();

    const snapshot = loadNodeRegistrySnapshot(dir, 'http://127.0.0.1:29695');
    expect(snapshot.version).toBe(7);
    expect(snapshot.nodes.map((entry) => [entry.id, entry.nodeId ?? null])).toEqual([
      ['embedded-local', 'srv_ownEmbeddedAAAAAAAAAAAAAAAAAAAAAAAAAA'],
      ['remote-6b0e', SRV_BETA],
      ['remote-1700000000000', null],
    ]);
    expect(snapshot.nodes.some((entry) => 'isSystem' in entry)).toBe(false);
  });

  it('a re-run changes nothing; the backup is removed at the next start that finds only the new file', () => {
    const dir = userData();
    fs.writeFileSync(path.join(dir, OLD), released);
    runElectronFileMigrations(dir, dir, log());
    const converted = fs.readFileSync(path.join(dir, NEW), 'utf8');

    runElectronFileMigrations(dir, dir, log());

    expect(files(dir)).toEqual([NEW]);
    expect(fs.readFileSync(path.join(dir, NEW), 'utf8')).toBe(converted);
  });

  it('finishes a step interrupted after the new file was written: both files with the backup', () => {
    const dir = userData();
    fs.writeFileSync(path.join(dir, OLD), released);
    fs.writeFileSync(path.join(dir, BAK), released);
    fs.writeFileSync(path.join(dir, NEW), '{"version":7,"nodes":[]}');

    runElectronFileMigrations(dir, dir, log());

    expect(files(dir)).toEqual([NEW, BAK].sort());
    expect(read(dir, NEW)).toEqual({ version: 7, nodes: [] });
  });

  it('a file that is not JSON is kept unchanged, nothing is written, and the warning names it', () => {
    const dir = userData();
    fs.writeFileSync(path.join(dir, OLD), '{broken');
    const sink = log();

    runElectronFileMigrations(dir, dir, sink);

    expect(files(dir)).toEqual([OLD]);
    expect(sink.warn).toHaveBeenCalledWith(expect.stringContaining(path.join(dir, OLD)));
  });

  it('after a failed conversion, the app starts with the embedded entry only and the old file stays for recovery', () => {
    const dir = userData();
    fs.writeFileSync(path.join(dir, OLD), '{broken');
    runElectronFileMigrations(dir, dir, log());
    const snapshot = loadNodeRegistrySnapshot(dir, 'http://127.0.0.1:29695');
    saveNodeRegistrySnapshot(dir, snapshot);
    expect(snapshot.nodes.map((entry) => entry.id)).toEqual(['embedded-local']);

    const sink = log();
    runElectronFileMigrations(dir, dir, sink);

    expect(files(dir)).toEqual([NEW, OLD].sort());
    expect(fs.readFileSync(path.join(dir, OLD), 'utf8')).toBe('{broken');
    expect(sink.warn).toHaveBeenCalledWith(expect.stringContaining('for recovery'));
  });

  it('a fresh install has nothing to convert', () => {
    const dir = userData();
    runElectronFileMigrations(dir, dir, log());
    expect(files(dir)).toEqual([]);
  });
});

/**
 * AC-008 (DEC-016): the old desktop Voice Input install, synthesized in each released registry shape with small
 * stand-in files (never real user data), is deleted once in the background; the user data folder is untouched.
 */
describe('runElectronFileMigrations, the old desktop Voice Input install (autobyteus-516)', () => {
  const record = { id: 'voice-input', status: 'installed', message: 'Voice Input is ready.', installedAt: '2026-08-01T10:00:00.000Z',
    runtimeVersion: '0.3.0', modelVersion: 'mlx-community/whisper-small-mlx', runtimeEntrypoint: '/x/runtime/bin/voice-input-worker',
    modelPath: '/x/models/whisper-small-mlx', lastError: null };
  const RELEASED_REGISTRIES: Record<string, unknown> = {
    'v1 (v1.2.25)': { version: 1, extensions: { 'voice-input': record } },
    'v2 (v1.2.28)': { version: 2, extensions: { 'voice-input': { ...record, enabled: true, settings: { languageMode: 'en' } } } },
    'v2 with a microphone (v1.2.29)': { version: 2, extensions: { 'voice-input': { ...record, enabled: true, settings: { languageMode: 'en', audioInputDeviceId: 'mic-usb' } } } },
  };
  const oldInstall = (base: string, registry: unknown): string => {
    const folder = path.join(base, 'extensions');
    fs.mkdirSync(path.join(folder, 'voice-input', 'runtime', 'bin'), { recursive: true });
    fs.mkdirSync(path.join(folder, 'voice-input', 'models', 'whisper-small-mlx'), { recursive: true });
    fs.writeFileSync(path.join(folder, 'registry.json'), JSON.stringify(registry));
    fs.writeFileSync(path.join(folder, 'voice-input', 'installation.json'), '{}');
    fs.writeFileSync(path.join(folder, 'voice-input', 'runtime', 'bin', 'voice-input-worker'), '#!/bin/sh\n');
    fs.writeFileSync(path.join(folder, 'voice-input', 'models', 'whisper-small-mlx', 'weights.npz'), 'stand-in');
    fs.writeFileSync(path.join(folder, '.DS_Store'), 'finder');
    return folder;
  };

  for (const [shape, registry] of Object.entries(RELEASED_REGISTRIES)) {
    it(`deletes <base data folder>/extensions with a ${shape} registry once; a second start does nothing more`, async () => {
      const dir = userData();
      const base = userData();
      fs.mkdirSync(path.join(base, 'server-data', 'extensions', 'voice-input', 'package'), { recursive: true });
      const folder = oldInstall(base, registry);
      const sink = log();

      runElectronFileMigrations(dir, base, sink);

      await vi.waitFor(() => expect(fs.existsSync(folder)).toBe(false));
      expect(sink.info).toHaveBeenCalledWith(expect.stringContaining('Removed the old desktop Voice Input install'));
      expect(fs.existsSync(path.join(base, 'server-data', 'extensions', 'voice-input', 'package'))).toBe(true);
      const again = log();
      runElectronFileMigrations(dir, base, again);
      expect(again.info).not.toHaveBeenCalled();
      expect(again.warn).not.toHaveBeenCalled();
    });
  }

  it('logs a deletion that fails and tries again at the next start, without blocking the start', async () => {
    const dir = userData();
    const base = userData();
    const folder = oldInstall(base, RELEASED_REGISTRIES['v2 (v1.2.28)']);
    const rm = vi.spyOn(fs.promises, 'rm').mockRejectedValueOnce(Object.assign(new Error('EBUSY: resource busy'), { code: 'EBUSY' }));
    const sink = log();

    runElectronFileMigrations(dir, base, sink);

    await vi.waitFor(() => expect(sink.warn).toHaveBeenCalledWith(expect.stringContaining('tried again at the next start')));
    expect(fs.existsSync(folder)).toBe(true);
    rm.mockRestore();
    runElectronFileMigrations(dir, base, log());
    await vi.waitFor(() => expect(fs.existsSync(folder)).toBe(false));
  });
});

