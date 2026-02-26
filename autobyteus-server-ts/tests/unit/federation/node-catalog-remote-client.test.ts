import { describe, expect, it, vi } from 'vitest';
import { NodeCatalogRemoteClient } from '../../../src/federation/catalog/node-catalog-remote-client.js';

describe('NodeCatalogRemoteClient', () => {
  it('maps remote GraphQL catalog payload to federated node scope', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          agentDefinitions: [
            {
              id: '1',
              name: 'Remote Agent',
              role: 'worker',
              description: 'Handles remote tasks',
              avatarUrl: '/images/remote-agent.png',
              toolNames: ['tool.remote.1', 'tool.remote.2'],
              skillNames: ['skill.remote.1'],
            },
          ],
          agentTeamDefinitions: [
            {
              id: 'team-1',
              name: 'Remote Team',
              description: 'Distributed team',
              role: 'orchestrator',
              avatarUrl: '/images/remote-team.png',
              coordinatorMemberName: 'leader',
              nodes: [
                { referenceType: 'AGENT' },
                { referenceType: 'AGENT_TEAM' },
              ],
            },
          ],
        },
      }),
    });

    const client = new NodeCatalogRemoteClient({ fetchFn: fetchFn as any });
    const result = await client.fetchNodeCatalog({
      nodeId: 'remote-node-1',
      nodeName: 'Remote Node',
      baseUrl: 'http://localhost:8100',
      nodeType: 'remote',
    });

    expect(result.status).toBe('ready');
    expect(result.agents[0]?.definitionId).toBe('1');
    expect(result.agents[0]?.avatarUrl).toBe('http://localhost:8100/images/remote-agent.png');
    expect(result.agents[0]?.toolNames).toEqual(['tool.remote.1', 'tool.remote.2']);
    expect(result.agents[0]?.skillNames).toEqual(['skill.remote.1']);
    expect(result.teams[0]?.definitionId).toBe('team-1');
    expect(result.teams[0]?.memberCount).toBe(2);
    expect(result.teams[0]?.nestedTeamCount).toBe(1);
    expect(result.teams[0]?.avatarUrl).toBe('http://localhost:8100/images/remote-team.png');
  });

  it('marks remote node unreachable when request throws', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));

    const client = new NodeCatalogRemoteClient({ fetchFn: fetchFn as any });
    const result = await client.fetchNodeCatalog({
      nodeId: 'remote-node-2',
      nodeName: 'Remote Node 2',
      baseUrl: 'http://localhost:8200',
      nodeType: 'remote',
    });

    expect(result.status).toBe('unreachable');
    expect(result.errorMessage).toMatch(/ECONNREFUSED/);
    expect(result.agents).toHaveLength(0);
  });

  it('defaults malformed tool/skill arrays to empty lists', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          agentDefinitions: [
            {
              id: '2',
              name: 'Remote Agent B',
              role: 'worker',
              description: 'Handles malformed data',
              avatarUrl: null,
              toolNames: null,
              skillNames: [1, 'skill.remote.valid', { name: 'invalid' }],
            },
          ],
          agentTeamDefinitions: [],
        },
      }),
    });

    const client = new NodeCatalogRemoteClient({ fetchFn: fetchFn as any });
    const result = await client.fetchNodeCatalog({
      nodeId: 'remote-node-3',
      nodeName: 'Remote Node 3',
      baseUrl: 'http://localhost:8300',
      nodeType: 'remote',
    });

    expect(result.status).toBe('ready');
    expect(result.agents[0]?.toolNames).toEqual([]);
    expect(result.agents[0]?.skillNames).toEqual(['skill.remote.valid']);
  });
});
