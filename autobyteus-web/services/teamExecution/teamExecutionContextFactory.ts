import type {
  AgentLaunchConfigurationDto,
  ConfiguredAgentExecutionDto,
  ConfiguredMemberExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { AgentRunConfig, AgentRuntimeKind, SkillAccessMode } from '~/types/agent/AgentRunConfig'
import type {
  ResolvedAgentLaunchView,
  ResolvedTeamRunLaunchConfig,
  ResolvedTeamScopeView,
  StoredTeamRunMemberNode,
  TeamRunConfigurationView,
} from '~/types/agent/TeamRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { memberAddressBasename, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { collectConfiguredAgents } from './teamExecutionTreeSelectors'
import { initializeRuntimeStatusState } from '~/services/runStatus/agentRuntimeStatusState'
import { resolvedTeamRunLaunchConfigsEqual } from '~/utils/teamRunConfigUtils'

const runtimeKind = (value: AgentLaunchConfigurationDto['runtime_kind']): AgentRuntimeKind => value as AgentRuntimeKind
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  }
  return value
}
const immutableLlmConfig = (value: AgentLaunchConfigurationDto['llm_config']): Record<string, unknown> | null =>
  value ? deepFreeze(structuredClone(value) as Record<string, unknown>) : null
export const configuredAgentAtAddress = (tree: TeamRunExecutionTreeDto, address: AgentTeamAddress): ConfiguredAgentExecutionDto | null =>
  collectConfiguredAgents(tree).find((agent) => agent.address === address) ?? null

const agentConfig = (input: { source: ConfiguredAgentExecutionDto; workspaceMetadata: WorkspaceMetadata | null }): AgentRunConfig => ({
  agentDefinitionId: input.source.agent_definition_id,
  agentDefinitionName: memberAddressBasename(input.source.address),
  llmModelIdentifier: input.source.launch_configuration.llm_model_identifier,
  runtimeKind: runtimeKind(input.source.launch_configuration.runtime_kind),
  workspaceId: input.workspaceMetadata?.workspaceId ?? null,
  workspaceMetadata: input.workspaceMetadata,
  autoExecuteTools: input.source.launch_configuration.auto_execute_tools,
  skillAccessMode: input.source.launch_configuration.skill_access_mode as SkillAccessMode,
  llmConfig: immutableLlmConfig(input.source.launch_configuration.llm_config),
  isLocked: true,
})
const storedLaunchConfiguration = (
  source: AgentLaunchConfigurationDto,
  metadata: WorkspaceMetadata | null,
): Readonly<ResolvedTeamRunLaunchConfig> => deepFreeze({
  runtimeKind: runtimeKind(source.runtime_kind),
  workspaceId: metadata?.workspaceId ?? null,
  workspaceMetadata: metadata ? structuredClone(metadata) : null,
  workspaceRootPath: source.workspace_root_path,
  llmModelIdentifier: source.llm_model_identifier,
  llmConfig: immutableLlmConfig(source.llm_config),
  autoExecuteTools: source.auto_execute_tools,
  skillAccessMode: source.skill_access_mode as SkillAccessMode,
})
export const createTeamAgentContext = (input: {
  tree: TeamRunExecutionTreeDto
  agentRunId: string
  address: AgentTeamAddress
  workspaceMetadata: WorkspaceMetadata | null
}): AgentContext | null => {
  const source = configuredAgentAtAddress(input.tree, input.address)
  if (!source) return null
  const conversation = {
    id: input.agentRunId, messages: [], createdAt: input.tree.created_at, updatedAt: input.tree.created_at,
    agentDefinitionId: source.agent_definition_id,
    agentName: memberAddressBasename(source.address),
    llmModelIdentifier: source.launch_configuration.llm_model_identifier,
  }
  const state = new AgentRunState(input.agentRunId, conversation)
  initializeRuntimeStatusState(state, AgentStatus.Offline)
  return new AgentContext(agentConfig({ source, workspaceMetadata: input.workspaceMetadata }), state)
}

export const createTeamConfigurationView = (input: {
  tree: TeamRunExecutionTreeDto
  workspaceMetadataByAddress: ReadonlyMap<AgentTeamAddress, WorkspaceMetadata>
}): Readonly<TeamRunConfigurationView> => {
  const teamsByAddress: Record<AgentTeamAddress, ResolvedTeamScopeView> = {}
  const agentsByAddress: Record<AgentTeamAddress, ResolvedAgentLaunchView> = {}
  const root: ResolvedTeamScopeView = deepFreeze({
    address: '/', parentAddress: null, displayName: input.tree.root_team.team_definition_name,
    teamDefinitionId: input.tree.root_team.team_definition_id,
    depth: 0, isCustomized: false, override: null,
    effectiveConfig: storedLaunchConfiguration(
      input.tree.root_team.default_launch_configuration,
      input.workspaceMetadataByAddress.get('/') ?? null,
    ),
  })
  teamsByAddress['/'] = root
  const visit = (
    members: readonly ConfiguredMemberExecutionDto[],
    parent: ResolvedTeamScopeView,
    depth: number,
  ): readonly StoredTeamRunMemberNode[] => members.map((member): StoredTeamRunMemberNode => {
      if (member.kind === 'configured_team') {
        const effectiveConfig = storedLaunchConfiguration(
          member.default_launch_configuration,
          input.workspaceMetadataByAddress.get(member.address) ?? null,
        )
        const team: ResolvedTeamScopeView = deepFreeze({
          address: member.address,
          parentAddress: parent.address,
          displayName: memberAddressBasename(member.address),
          teamDefinitionId: member.team_definition_id,
          depth,
          isCustomized: !resolvedTeamRunLaunchConfigsEqual(effectiveConfig, parent.effectiveConfig),
          override: null,
          effectiveConfig,
        })
        teamsByAddress[member.address] = team
        return deepFreeze({
          kind: 'agent_team' as const,
          address: member.address,
          displayName: memberAddressBasename(member.address),
          teamDefinitionId: member.team_definition_id,
          coordinatorAddress: member.coordinator_address,
          children: visit(member.members, team, depth + 1),
        })
      }

      agentsByAddress[member.address] = deepFreeze({
        address: member.address, containingTeamAddress: parent.address,
        displayName: memberAddressBasename(member.address), agentDefinitionId: member.agent_definition_id,
        override: null,
        effectiveConfig: storedLaunchConfiguration(
          member.launch_configuration,
          input.workspaceMetadataByAddress.get(member.address) ?? null,
        ),
      })
      return deepFreeze({
        kind: 'agent' as const,
        address: member.address,
        displayName: memberAddressBasename(member.address),
        agentDefinitionId: member.agent_definition_id,
      })
    })
  const memberNodes = visit(input.tree.root_team.members, root, 1)
  return deepFreeze({
    source: 'STORED_SNAPSHOT' as const,
    teamDefinitionId: input.tree.root_team.team_definition_id,
    teamDefinitionName: input.tree.root_team.team_definition_name,
    coordinatorAddress: input.tree.root_team.coordinator_address,
    memberNodes,
    root,
    teamsByAddress,
    agentsByAddress,
  })
}
