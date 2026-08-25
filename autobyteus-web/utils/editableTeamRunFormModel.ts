import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { TeamWorkspaceOperationState } from '~/types/agent/TeamLaunchDraft'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type {
  EditableTeamFormMemberNode,
  EditableTeamRunFormModel,
  EditableRuntimeCatalogOperationState,
  EditableTeamScopeFormModel,
} from '~/types/agent/EditableTeamRunFormModel'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import {
  buildTeamMemberTreeFromDefinition,
  type TeamDefinitionMemberNode,
} from '~/utils/teamDefinitionMembers'
import { resolveTeamRunConfiguration } from '~/utils/teamRunLaunchHierarchy'
import { hasMeaningfulMemberOverride } from '~/utils/teamRunConfigUtils'

export const projectEditableTeamRunFormModel = (input: {
  config: Readonly<TeamRunConfig>
  teamDefinition: AgentTeamDefinition
  getTeamDefinitionById: (id: string) => AgentTeamDefinition | null
  repairAddresses: readonly AgentTeamAddress[]
  workspaceOperationFor: (address: AgentTeamAddress) => TeamWorkspaceOperationState
  workspaceSelectionFor: (address: AgentTeamAddress) => Readonly<WorkspaceSelectionState>
  runtimeCatalogStateFor: (runtimeKind: string) => EditableRuntimeCatalogOperationState
  forceReadOnly?: boolean
}): Readonly<EditableTeamRunFormModel> => {
  const memberTree = buildTeamMemberTreeFromDefinition(input.teamDefinition, {
    getTeamDefinitionById: input.getTeamDefinitionById,
  })
  const view = resolveTeamRunConfiguration(input.config, memberTree)
  const scopeModel = (
    address: AgentTeamAddress,
    inheritedAddress: AgentTeamAddress | null,
  ): EditableTeamScopeFormModel => {
    const scope = view.teamsByAddress[address]
    if (!scope) throw new Error(`Editable Team view is missing '${address}'.`)
    return Object.freeze({
      mode: 'editable' as const,
      address,
      displayName: scope.displayName,
      effectiveConfig: scope.effectiveConfig,
      isCustomized: scope.isCustomized,
      workspaceSelection: input.workspaceSelectionFor(address),
      inheritedConfig: inheritedAddress ? view.teamsByAddress[inheritedAddress]?.effectiveConfig ?? null : null,
      override: scope.override,
      workspaceOperation: input.workspaceOperationFor(address),
      runtimeCatalogState: input.runtimeCatalogStateFor(scope.effectiveConfig.runtimeKind),
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
        isCustomized: hasMeaningfulMemberOverride(agent.override),
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
