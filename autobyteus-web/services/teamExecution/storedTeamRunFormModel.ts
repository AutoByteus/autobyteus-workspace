import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type {
  ResolvedTeamRunLaunchConfig,
  StoredTeamRunConfigurationView,
  StoredTeamRunMemberNode,
} from '~/types/agent/TeamRunConfig'
import type {
  StoredTeamFormMemberNode,
  StoredTeamRunFormModel,
  StoredTeamScopeFormModel,
  StoredWorkspaceDisplay,
} from '~/types/agent/StoredTeamRunFormModel'
import { resolvedTeamRunLaunchConfigsEqual } from '~/utils/teamRunConfigUtils'

const workspaceDisplay = (
  config: Readonly<ResolvedTeamRunLaunchConfig>,
): StoredWorkspaceDisplay | null => {
  const metadata = config.workspaceMetadata
  const rootPath = config.workspaceRootPath?.trim() || ''
  if (!metadata && !rootPath) return null
  return Object.freeze({
    workspaceId: metadata?.workspaceId ?? config.workspaceId,
    displayName: metadata?.displayName?.trim() || rootPath,
    rootPath,
    availability: metadata ? 'available' as const : 'historical-only' as const,
  })
}

const scopeModel = (input: {
  scope: StoredTeamRunConfigurationView['root']
}): StoredTeamScopeFormModel => Object.freeze({
  mode: 'stored' as const,
  address: input.scope.address,
  displayName: input.scope.displayName,
  effectiveConfig: input.scope.effectiveConfig,
  isCustomized: input.scope.isCustomized,
  storedWorkspace: workspaceDisplay(input.scope.effectiveConfig),
})

export const projectStoredTeamRunFormModel = (
  view: Readonly<StoredTeamRunConfigurationView>,
): Readonly<StoredTeamRunFormModel> => {
  const visit = (
    nodes: readonly StoredTeamRunMemberNode[],
    parentAddress: AgentTeamAddress,
    coordinatorAddress: AgentTeamAddress,
  ): readonly StoredTeamFormMemberNode[] => Object.freeze(nodes.map((node): StoredTeamFormMemberNode => {
    const parent = view.teamsByAddress[parentAddress]
    if (!parent) throw new Error(`Stored Team view is missing parent '${parentAddress}'.`)

    if (node.kind === 'agent') {
      const agent = view.agentsByAddress[node.address]
      if (!agent) throw new Error(`Stored Team view is missing Agent '${node.address}'.`)
      return Object.freeze({
        mode: 'stored' as const,
        kind: 'agent' as const,
        address: node.address,
        displayName: node.displayName,
        isCoordinator: node.address === coordinatorAddress,
        isCustomized: !resolvedTeamRunLaunchConfigsEqual(agent.effectiveConfig, parent.effectiveConfig),
        effectiveConfig: agent.effectiveConfig,
        storedWorkspace: workspaceDisplay(agent.effectiveConfig),
      })
    }

    const team = view.teamsByAddress[node.address]
    if (!team) throw new Error(`Stored Team view is missing Team '${node.address}'.`)
    return Object.freeze({
      mode: 'stored' as const,
      kind: 'agent_team' as const,
      address: node.address,
      scope: scopeModel({ scope: team }),
      children: visit(node.children, node.address, node.coordinatorAddress),
    })
  }))

  return Object.freeze({
    mode: 'stored' as const,
    definitionLabel: view.teamDefinitionName,
    root: scopeModel({ scope: view.root }),
    members: visit(view.memberNodes, '/', view.coordinatorAddress),
  })
}
