import { describe, expect, it } from 'vitest';
import { convertNodeRegistryText } from '../migrations/node-registry-entry-names/node-registry-entry-names';
import { convertMobileSessionText } from '../migrations/mobile-session-entry-names/mobile-session-entry-names';
import {
  SRV_BETA,
  releasedEmbedded,
  releasedMobileSession,
  releasedRemoteIdentified,
  releasedRemoteUnidentified,
  releasedSnapshotText,
} from './releasedFixtures';

const converted = (text: string): any => {
  const result = convertNodeRegistryText(text);
  if (!result.ok) throw new Error(result.reason);
  return JSON.parse(result.text);
};

describe('SM-6 / SM-7 node list conversion (autobyteus-290)', () => {
  it('renames serverInstanceId to nodeId and drops isSystem, keeping id and every other value', () => {
    const result = converted(releasedSnapshotText([releasedEmbedded, releasedRemoteIdentified, releasedRemoteUnidentified]));
    expect(result.version).toBe(7);
    expect(result.nodes).toEqual([
      { id: 'embedded-local', name: 'Embedded Node', baseUrl: 'http://127.0.0.1:29695', nodeType: 'embedded',
        createdAt: '2026-02-08T00:00:00.000Z', updatedAt: '2026-02-08T00:00:00.000Z',
        nodeId: 'srv_ownEmbeddedAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { id: 'remote-6b0e', name: 'Beta', baseUrl: 'http://beta.tailnet:29695', nodeType: 'remote',
        createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-02T00:00:00.000Z', nodeId: SRV_BETA },
      { id: 'remote-1700000000000', name: 'Docker', baseUrl: 'http://localhost:39695', nodeType: 'remote',
        createdAt: '2026-03-03T00:00:00.000Z', updatedAt: '2026-03-03T00:00:00.000Z' },
    ]);
  });

  it('converts an empty list and a single entry', () => {
    expect(converted(releasedSnapshotText([], 0))).toEqual({ version: 0, nodes: [] });
    expect(converted(releasedSnapshotText([releasedRemoteUnidentified])).nodes[0]).not.toHaveProperty('isSystem');
  });

  it('copies a record the current reader would drop, and fields it does not know (N-907)', () => {
    const text = JSON.stringify({ version: 2, nodes: [
      { id: 'old', name: 'Old', baseUrl: 'http://x', nodeType: 'remote', registrationSource: 'discovered', isSystem: false, serverInstanceId: 'not-an-id' },
      'not a record',
    ] });
    expect(converted(text).nodes).toEqual([
      { id: 'old', name: 'Old', baseUrl: 'http://x', nodeType: 'remote', registrationSource: 'discovered', nodeId: 'not-an-id' },
      'not a record',
    ]);
  });

  it('copies a snapshot without a nodes list unchanged; fails only on text that is not JSON', () => {
    expect(converted('{"version":1}')).toEqual({ version: 1 });
    expect(convertNodeRegistryText('{not json')).toMatchObject({ ok: false, reason: expect.stringContaining('not readable JSON') });
  });

  it('is idempotent on its own output (a re-run changes nothing)', () => {
    const once = convertNodeRegistryText(releasedSnapshotText([releasedEmbedded, releasedRemoteIdentified]));
    if (!once.ok) throw new Error(once.reason);
    expect(convertNodeRegistryText(once.text)).toEqual(once);
  });
});

describe('SM-8 mobile session conversion (autobyteus-290)', () => {
  it('renames nodeId to entryId and drops the schema version, keeping every other value', () => {
    const result = convertMobileSessionText(JSON.stringify(releasedMobileSession));
    if (!result.ok) throw new Error(result.reason);
    expect(JSON.parse(result.text)).toEqual({
      entryId: 'mobile-paired-node',
      serverBaseUrl: 'https://desktop.tailnet.ts.net',
      credential: 'cred_abc',
      device: { deviceId: 'dev_1', deviceName: 'Phone', pairedAt: '2026-04-01T00:00:00.000Z' },
      pairedAt: '2026-04-01T00:00:00.000Z',
    });
  });

  it('fails only on text that is not JSON', () => {
    expect(convertMobileSessionText('nope')).toMatchObject({ ok: false });
    expect(convertMobileSessionText('null')).toEqual({ ok: true, text: 'null' });
  });
});
