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

    runElectronFileMigrations(dir, sink);

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
    runElectronFileMigrations(dir, log());
    const converted = fs.readFileSync(path.join(dir, NEW), 'utf8');

    runElectronFileMigrations(dir, log());

    expect(files(dir)).toEqual([NEW]);
    expect(fs.readFileSync(path.join(dir, NEW), 'utf8')).toBe(converted);
  });

  it('finishes a step interrupted after the new file was written: both files with the backup', () => {
    const dir = userData();
    fs.writeFileSync(path.join(dir, OLD), released);
    fs.writeFileSync(path.join(dir, BAK), released);
    fs.writeFileSync(path.join(dir, NEW), '{"version":7,"nodes":[]}');

    runElectronFileMigrations(dir, log());

    expect(files(dir)).toEqual([NEW, BAK].sort());
    expect(read(dir, NEW)).toEqual({ version: 7, nodes: [] });
  });

  it('a file that is not JSON is kept unchanged, nothing is written, and the warning names it', () => {
    const dir = userData();
    fs.writeFileSync(path.join(dir, OLD), '{broken');
    const sink = log();

    runElectronFileMigrations(dir, sink);

    expect(files(dir)).toEqual([OLD]);
    expect(sink.warn).toHaveBeenCalledWith(expect.stringContaining(path.join(dir, OLD)));
  });

  it('after a failed conversion, the app starts with the embedded entry only and the old file stays for recovery', () => {
    const dir = userData();
    fs.writeFileSync(path.join(dir, OLD), '{broken');
    runElectronFileMigrations(dir, log());
    const snapshot = loadNodeRegistrySnapshot(dir, 'http://127.0.0.1:29695');
    saveNodeRegistrySnapshot(dir, snapshot);
    expect(snapshot.nodes.map((entry) => entry.id)).toEqual(['embedded-local']);

    const sink = log();
    runElectronFileMigrations(dir, sink);

    expect(files(dir)).toEqual([NEW, OLD].sort());
    expect(fs.readFileSync(path.join(dir, OLD), 'utf8')).toBe('{broken');
    expect(sink.warn).toHaveBeenCalledWith(expect.stringContaining('for recovery'));
  });

  it('a fresh install has nothing to convert', () => {
    const dir = userData();
    runElectronFileMigrations(dir, log());
    expect(files(dir)).toEqual([]);
  });
});
