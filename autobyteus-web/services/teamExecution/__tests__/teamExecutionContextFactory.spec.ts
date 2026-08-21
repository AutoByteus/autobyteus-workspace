import { describe, expect, it } from 'vitest';
import type {
  AgentLaunchConfigurationDto,
  ConfiguredAgentExecutionDto,
  ConfiguredTeamExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';
import { buildEditableTeamRunSeed } from '~/composables/useDefinitionLaunchDefaults';
import { createTeamConfigurationView } from '~/services/teamExecution/teamExecutionContextFactory';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import { buildTeamRunMemberConfigRecords } from '~/utils/teamRunMemberConfigBuilder';

const launchConfiguration = (
  overrides: Partial<AgentLaunchConfigurationDto> = {},
): AgentLaunchConfigurationDto => ({
  runtime_kind: 'CODEX',
  llm_model_identifier: 'old-model',
  llm_config: {
    reasoning: {
      effort: 'low',
      flags: { plan: true, search: false },
    },
  },
  auto_execute_tools: false,
  skill_access_mode: 'PRELOADED_ONLY',
  workspace_root_path: '/workspace/team',
  ...overrides,
});

const configuredAgent = (input: {
  address: string;
  definitionId: string;
  launch?: AgentLaunchConfigurationDto;
}): ConfiguredAgentExecutionDto => ({
  kind: 'configured_agent',
  address: input.address,
  agent_definition_id: input.definitionId,
  role: null,
  description: null,
  agent_run_id: `${input.definitionId}-run`,
  platform_agent_run_id: null,
  launch_configuration: input.launch ?? launchConfiguration(),
});

const configuredTeam = (
  address: string,
  coordinatorAddress: string,
  members: ConfiguredTeamExecutionDto['members'],
): ConfiguredTeamExecutionDto => ({
  kind: 'configured_team',
  address,
  team_definition_id: `${address}-definition`,
  role: null,
  description: null,
  team_run_id: `${address}-run`,
  coordinator_address: coordinatorAddress,
  members,
  task_executions: [],
});

const executionTree = (input: {
  coordinator: ConfiguredAgentExecutionDto;
  otherMembers: TeamRunExecutionTreeDto['root_team']['members'];
}): TeamRunExecutionTreeDto => ({
  schema_version: 1,
  created_at: '2026-08-21T12:00:00.000Z',
  archived_at: null,
  application_binding: null,
  handoffs: [],
  root_team: {
    team_definition_id: 'software-team-definition',
    team_definition_name: 'Software Team',
    team_run_id: 'source-team-run',
    coordinator_address: input.coordinator.address,
    members: [input.coordinator, ...input.otherMembers],
    task_executions: [],
  },
});

const editableConfig = (
  source: Readonly<TeamRunConfig>,
  edits: Partial<TeamRunConfig>,
): TeamRunConfig => Object.assign(buildEditableTeamRunSeed(source), edits);

const leafDefinitions = (agents: ConfiguredAgentExecutionDto[]) => agents.map((agent) => ({
  displayName: agent.address.split('/').at(-1) ?? agent.address,
  address: agent.address,
  agentDefinitionId: `current:${agent.agent_definition_id}`,
}));

describe('createTeamConfigurationView', () => {
  it('projects a uniform schema-v1 execution as pure inheritance so edited globals reach every payload record', () => {
    const coordinator = configuredAgent({ address: '/coordinator', definitionId: 'coordinator-old' });
    const reviewer = configuredAgent({ address: '/reviewer', definitionId: 'reviewer-old' });
    const tree = executionTree({ coordinator, otherMembers: [reviewer] });
    const sourceSnapshot = structuredClone(tree);

    const projected = createTeamConfigurationView({
      tree,
      workspaceMetadataByAddress: new Map(),
    });

    expect(projected.memberOverrides).toEqual({});
    expect(Object.isFrozen(projected)).toBe(true);
    expect(Object.isFrozen(projected.memberOverrides)).toBe(true);

    const edited = editableConfig(projected, {
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'new-model',
      llmConfig: { thinking: { budget: 8192, mode: 'enabled' } },
      autoExecuteTools: true,
    });
    const records = buildTeamRunMemberConfigRecords({
      config: edited,
      leafMembers: leafDefinitions([coordinator, reviewer]),
    });

    expect(records).toEqual([
      expect.objectContaining({
        memberAddress: '/coordinator',
        agentDefinitionId: 'current:coordinator-old',
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'new-model',
        llmConfig: { thinking: { budget: 8192, mode: 'enabled' } },
        autoExecuteTools: true,
      }),
      expect.objectContaining({
        memberAddress: '/reviewer',
        agentDefinitionId: 'current:reviewer-old',
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'new-model',
        llmConfig: { thinking: { budget: 8192, mode: 'enabled' } },
        autoExecuteTools: true,
      }),
    ]);
    expect(tree).toEqual(sourceSnapshot);
  });

  it('retains only genuine field deltas and no-edit materialization recreates effective settings', () => {
    const coordinator = configuredAgent({ address: '/coordinator', definitionId: 'coordinator-old' });
    const matchingMember = configuredAgent({
      address: '/implementation_engineer',
      definitionId: 'implementation-old',
      launch: launchConfiguration({
        llm_config: {
          reasoning: {
            flags: { search: false, plan: true },
            effort: 'low',
          },
        },
      }),
    });
    const runtimeOnlyMember = configuredAgent({
      address: '/reviewers/code_reviewer',
      definitionId: 'reviewer-old',
      launch: launchConfiguration({ runtime_kind: 'CLAUDE' }),
    });
    const modelOnlyMember = configuredAgent({
      address: '/reviewers/architecture_reviewer',
      definitionId: 'architecture-old',
      launch: launchConfiguration({ llm_model_identifier: 'member-model' }),
    });
    const nestedTeam = configuredTeam(
      '/reviewers',
      runtimeOnlyMember.address,
      [runtimeOnlyMember, modelOnlyMember],
    );
    const tree = executionTree({ coordinator, otherMembers: [matchingMember, nestedTeam] });

    const projected = createTeamConfigurationView({
      tree,
      workspaceMetadataByAddress: new Map(),
    });

    expect(projected.memberOverrides).toEqual({
      '/reviewers/code_reviewer': { runtimeKind: 'claude_agent_sdk' },
      '/reviewers/architecture_reviewer': { llmModelIdentifier: 'member-model' },
    });
    expect(Object.isFrozen(projected.memberOverrides['/reviewers/code_reviewer'])).toBe(true);

    const sourceAgents = [coordinator, matchingMember, runtimeOnlyMember, modelOnlyMember];
    const noEditRecords = buildTeamRunMemberConfigRecords({
      config: buildEditableTeamRunSeed(projected),
      leafMembers: leafDefinitions(sourceAgents),
    });
    expect(noEditRecords.map((record) => ({
      memberAddress: record.memberAddress,
      runtimeKind: record.runtimeKind,
      llmModelIdentifier: record.llmModelIdentifier,
      llmConfig: record.llmConfig,
      autoExecuteTools: record.autoExecuteTools,
    }))).toEqual([
      {
        memberAddress: '/coordinator',
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'old-model',
        llmConfig: launchConfiguration().llm_config,
        autoExecuteTools: false,
      },
      {
        memberAddress: '/implementation_engineer',
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'old-model',
        llmConfig: launchConfiguration().llm_config,
        autoExecuteTools: false,
      },
      {
        memberAddress: '/reviewers/code_reviewer',
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'old-model',
        llmConfig: launchConfiguration().llm_config,
        autoExecuteTools: false,
      },
      {
        memberAddress: '/reviewers/architecture_reviewer',
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'member-model',
        llmConfig: launchConfiguration().llm_config,
        autoExecuteTools: false,
      },
    ]);

    const edited = editableConfig(projected, {
      llmModelIdentifier: 'new-model',
      llmConfig: { reasoning: { effort: 'xhigh' } },
      autoExecuteTools: true,
    });
    expect(buildTeamRunMemberConfigRecords({
      config: edited,
      leafMembers: leafDefinitions(sourceAgents),
    })).toEqual(sourceAgents.map((agent) => expect.objectContaining({
      memberAddress: agent.address,
      runtimeKind: agent.address === runtimeOnlyMember.address
        ? 'claude_agent_sdk'
        : 'codex_app_server',
      llmModelIdentifier: agent.address === modelOnlyMember.address
        ? 'member-model'
        : 'new-model',
      llmConfig: { reasoning: { effort: 'xhigh' } },
      autoExecuteTools: true,
    })));
  });

  it('keeps explicit null config and false auto-approval deltas when the coordinator baseline differs', () => {
    const coordinator = configuredAgent({
      address: '/coordinator',
      definitionId: 'coordinator-old',
      launch: launchConfiguration({ auto_execute_tools: true }),
    });
    const reviewer = configuredAgent({
      address: '/reviewer',
      definitionId: 'reviewer-old',
      launch: launchConfiguration({ llm_config: null, auto_execute_tools: false }),
    });
    const projected = createTeamConfigurationView({
      tree: executionTree({ coordinator, otherMembers: [reviewer] }),
      workspaceMetadataByAddress: new Map(),
    });

    expect(projected.memberOverrides).toEqual({
      '/reviewer': { llmConfig: null, autoExecuteTools: false },
    });
  });
});
