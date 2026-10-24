import { describe, expect, it, vi } from 'vitest';
import { runBrowserStorageMigrations } from '../browser-storage-runner';
import { releasedEmbedded, releasedMobileSession, releasedRemoteIdentified, releasedSnapshotText, SRV_BETA } from './releasedFixtures';

const memoryStorage = (initial: Record<string, string> = {}): Storage => {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  };
};
const keys = (storage: Storage): string[] => Array.from({ length: storage.length }, (_, index) => storage.key(index)!).sort();
const log = () => ({ info: vi.fn(), warn: vi.fn() });

const OLD_LIST = 'autobyteus.node_registry.v1';
const NEW_LIST = 'autobyteus.node_registry';
const OLD_SESSION = 'autobyteus.remote_access.mobile_session.v1';
const NEW_SESSION = 'autobyteus.remote_access.mobile_session';

describe('runBrowserStorageMigrations, SM-7 and SM-8 (autobyteus-290)', () => {
  it('converts the browser-mode node list and the phone session to their unversioned keys, with backups', () => {
    const list = releasedSnapshotText([releasedEmbedded, releasedRemoteIdentified]);
    const session = JSON.stringify(releasedMobileSession);
    const storage = memoryStorage({ [OLD_LIST]: list, [OLD_SESSION]: session, unrelated: 'x' });

    runBrowserStorageMigrations(storage, log());

    expect(keys(storage)).toEqual([NEW_LIST, `${OLD_LIST}:backup`, NEW_SESSION, `${OLD_SESSION}:backup`, 'unrelated'].sort());
    expect(storage.getItem(`${OLD_LIST}:backup`)).toBe(list);
    const nodes = JSON.parse(storage.getItem(NEW_LIST)!).nodes;
    expect(nodes[1]).toMatchObject({ id: 'remote-6b0e', nodeId: SRV_BETA });
    expect(nodes[1]).not.toHaveProperty('isSystem');
    const stored = JSON.parse(storage.getItem(NEW_SESSION)!);
    expect(stored).toMatchObject({ entryId: 'mobile-paired-node', credential: 'cred_abc' });
    expect(stored).not.toHaveProperty('version');
  });

  it('a re-run (another tab or the next load) changes nothing and then removes the backups', () => {
    const storage = memoryStorage({ [OLD_SESSION]: JSON.stringify(releasedMobileSession) });
    runBrowserStorageMigrations(storage, log());
    const converted = storage.getItem(NEW_SESSION);

    runBrowserStorageMigrations(storage, log());

    expect(keys(storage)).toEqual([NEW_SESSION]);
    expect(storage.getItem(NEW_SESSION)).toBe(converted);
  });

  it('a value that is not JSON is kept; a later new key does not remove it', () => {
    const storage = memoryStorage({ [OLD_LIST]: '{broken' });
    const sink = log();
    runBrowserStorageMigrations(storage, sink);
    expect(keys(storage)).toEqual([OLD_LIST]);
    expect(sink.warn).toHaveBeenCalledWith(expect.stringContaining(OLD_LIST));

    storage.setItem(NEW_LIST, '{"version":1,"nodes":[]}');
    runBrowserStorageMigrations(storage, log());
    expect(storage.getItem(OLD_LIST)).toBe('{broken');
  });

  it('never throws when storage refuses a write; the original is kept', () => {
    const storage = memoryStorage({ [OLD_SESSION]: JSON.stringify(releasedMobileSession) });
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    const sink = log();
    expect(() => runBrowserStorageMigrations(storage, sink)).not.toThrow();
    expect(storage.getItem(OLD_SESSION)).not.toBeNull();
    expect(sink.warn).toHaveBeenCalledWith(expect.stringContaining('QuotaExceededError'));
  });
});
