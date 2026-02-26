import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeType as TeamNodeType } from '../../../src/agent-team-definition/domain/enums.js';
import {
  NodeSyncSelectionService,
} from '../../../src/sync/services/node-sync-selection-service.js';

function toSortedArray(values: Set<string>): string[] {
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

describe('NodeSyncSelectionService', () => {
  let agentDefinitionService: {
    getAllAgentDefinitions: ReturnType<typeof vi.fn>;
  };
  let agentTeamDefinitionService: {
    getAllDefinitions: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    agentDefinitionService = {
      getAllAgentDefinitions: vi.fn(async () => [
        {
          id: 'agent-1',
          name: 'Agent One',
          systemPromptCategory: 'cat-a',
          systemPromptName: 'prompt-a',
        },
        {
          id: 'agent-2',
          name: 'Agent Two',
          systemPromptCategory: 'cat-b',
          systemPromptName: 'prompt-b',
        },
        {
          id: 'agent-3',
          name: 'Agent Three',
          systemPromptCategory: null,
          systemPromptName: null,
        },
      ]),
    };
    agentTeamDefinitionService = {
      getAllDefinitions: vi.fn(async () => [
        {
          id: 'team-1',
          name: 'Team One',
          nodes: [
            {
              memberName: 'member-a',
              referenceId: 'agent-2',
              referenceType: TeamNodeType.AGENT,
            },
            {
              memberName: 'member-b',
              referenceId: 'team-2',
              referenceType: TeamNodeType.AGENT_TEAM,
            },
          ],
        },
        {
          id: 'team-2',
          name: 'Team Two',
          nodes: [
            {
              memberName: 'member-c',
              referenceId: 'agent-1',
              referenceType: TeamNodeType.AGENT,
            },
          ],
        },
      ]),
    };
  });

  const buildService = () =>
    new NodeSyncSelectionService({
      agentDefinitionService,
      agentTeamDefinitionService,
    });

  it('returns null for full sync when selection is not provided', async () => {
    const service = buildService();
    await expect(service.resolveSelection(undefined)).resolves.toBeNull();
  });

  it('rejects empty selection payloads', async () => {
    const service = buildService();
    await expect(
      service.resolveSelection({
        agentDefinitionIds: [],
        agentTeamDefinitionIds: [],
      }),
    ).rejects.toMatchObject({
      name: 'NodeSyncSelectionValidationError',
      code: 'selection-empty',
    });
  });

  it('expands nested team dependencies and prompt families', async () => {
    const service = buildService();
    const resolved = await service.resolveSelection({
      agentTeamDefinitionIds: ['team-1'],
      includeDependencies: true,
    });

    expect(resolved).not.toBeNull();
    if (!resolved) {
      return;
    }
    expect(toSortedArray(resolved.agentTeamDefinitionIds)).toEqual(['team-1', 'team-2']);
    expect(toSortedArray(resolved.agentDefinitionIds)).toEqual(['agent-1', 'agent-2']);
    expect(toSortedArray(resolved.promptFamilies)).toEqual(['cat-a::prompt-a', 'cat-b::prompt-b']);
    expect(resolved.includeDeletes).toBe(false);
  });

  it('keeps only requested entities when includeDependencies is false', async () => {
    const service = buildService();
    const resolved = await service.resolveSelection({
      agentDefinitionIds: ['agent-2'],
      includeDependencies: false,
    });

    expect(resolved).not.toBeNull();
    if (!resolved) {
      return;
    }
    expect(toSortedArray(resolved.agentDefinitionIds)).toEqual(['agent-2']);
    expect(toSortedArray(resolved.agentTeamDefinitionIds)).toEqual([]);
    expect(toSortedArray(resolved.promptFamilies)).toEqual([]);
  });

  it('fails when selected agent cannot resolve prompt dependency', async () => {
    const service = buildService();
    await expect(
      service.resolveSelection({
        agentDefinitionIds: ['agent-3'],
        includeDependencies: true,
      }),
    ).rejects.toMatchObject({
      name: 'NodeSyncSelectionValidationError',
      code: 'agent-prompt-missing',
    });
  });
});
