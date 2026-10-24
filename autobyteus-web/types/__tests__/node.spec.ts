import { describe, expect, it } from 'vitest';
import {
  EMBEDDED_ENTRY_ID,
  NODE_REGISTRY_STORAGE_KEY,
  isNodeId,
  type NodeEntry,
  type NodeRegistrySnapshot,
} from '../node';

const EMBEDDED_SERVER_BASE_URL = 'http://127.0.0.1:29695';

describe('node types contract', () => {
  it('exposes stable embedded entry and storage constants', () => {
    expect(EMBEDDED_ENTRY_ID).toBe('embedded-local');
    expect(NODE_REGISTRY_STORAGE_KEY).toBe('autobyteus.node_registry');
  });

  it('accepts a node registry snapshot of entries, each with the node ID it learned', () => {
    const entry: NodeEntry = {
      id: 'embedded-local',
      name: 'Embedded Node',
      baseUrl: EMBEDDED_SERVER_BASE_URL,
      nodeType: 'embedded',
      createdAt: '2026-02-08T00:00:00.000Z',
      updatedAt: '2026-02-08T00:00:00.000Z',
      nodeId: 'srv_m9VFq2LwAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    };

    const snapshot: NodeRegistrySnapshot = {
      version: 1,
      nodes: [entry],
    };

    expect(snapshot.version).toBe(1);
    expect(snapshot.nodes[0].nodeType).toBe('embedded');
    expect(snapshot.nodes[0].nodeId).toBe('srv_m9VFq2LwAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  });

  it('recognizes a node ID as the server writes it (srv_ + 32 or more base64url characters)', () => {
    expect(isNodeId('srv_m9VFq2LwAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(true);
    expect(isNodeId('srv_short')).toBe(false);
    expect(isNodeId('remote-1')).toBe(false);
    expect(isNodeId(undefined)).toBe(false);
  });
});
