import { describe, expect, it, vi } from 'vitest';
import { NodeType as TeamNodeType } from '../../../src/agent-team-definition/domain/enums.js';
import { NodeSyncService } from '../../../src/sync/services/node-sync-service.js';

function buildService(options?: {
  mcpConfigs?: Array<Record<string, unknown>>;
}) {
  const promptService = {
    findPrompts: vi.fn(async () => [
      {
        id: 'prompt-1',
        name: 'Prompt One',
        category: 'cat-a',
        promptContent: 'Prompt A',
        description: null,
        suitableForModels: 'default',
        version: 1,
        isActive: true,
      },
      {
        id: 'prompt-2',
        name: 'Prompt Two',
        category: 'cat-b',
        promptContent: 'Prompt B',
        description: null,
        suitableForModels: 'default',
        version: 1,
        isActive: true,
      },
    ]),
    createPrompt: vi.fn(),
    markActivePrompt: vi.fn(),
    updatePrompt: vi.fn(),
  };

  const agentDefinitionService = {
    getAllAgentDefinitions: vi.fn(async () => [
      {
        id: 'agent-1',
        name: 'Agent One',
        role: 'Role One',
        description: 'Description One',
        avatarUrl: null,
        systemPromptCategory: 'cat-a',
        systemPromptName: 'Prompt One',
        toolNames: [],
        inputProcessorNames: [],
        llmResponseProcessorNames: [],
        systemPromptProcessorNames: [],
        toolExecutionResultProcessorNames: [],
        toolInvocationPreprocessorNames: [],
        lifecycleProcessorNames: [],
        skillNames: [],
      },
      {
        id: 'agent-2',
        name: 'Agent Two',
        role: 'Role Two',
        description: 'Description Two',
        avatarUrl: null,
        systemPromptCategory: 'cat-b',
        systemPromptName: 'Prompt Two',
        toolNames: [],
        inputProcessorNames: [],
        llmResponseProcessorNames: [],
        systemPromptProcessorNames: [],
        toolExecutionResultProcessorNames: [],
        toolInvocationPreprocessorNames: [],
        lifecycleProcessorNames: [],
        skillNames: [],
      },
    ]),
    createAgentDefinition: vi.fn(),
    updateAgentDefinition: vi.fn(),
  };

  const agentTeamDefinitionService = {
    getAllDefinitions: vi.fn(async () => [
      {
        id: 'team-1',
        name: 'Team One',
        description: 'Team description',
        role: null,
        avatarUrl: null,
        coordinatorMemberName: 'member-1',
        nodes: [
          {
            memberName: 'member-1',
            referenceId: 'agent-1',
            referenceType: TeamNodeType.AGENT,
          },
        ],
      },
    ]),
    createDefinition: vi.fn(),
    updateDefinition: vi.fn(),
  };

  const mcpConfigService = {
    getAllMcpServers: vi.fn(async () =>
      options?.mcpConfigs ?? [
        {
          server_id: 'mcp-1',
          transport_type: 'stdio' as const,
          enabled: true,
          tool_name_prefix: null,
          command: 'node',
          args: ['server.js'],
          env: {},
          cwd: null,
        },
      ],
    ),
    configureMcpServer: vi.fn(),
  };

  const service = new NodeSyncService({
    promptService,
    agentDefinitionService,
    agentTeamDefinitionService,
    mcpConfigService,
  });

  return { service, mcpConfigService };
}

describe('NodeSyncService exportBundle', () => {
  it('exports full scope when no selection is provided', async () => {
    const { service } = buildService();
    const bundle = await service.exportBundle({
      scope: [
        'prompt',
        'agent_definition',
        'agent_team_definition',
        'mcp_server_configuration',
      ],
    });

    expect((bundle.entities.prompt ?? []) as unknown[]).toHaveLength(2);
    expect((bundle.entities.agent_definition ?? []) as unknown[]).toHaveLength(2);
    expect((bundle.entities.agent_team_definition ?? []) as unknown[]).toHaveLength(1);
    expect((bundle.entities.mcp_server_configuration ?? []) as unknown[]).toHaveLength(1);
  });

  it('exports only selected team closure and excludes unrelated entity types', async () => {
    const { service } = buildService();
    const bundle = await service.exportBundle({
      scope: [
        'prompt',
        'agent_definition',
        'agent_team_definition',
        'mcp_server_configuration',
      ],
      selection: {
        agentTeamDefinitionIds: ['team-1'],
        includeDependencies: true,
      },
    });

    const promptEntities = (bundle.entities.prompt ?? []) as Array<{ name: string; category: string }>;
    const agentEntities = (bundle.entities.agent_definition ?? []) as Array<{ name: string }>;
    const teamEntities = (bundle.entities.agent_team_definition ?? []) as Array<{ name: string }>;

    expect(promptEntities).toEqual([
      expect.objectContaining({ name: 'Prompt One', category: 'cat-a' }),
    ]);
    expect(agentEntities).toEqual([
      expect.objectContaining({ name: 'Agent One' }),
    ]);
    expect(teamEntities).toEqual([
      expect.objectContaining({ name: 'Team One' }),
    ]);
    expect((bundle.entities.mcp_server_configuration ?? []) as unknown[]).toHaveLength(0);
  });

  it('does not export HTTP MCP token/headers in sync bundle', async () => {
    const { service } = buildService({
      mcpConfigs: [
        {
          server_id: 'mcp-http-1',
          transport_type: 'streamable_http',
          enabled: true,
          tool_name_prefix: null,
          url: 'http://localhost:8001/mcp',
          token: 'sensitive-token',
          headers: { Authorization: 'Bearer sensitive-token' },
        },
      ],
    });

    const bundle = await service.exportBundle({
      scope: ['mcp_server_configuration'],
    });

    const configs = (bundle.entities.mcp_server_configuration ?? []) as Array<Record<string, unknown>>;
    expect(configs).toHaveLength(1);
    expect(configs[0]).toEqual(
      expect.objectContaining({
        serverId: 'mcp-http-1',
        transportType: 'streamable_http',
        url: 'http://localhost:8001/mcp',
      }),
    );
    expect(configs[0]).not.toHaveProperty('token');
    expect(configs[0]).not.toHaveProperty('headers');
  });
});

describe('NodeSyncService importBundle', () => {
  it('imports HTTP MCP config from sync payload without security fields', async () => {
    const { service, mcpConfigService } = buildService({
      mcpConfigs: [
        {
          server_id: 'mcp-http-1',
          transport_type: 'streamable_http',
          enabled: true,
          tool_name_prefix: null,
          url: 'http://old-host:8001/mcp',
          token: 'keep-this-token',
          headers: { Authorization: 'Bearer keep-this-token' },
        },
      ],
    });

    const result = await service.importBundle({
      scope: ['mcp_server_configuration'],
      conflictPolicy: 'source_wins',
      tombstonePolicy: 'source_delete_wins',
      bundle: {
        watermark: '2026-02-11T20:00:00.000Z',
        entities: {
          mcp_server_configuration: [
            {
              serverId: 'mcp-http-1',
              transportType: 'streamable_http',
              enabled: false,
              toolNamePrefix: 'sync',
              url: 'http://new-host:8001/mcp',
            },
          ],
        },
        tombstones: {},
      },
    });

    expect(result.success).toBe(true);
    expect(mcpConfigService.configureMcpServer).toHaveBeenCalledTimes(1);

    const configured = mcpConfigService.configureMcpServer.mock.calls[0]?.[0] as { url?: string };

    expect(configured.url).toBe('http://new-host:8001/mcp');
  });
});
