import { describe, expect, it } from 'vitest';
import {
  EMBEDDED_NODE_ID,
  NODE_REGISTRY_STORAGE_KEY,
  isEmbeddedNode,
  type NodeProfile,
  type NodeRegistrySnapshot,
} from '../node';

describe('node types contract', () => {
  it('exposes stable embedded node and storage constants', () => {
    expect(EMBEDDED_NODE_ID).toBe('embedded-local');
    expect(NODE_REGISTRY_STORAGE_KEY).toBe('autobyteus.node_registry.v1');
  });

  it('detects embedded node identifiers correctly', () => {
    expect(isEmbeddedNode('embedded-local')).toBe(true);
    expect(isEmbeddedNode('remote-node-1')).toBe(false);
  });

  it('accepts a versioned node registry snapshot shape', () => {
    const node: NodeProfile = {
      id: 'embedded-local',
      name: 'Embedded Node',
      baseUrl: 'http://localhost:29695',
      nodeType: 'embedded',
      isSystem: true,
      createdAt: '2026-02-08T00:00:00.000Z',
      updatedAt: '2026-02-08T00:00:00.000Z',
      capabilities: {
        terminal: true,
        fileExplorerStreaming: true,
      },
      capabilityProbeState: 'ready',
    };

    const snapshot: NodeRegistrySnapshot = {
      version: 1,
      nodes: [node],
    };

    expect(snapshot.version).toBe(1);
    expect(snapshot.nodes[0].nodeType).toBe('embedded');
    expect(snapshot.nodes[0].capabilityProbeState).toBe('ready');
  });
});

