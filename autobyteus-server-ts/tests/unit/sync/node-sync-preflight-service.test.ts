import { describe, expect, it, vi } from 'vitest';
import {
  NodeSyncPreflightService,
  NodeSyncPreflightValidationError,
} from '../../../src/sync/services/node-sync-preflight-service.js';

function buildRemoteClient() {
  return {
    normalizeBaseUrl: vi.fn((value: string) => {
      const parsed = new URL(value.startsWith('http') ? value : `http://${value}`);
      return `${parsed.protocol}//${parsed.host}`;
    }),
    checkHealth: vi.fn(async () => undefined),
  };
}

describe('NodeSyncPreflightService', () => {
  it('rejects empty targets', async () => {
    const remoteClient = buildRemoteClient();
    const service = new NodeSyncPreflightService(remoteClient);

    await expect(
      service.validate({
        source: { nodeId: 'source', baseUrl: 'http://localhost:8000' },
        targets: [],
        scope: ['prompt'],
        conflictPolicy: 'source_wins',
        tombstonePolicy: 'source_delete_wins',
      }),
    ).rejects.toMatchObject({
      name: 'NodeSyncPreflightValidationError',
      failureClass: 'configuration',
      retryable: false,
    } satisfies Partial<NodeSyncPreflightValidationError>);
  });

  it('rejects source-target overlap by normalized URL', async () => {
    const remoteClient = buildRemoteClient();
    const service = new NodeSyncPreflightService(remoteClient);

    await expect(
      service.validate({
        source: { nodeId: 'source-a', baseUrl: 'http://localhost:8000/' },
        targets: [{ nodeId: 'target-b', baseUrl: 'localhost:8000' }],
        scope: ['prompt'],
        conflictPolicy: 'source_wins',
        tombstonePolicy: 'source_delete_wins',
      }),
    ).rejects.toMatchObject({
      name: 'NodeSyncPreflightValidationError',
      failureClass: 'configuration',
      retryable: false,
    } satisfies Partial<NodeSyncPreflightValidationError>);
  });

  it('rejects duplicate targets by normalized URL', async () => {
    const remoteClient = buildRemoteClient();
    const service = new NodeSyncPreflightService(remoteClient);

    await expect(
      service.validate({
        source: { nodeId: 'source-a', baseUrl: 'http://localhost:8000' },
        targets: [
          { nodeId: 'target-a', baseUrl: 'http://localhost:8001/' },
          { nodeId: 'target-b', baseUrl: 'localhost:8001' },
        ],
        scope: ['prompt'],
        conflictPolicy: 'source_wins',
        tombstonePolicy: 'source_delete_wins',
      }),
    ).rejects.toMatchObject({
      name: 'NodeSyncPreflightValidationError',
      failureClass: 'configuration',
      retryable: false,
    } satisfies Partial<NodeSyncPreflightValidationError>);
  });

  it('classifies health failures as retryable', async () => {
    const remoteClient = buildRemoteClient();
    remoteClient.checkHealth.mockRejectedValueOnce(new Error('connection refused'));
    const service = new NodeSyncPreflightService(remoteClient);

    await expect(
      service.validate({
        source: { nodeId: 'source-a', baseUrl: 'http://localhost:8000' },
        targets: [{ nodeId: 'target-a', baseUrl: 'http://localhost:8001' }],
        scope: ['prompt'],
        conflictPolicy: 'source_wins',
        tombstonePolicy: 'source_delete_wins',
      }),
    ).rejects.toMatchObject({
      name: 'NodeSyncPreflightValidationError',
      failureClass: 'health',
      retryable: true,
    } satisfies Partial<NodeSyncPreflightValidationError>);
  });

  it('returns normalized validated plan and checks source + targets health', async () => {
    const remoteClient = buildRemoteClient();
    const service = new NodeSyncPreflightService(remoteClient);

    const plan = await service.validate({
      source: { nodeId: 'source-a', baseUrl: 'localhost:8000/' },
      targets: [{ nodeId: 'target-a', baseUrl: 'http://localhost:8001/' }],
      scope: ['prompt', 'agent_definition'],
      conflictPolicy: 'source_wins',
      tombstonePolicy: 'source_delete_wins',
      selection: {
        agentDefinitionIds: ['agent-1'],
      },
    });

    expect(plan.source).toEqual({ nodeId: 'source-a', baseUrl: 'http://localhost:8000' });
    expect(plan.targets).toEqual([{ nodeId: 'target-a', baseUrl: 'http://localhost:8001' }]);
    expect(remoteClient.checkHealth).toHaveBeenCalledTimes(2);
  });
});
