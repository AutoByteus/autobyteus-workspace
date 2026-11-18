import type { ReleasedNodeRecord, ReleasedNodeRegistrySnapshot } from '../frozen/released-node-registry';
import type { ReleasedMobileSession } from '../frozen/released-mobile-session';

/** Records exactly as the released writers wrote them (`origin/personal` c78ffb15a2). */
export const SRV_BETA = 'srv_m9VFq2LwAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export const releasedEmbedded: ReleasedNodeRecord = {
  id: 'embedded-local',
  name: 'Embedded Node',
  baseUrl: 'http://127.0.0.1:29695',
  nodeType: 'embedded',
  isSystem: true,
  createdAt: '2026-02-08T00:00:00.000Z',
  updatedAt: '2026-02-08T00:00:00.000Z',
  serverInstanceId: 'srv_ownEmbeddedAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

/** A remote entry whose node ID was learned. */
export const releasedRemoteIdentified: ReleasedNodeRecord = {
  id: 'remote-6b0e',
  name: 'Beta',
  baseUrl: 'http://beta.tailnet:29695',
  nodeType: 'remote',
  isSystem: false,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-02T00:00:00.000Z',
  serverInstanceId: SRV_BETA,
};

/** A remote entry not reached yet: no `serverInstanceId`. */
export const releasedRemoteUnidentified: ReleasedNodeRecord = {
  id: 'remote-1700000000000',
  name: 'Docker',
  baseUrl: 'http://localhost:39695',
  nodeType: 'remote',
  isSystem: false,
  createdAt: '2026-03-03T00:00:00.000Z',
  updatedAt: '2026-03-03T00:00:00.000Z',
};

export const releasedSnapshot = (nodes: ReleasedNodeRecord[], version = 7): ReleasedNodeRegistrySnapshot => ({ version, nodes });

export const releasedSnapshotText = (nodes: ReleasedNodeRecord[], version = 7): string =>
  JSON.stringify(releasedSnapshot(nodes, version), null, 2);

export const releasedMobileSession: ReleasedMobileSession = {
  version: 1,
  nodeId: 'mobile-paired-node',
  serverBaseUrl: 'https://desktop.tailnet.ts.net',
  credential: 'cred_abc',
  device: { deviceId: 'dev_1', deviceName: 'Phone', pairedAt: '2026-04-01T00:00:00.000Z' },
  pairedAt: '2026-04-01T00:00:00.000Z',
};
