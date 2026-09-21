import type { AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type {
  EditableRuntimeCatalogOperationState,
  EditableTeamFormAgentNode,
  EditableTeamFormTeamNode,
  EditableTeamScopeFormModel,
} from '~/types/agent/EditableTeamRunFormModel'
import type { TeamWorkspaceOperationState } from '~/types/agent/TeamLaunchDraft'
import type {
  AgentConfigOverride,
  ResolvedTeamRunLaunchConfig,
  TeamScopeConfigOverride,
} from '~/types/agent/TeamRunConfig'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import {
  resolvedTeamRunLaunchConfigsEqual,
  resolveOverrideLlmConfig,
  resolveOverrideLlmModelIdentifier,
  resolveOverrideRuntimeKind,
} from '~/utils/teamRunConfigUtils'
import {
  agentOrgPlacementLaunchPatchesEqual,
  canonicalizeAgentOrgPlacementLaunchPatch,
} from '~/utils/agentOrgLaunchPatch'

export type EditableAgentOrgRunFormModel = Readonly<{
  configurableAgentCount: number
  directAgents: readonly EditableTeamFormAgentNode[]
  mountedTeams: readonly EditableTeamFormTeamNode[]
}>

export type EditableAgentOrgRunFormDiagnostic = Readonly<{
  code:
    | 'INVALID_MEMBER_ADDRESS'
    | 'DUPLICATE_ADDRESS'
    | 'MISSING_TEAM_DEFINITION'
    | 'INVALID_TEAM_COORDINATOR'
    | 'STALE_TEAM_OVERRIDE'
    | 'STALE_AGENT_OVERRIDE'
    | 'NON_CANONICAL_TEAM_OVERRIDE'
    | 'NON_CANONICAL_AGENT_OVERRIDE'
  message: string
}>

export type EditableAgentOrgRunFormProjection =
  | Readonly<{ status: 'ready'; model: EditableAgentOrgRunFormModel }>
  | Readonly<{ status: 'blocked'; diagnostic: EditableAgentOrgRunFormDiagnostic }>

class ProjectionFailure extends Error {
  constructor(readonly diagnostic: EditableAgentOrgRunFormDiagnostic) {
    super(diagnostic.message)
  }
}

const fail = (
  code: EditableAgentOrgRunFormDiagnostic['code'],
  message: string,
): never => {
  throw new ProjectionFailure(Object.freeze({ code, message }))
}

const placementAddress = (memberName: string, parent: AgentTeamAddress = '/'): AgentTeamAddress => {
  if (!memberName || memberName !== memberName.trim() || memberName.includes('/') || memberName.includes('\\')
    || memberName === '.' || memberName === '..') {
    fail('INVALID_MEMBER_ADDRESS', `AgentOrg configuration has invalid member name '${memberName}' below '${parent}'.`)
  }
  return parent === '/' ? `/${memberName}` : `${parent}/${memberName}`
}

const resolveConfig = (
  inherited: Readonly<ResolvedTeamRunLaunchConfig>,
  override: Readonly<AgentConfigOverride | TeamScopeConfigOverride> | null | undefined,
): Readonly<ResolvedTeamRunLaunchConfig> => {
  const workspaceOverride = override && 'workspace' in override ? override.workspace : undefined
  const hasWorkspaceOverride = workspaceOverride !== undefined
  const workspace = workspaceOverride
    ?? { workspaceId: inherited.workspaceId, workspaceMetadata: inherited.workspaceMetadata }
  return Object.freeze({
    runtimeKind: resolveOverrideRuntimeKind(override, inherited.runtimeKind),
    workspaceId: workspace.workspaceId,
    workspaceMetadata: workspace.workspaceMetadata ? Object.freeze({ ...workspace.workspaceMetadata }) : null,
    workspaceRootPath: hasWorkspaceOverride
      ? workspace.workspaceMetadata?.workspaceRootPath?.trim() || null
      : inherited.workspaceRootPath,
    llmModelIdentifier: resolveOverrideLlmModelIdentifier(override, inherited.llmModelIdentifier),
    llmConfig: resolveOverrideLlmConfig(override, inherited.llmConfig),
    autoExecuteTools: override?.autoExecuteTools ?? inherited.autoExecuteTools,
    skillAccessMode: inherited.skillAccessMode,
  })
}

const assertCanonicalOverride = (
  address: AgentTeamAddress,
  kind: 'Team' | 'Agent',
  override: Readonly<AgentConfigOverride | TeamScopeConfigOverride> | null | undefined,
): void => {
  if (!override) return
  const canonical = canonicalizeAgentOrgPlacementLaunchPatch(override)
  if (!agentOrgPlacementLaunchPatchesEqual(override, canonical)) {
    fail(
      kind === 'Team' ? 'NON_CANONICAL_TEAM_OVERRIDE' : 'NON_CANONICAL_AGENT_OVERRIDE',
      `AgentOrg configuration has non-canonical ${kind} override '${address}'.`,
    )
  }
}

export const projectEditableAgentOrgRunFormModel = (input: Readonly<{
  orgDefinition: AgentOrgDefinition
  rootConfig: Readonly<ResolvedTeamRunLaunchConfig>
  teamOverrides: Readonly<Record<AgentTeamAddress, TeamScopeConfigOverride>>
  agentOverrides: Readonly<Record<AgentTeamAddress, AgentConfigOverride>>
  getTeamDefinitionById: (id: string) => AgentTeamDefinition | null
  getAgentDisplayNameById: (id: string) => string | null
  workspaceSelectionFor: (
    address: AgentTeamAddress,
    effective: Readonly<ResolvedTeamRunLaunchConfig>,
  ) => Readonly<WorkspaceSelectionState>
  workspaceOperationFor: (address: AgentTeamAddress) => TeamWorkspaceOperationState
  runtimeCatalogStateFor: (
    address: AgentTeamAddress,
    runtimeKind: string,
  ) => EditableRuntimeCatalogOperationState
}>): EditableAgentOrgRunFormProjection => {
  try {
    const occupied = new Set<AgentTeamAddress>()
    const teamAddresses = new Set<AgentTeamAddress>()
    const agentAddresses = new Set<AgentTeamAddress>()
    const directAgents: EditableTeamFormAgentNode[] = []
    const mountedTeams: EditableTeamFormTeamNode[] = []

    const claim = (address: AgentTeamAddress, kind: 'Agent' | 'Team'): void => {
      if (occupied.has(address)) fail('DUPLICATE_ADDRESS', `AgentOrg configuration has duplicate ${kind} address '${address}'.`)
      occupied.add(address)
      if (kind === 'Team') teamAddresses.add(address)
      else agentAddresses.add(address)
    }
    const agentNode = (inputNode: Readonly<{
      address: AgentTeamAddress
      displayName: string
      isCoordinator: boolean
      baseline: Readonly<ResolvedTeamRunLaunchConfig>
    }>): EditableTeamFormAgentNode => {
      const override = input.agentOverrides[inputNode.address]
      assertCanonicalOverride(inputNode.address, 'Agent', override)
      const effectiveConfig = resolveConfig(inputNode.baseline, override)
      return Object.freeze({
        mode: 'editable' as const,
        kind: 'agent' as const,
        address: inputNode.address,
        displayName: inputNode.displayName,
        isCoordinator: inputNode.isCoordinator,
        isCustomized: !resolvedTeamRunLaunchConfigsEqual(effectiveConfig, inputNode.baseline),
        override,
        baselineConfig: inputNode.baseline,
        effectiveConfig,
        runtimeCatalogState: input.runtimeCatalogStateFor(inputNode.address, effectiveConfig.runtimeKind),
      })
    }

    for (const member of input.orgDefinition.members) {
      const address = placementAddress(member.memberName)
      if (member.refType === 'AGENT') {
        claim(address, 'Agent')
        directAgents.push(agentNode({
          address,
          displayName: input.getAgentDisplayNameById(member.ref) ?? member.memberName,
          isCoordinator: false,
          baseline: input.rootConfig,
        }))
        continue
      }

      claim(address, 'Team')
      const definition = input.getTeamDefinitionById(member.ref) ?? fail(
        'MISSING_TEAM_DEFINITION',
        `AgentOrg configuration cannot resolve Team '${address}' (${member.ref}).`,
      )
      const coordinatorMatches = definition.nodes.filter(
        (node) => node.memberName === definition.coordinatorMemberName,
      )
      if (coordinatorMatches.length !== 1) {
        fail(
          'INVALID_TEAM_COORDINATOR',
          `AgentOrg configuration Team '${address}' has no exact coordinator member '${definition.coordinatorMemberName}'.`,
        )
      }
      const teamOverride = input.teamOverrides[address]
      assertCanonicalOverride(address, 'Team', teamOverride)
      const resolvedConfig = resolveConfig(input.rootConfig, teamOverride)
      const workspaceSelection = input.workspaceSelectionFor(address, resolvedConfig)
      const effectiveConfig = workspaceSelection.mode === 'new' && workspaceSelection.newWorkspacePath.trim()
        ? Object.freeze({
            ...resolvedConfig,
            workspaceId: null,
            workspaceMetadata: null,
            workspaceRootPath: workspaceSelection.newWorkspacePath.trim(),
          })
        : resolvedConfig
      const children = definition.nodes.map((node) => {
        const agentAddress = placementAddress(node.memberName, address)
        claim(agentAddress, 'Agent')
        return agentNode({
          address: agentAddress,
          displayName: node.memberName,
          isCoordinator: node.memberName === definition.coordinatorMemberName,
          baseline: effectiveConfig,
        })
      })
      const scope: EditableTeamScopeFormModel = Object.freeze({
        mode: 'editable' as const,
        address,
        displayName: definition.name,
        effectiveConfig,
        isCustomized: !resolvedTeamRunLaunchConfigsEqual(effectiveConfig, input.rootConfig),
        inheritedConfig: input.rootConfig,
        override: teamOverride ?? null,
        workspaceSelection,
        workspaceOperation: input.workspaceOperationFor(address),
        runtimeCatalogState: input.runtimeCatalogStateFor(address, effectiveConfig.runtimeKind),
      })
      mountedTeams.push(Object.freeze({
        mode: 'editable' as const,
        kind: 'agent_team' as const,
        address,
        scope,
        children: Object.freeze(children),
      }))
    }

    for (const address of Object.keys(input.teamOverrides)) {
      if (!teamAddresses.has(address)) {
        fail('STALE_TEAM_OVERRIDE', `AgentOrg configuration has stale Team override '${address}'.`)
      }
    }
    for (const address of Object.keys(input.agentOverrides)) {
      if (!agentAddresses.has(address)) {
        fail('STALE_AGENT_OVERRIDE', `AgentOrg configuration has stale Agent override '${address}'.`)
      }
    }

    return Object.freeze({
      status: 'ready' as const,
      model: Object.freeze({
        configurableAgentCount: agentAddresses.size,
        directAgents: Object.freeze(directAgents),
        mountedTeams: Object.freeze(mountedTeams),
      }),
    })
  } catch (cause) {
    if (cause instanceof ProjectionFailure) {
      return Object.freeze({ status: 'blocked' as const, diagnostic: cause.diagnostic })
    }
    throw cause
  }
}
