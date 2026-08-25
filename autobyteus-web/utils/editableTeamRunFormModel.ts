import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { TeamWorkspaceOperationState } from '~/types/agent/TeamLaunchDraft'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type {
  EditableTeamFormMemberNode,
  EditableTeamRunFormModel,
  TeamRunFormRuntimeCatalogState,
  TeamScopeFormModel,
} from '~/types/agent/TeamRunFormModel'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import {
  buildTeamMemberTreeFromDefinition,
  type TeamDefinitionMemberNode,
} from '~/utils/teamDefinitionMembers'
import { resolveTeamRunConfiguration } from '~/utils/teamRunLaunchHierarchy'

export const projectEditableTeamRunFormModel = (input: {
  config: Readonly<TeamRunConfig>
  teamDefinition: AgentTeamDefinition
  getTeamDefinitionById: (id: string) => AgentTeamDefinition | null
  repairAddresses: readonly AgentTeamAddress[]
  workspaceOperationFor: (address: AgentTeamAddress) => TeamWorkspaceOperationState
  workspaceSelectionFor: (address: AgentTeamAddress) => Readonly<WorkspaceSelectionState>
  runtimeCatalogStateFor: (runtimeKind: string) => TeamRunFormRuntimeCatalogState
  forceReadOnly?: boolean
}): Readonly<EditableTeamRunFormModel> => {
  const memberTree = buildTeamMemberTreeFromDefinition(input.teamDefinition, {
    getTeamDefinitionById: input.getTeamDefinitionById,
  })
  const view = resolveTeamRunConfiguration(input.config, memberTree)
  const scopeModel = (
    address: AgentTeamAddress,
    inheritedAddress: AgentTeamAddress | null,
  ): TeamScopeFormModel => {
    const scope = view.teamsByAddress[address]
    if (!scope) throw new Error(`Editable Team view is missing '${address}'.`)
    return Object.freeze({
      address,
      displayName: scope.displayName,
      effectiveConfig: scope.effectiveConfig,
      workspaceSelection: input.workspaceSelectionFor(address),
      inheritedConfig: inheritedAddress ? view.teamsByAddress[inheritedAddress]?.effectiveConfig ?? null : null,
      override: scope.override,
      isCustomized: scope.isCustomized,
      workspaceOperation: input.workspaceOperationFor(address),
      runtimeCatalogState: input.runtimeCatalogStateFor(scope.effectiveConfig.runtimeKind),
      storedWorkspace: null,
    })
  }
  const visit = (
    nodes: readonly TeamDefinitionMemberNode[],
    parentAddress: AgentTeamAddress,
    coordinatorAddress: AgentTeamAddress,
  ): readonly EditableTeamFormMemberNode[] => Object.freeze(nodes.map((node): EditableTeamFormMemberNode => {
    if (node.kind === 'agent') {
      const agent = view.agentsByAddress[node.address]
      const baseline = view.teamsByAddress[parentAddress]
      if (!agent || !baseline) throw new Error(`Editable Team view is missing Agent '${node.address}'.`)
      return Object.freeze({
        mode: 'editable' as const,
        kind: 'agent' as const,
        address: node.address,
        displayName: node.displayName,
        isCoordinator: node.address === coordinatorAddress,
        override: input.config.agentOverrides[node.address],
        baselineConfig: baseline.effectiveConfig,
        effectiveConfig: agent.effectiveConfig,
        runtimeCatalogState: input.runtimeCatalogStateFor(agent.effectiveConfig.runtimeKind),
      })
    }
    return Object.freeze({
      mode: 'editable' as const,
      kind: 'agent_team' as const,
      address: node.address,
      scope: scopeModel(node.address, parentAddress),
      children: visit(node.children, node.address, node.coordinatorAddress),
    })
  }))
  const rootCoordinator = memberTree.find(
    (node) => node.displayName === input.teamDefinition.coordinatorMemberName,
  )?.address ?? '/'

  return Object.freeze({
    mode: 'editable' as const,
    definitionLabel: input.teamDefinition.name,
    config: input.config,
    root: scopeModel('/', null),
    members: visit(memberTree, '/', rootCoordinator),
    repairAddresses: Object.freeze([...input.repairAddresses]),
    isLocked: input.config.isLocked || input.forceReadOnly === true,
  })
}
