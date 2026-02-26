import { describe, expect, it, vi } from 'vitest';
import {
  NodeSyncCoordinatorService,
  NodeSyncPreflightValidationError,
} from '../../../src/sync/services/node-sync-coordinator-service.js';

function buildInput() {
  return {
    source: { nodeId: 'source-a', baseUrl: 'http://localhost:8000' },
    targets: [
      { nodeId: 'target-a', baseUrl: 'http://localhost:8001' },
      { nodeId: 'target-b', baseUrl: 'http://localhost:8002' },
    ],
    scope: ['prompt'] as const,
    conflictPolicy: 'source_wins' as const,
    tombstonePolicy: 'source_delete_wins' as const,
  };
}

describe('NodeSyncCoordinatorService', () => {
  it('returns partial-success when one target import fails', async () => {
    const preflightService = {
      validate: vi.fn(async () => buildInput()),
    };
    const remoteClient = {
      exportBundle: vi.fn(async () => ({ watermark: 'wm1', entities: { prompt: [] }, tombstones: {} })),
      importBundle: vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          appliedWatermark: 'wm1',
          summary: { processed: 1, created: 1, updated: 0, deleted: 0, skipped: 0 },
          failures: [],
        })
        .mockRejectedValueOnce(new Error('target offline')),
    };

    const service = new NodeSyncCoordinatorService({
      preflightService,
      remoteClient,
    });

    const result = await service.run(buildInput());

    expect(result.status).toBe('partial-success');
    expect(result.sourceNodeId).toBe('source-a');
    expect(result.targetResults).toHaveLength(2);
    expect(result.targetResults[0]).toMatchObject({
      targetNodeId: 'target-a',
      status: 'success',
      summary: { processed: 1, created: 1, updated: 0, deleted: 0, skipped: 0 },
    });
    expect(result.targetResults[1]).toMatchObject({
      targetNodeId: 'target-b',
      status: 'failed',
      message: 'target offline',
    });
    expect(result.error).toBe('One or more target imports failed.');
    expect(result.report).toMatchObject({
      sourceNodeId: 'source-a',
      scope: ['prompt'],
      exportByEntity: [
        {
          entityType: 'prompt',
          exportedCount: 0,
          sampledKeys: [],
          sampleTruncated: false,
        },
      ],
      targets: [
        {
          targetNodeId: 'target-a',
          status: 'success',
          failureCountTotal: 0,
          failureSamples: [],
          failureSampleTruncated: false,
        },
        {
          targetNodeId: 'target-b',
          status: 'failed',
          message: 'target offline',
          failureCountTotal: 0,
          failureSamples: [],
          failureSampleTruncated: false,
        },
      ],
    });
  });

  it('returns failed when source export fails', async () => {
    const preflightService = {
      validate: vi.fn(async () => buildInput()),
    };
    const remoteClient = {
      exportBundle: vi.fn(async () => {
        throw new Error('selection invalid');
      }),
      importBundle: vi.fn(),
    };

    const service = new NodeSyncCoordinatorService({
      preflightService,
      remoteClient,
    });

    const result = await service.run(buildInput());

    expect(result.status).toBe('failed');
    expect(result.targetResults).toEqual([]);
    expect(result.error).toContain('Source export failed');
    expect(result.report).toBeNull();
    expect(remoteClient.importBundle).not.toHaveBeenCalled();
  });

  it('marks failed import responses (success=false) as target failures', async () => {
    const preflightService = {
      validate: vi.fn(async () => ({
        ...buildInput(),
        targets: [{ nodeId: 'target-a', baseUrl: 'http://localhost:8001' }],
      })),
    };
    const remoteClient = {
      exportBundle: vi.fn(async () => ({ watermark: 'wm1', entities: { prompt: [] }, tombstones: {} })),
      importBundle: vi.fn(async () => ({
        success: false,
        appliedWatermark: 'wm1',
        summary: { processed: 1, created: 0, updated: 0, deleted: 0, skipped: 1 },
        failures: [
          {
            entityType: 'prompt',
            key: 'prompt-1',
            message: 'conflict',
          },
        ],
      })),
    };

    const service = new NodeSyncCoordinatorService({ preflightService, remoteClient });

    const result = await service.run(buildInput());

    expect(result.status).toBe('failed');
    expect(result.targetResults).toEqual([
      expect.objectContaining({
        targetNodeId: 'target-a',
        status: 'failed',
        message: 'Import failed with 1 issue(s). First: [prompt] prompt-1: conflict',
      }),
    ]);
    expect(result.error).toBe('All target imports failed.');
    expect(result.report?.targets[0]).toEqual(
      expect.objectContaining({
        targetNodeId: 'target-a',
        failureCountTotal: 1,
        failureSamples: [
          {
            entityType: 'prompt',
            key: 'prompt-1',
            message: 'conflict',
          },
        ],
        failureSampleTruncated: false,
      }),
    );
  });

  it('builds bounded failed-target messages instead of concatenating all failures', async () => {
    const preflightService = {
      validate: vi.fn(async () => ({
        ...buildInput(),
        targets: [{ nodeId: 'target-a', baseUrl: 'http://localhost:8001' }],
      })),
    };
    const remoteClient = {
      exportBundle: vi.fn(async () => ({ watermark: 'wm1', entities: { prompt: [] }, tombstones: {} })),
      importBundle: vi.fn(async () => ({
        success: false,
        appliedWatermark: 'wm1',
        summary: { processed: 2, created: 0, updated: 0, deleted: 0, skipped: 2 },
        failures: [
          {
            entityType: 'prompt',
            key: 'prompt-1',
            message: 'first-error',
          },
          {
            entityType: 'prompt',
            key: 'prompt-2',
            message: 'second-error',
          },
        ],
      })),
    };

    const service = new NodeSyncCoordinatorService({ preflightService, remoteClient });
    const result = await service.run(buildInput());

    expect(result.targetResults[0]?.message).toBe(
      'Import failed with 2 issue(s). First: [prompt] prompt-1: first-error',
    );
  });

  it('bubbles preflight validation errors for resolver mapping', async () => {
    const preflightError = new NodeSyncPreflightValidationError(
      'bad topology',
      'configuration',
      false,
    );

    const service = new NodeSyncCoordinatorService({
      preflightService: {
        validate: vi.fn(async () => {
          throw preflightError;
        }),
      },
      remoteClient: {
        exportBundle: vi.fn(),
        importBundle: vi.fn(),
      },
    });

    await expect(service.run(buildInput())).rejects.toBe(preflightError);
  });
});
