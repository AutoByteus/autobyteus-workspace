import type {
  ConfiguredAgentExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentRunConfig, AgentRuntimeKind, SkillAccessMode } from '~/types/agent/AgentRunConfig';
import type { MemberConfigOverride, TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { memberAddressBasename, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { collectConfiguredAgents } from './teamExecutionTreeSelectors';
import { initializeRuntimeStatusState } from '~/services/runStatus/agentRuntimeStatusState';
import { hasMeaningfulMemberOverride, modelConfigsEqual } from '~/utils/teamRunConfigUtils';

const runtimeKind = (value: ConfiguredAgentExecutionDto['launch_configuration']['runtime_kind']): AgentRuntimeKind => {
  if (value === 'AUTOBYTEUS') return 'autobyteus';
  if (value === 'CLAUDE') return 'claude_agent_sdk';
  return 'codex_app_server';
};

export const configuredAgentAtAddress = (
  tree: TeamRunExecutionTreeDto,
  address: AgentTeamAddress,
): ConfiguredAgentExecutionDto | null => collectConfiguredAgents(tree)
  .find((agent) => agent.address === address) ?? null;

const agentConfig = (input: {
  source: ConfiguredAgentExecutionDto;
  workspaceMetadata: WorkspaceMetadata | null;
}): AgentRunConfig => ({
  agentDefinitionId: input.source.agent_definition_id,
  agentDefinitionName: memberAddressBasename(input.source.address),
  llmModelIdentifier: input.source.launch_configuration.llm_model_identifier,
  runtimeKind: runtimeKind(input.source.launch_configuration.runtime_kind),
  workspaceId: input.workspaceMetadata?.workspaceId ?? null,
  workspaceMetadata: input.workspaceMetadata,
  autoExecuteTools: input.source.launch_configuration.auto_execute_tools,
  skillAccessMode: input.source.launch_configuration.skill_access_mode as SkillAccessMode,
  llmConfig: input.source.launch_configuration.llm_config,
  isLocked: true,
});

type TeamConfigurationBaseline = Pick<
  TeamRunConfig,
  'runtimeKind' | 'llmModelIdentifier' | 'llmConfig' | 'autoExecuteTools'
>;

const createMemberOverrideAgainstBaseline = (
  source: ConfiguredAgentExecutionDto,
  baseline: TeamConfigurationBaseline,
): MemberConfigOverride | null => {
  const override: MemberConfigOverride = {};
  const sourceRuntimeKind = runtimeKind(source.launch_configuration.runtime_kind);

  if (sourceRuntimeKind !== baseline.runtimeKind) {
    override.runtimeKind = sourceRuntimeKind;
  }
  if (source.launch_configuration.llm_model_identifier !== baseline.llmModelIdentifier) {
    override.llmModelIdentifier = source.launch_configuration.llm_model_identifier;
  }
  if (!modelConfigsEqual(source.launch_configuration.llm_config, baseline.llmConfig)) {
    override.llmConfig = source.launch_configuration.llm_config;
  }
  if (source.launch_configuration.auto_execute_tools !== baseline.autoExecuteTools) {
    override.autoExecuteTools = source.launch_configuration.auto_execute_tools;
  }

  return hasMeaningfulMemberOverride(override) ? Object.freeze(override) : null;
};

export const createTeamAgentContext = (input: {
  tree: TeamRunExecutionTreeDto;
  agentRunId: string;
  address: AgentTeamAddress;
  workspaceMetadata: WorkspaceMetadata | null;
}): AgentContext | null => {
  const source = configuredAgentAtAddress(input.tree, input.address);
  if (!source) return null;
  const conversation = {
    id: input.agentRunId,
    messages: [],
    createdAt: input.tree.created_at,
    updatedAt: input.tree.created_at,
    agentDefinitionId: source.agent_definition_id,
    agentName: memberAddressBasename(source.address),
    llmModelIdentifier: source.launch_configuration.llm_model_identifier,
  };
  const state = new AgentRunState(input.agentRunId, conversation);
  initializeRuntimeStatusState(state, AgentStatus.Offline);
  return new AgentContext(agentConfig({ source, workspaceMetadata: input.workspaceMetadata }), state);
};

export const createTeamConfigurationView = (input: {
  tree: TeamRunExecutionTreeDto;
  workspaceMetadataByAddress: ReadonlyMap<AgentTeamAddress, WorkspaceMetadata>;
}): Readonly<TeamRunConfig> => {
  const agents = collectConfiguredAgents(input.tree);
  const coordinator = agents.find((agent) => agent.address === input.tree.root_team.coordinator_address);
  if (!coordinator) throw new Error('Root Team coordinator configuration is missing.');
  const primaryWorkspace = input.workspaceMetadataByAddress.get(coordinator.address) ?? null;
  const baseline: TeamConfigurationBaseline = {
    runtimeKind: runtimeKind(coordinator.launch_configuration.runtime_kind),
    llmModelIdentifier: coordinator.launch_configuration.llm_model_identifier,
    llmConfig: coordinator.launch_configuration.llm_config,
    autoExecuteTools: coordinator.launch_configuration.auto_execute_tools,
  };
  const memberOverrides = Object.fromEntries(agents.flatMap((agent) => {
    const override = createMemberOverrideAgainstBaseline(agent, baseline);
    return override ? [[agent.address, override]] : [];
  }));

  return Object.freeze({
    teamDefinitionId: input.tree.root_team.team_definition_id,
    teamDefinitionName: input.tree.root_team.team_definition_name,
    runtimeKind: baseline.runtimeKind,
    workspaceId: primaryWorkspace?.workspaceId ?? null,
    workspaceMetadata: primaryWorkspace,
    llmModelIdentifier: baseline.llmModelIdentifier,
    llmConfig: baseline.llmConfig,
    autoExecuteTools: baseline.autoExecuteTools,
    skillAccessMode: coordinator.launch_configuration.skill_access_mode as SkillAccessMode,
    memberOverrides: Object.freeze(memberOverrides),
    isLocked: true,
  });
};
