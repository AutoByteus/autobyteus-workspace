import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import type { ExistingRunModelSelection } from '~/types/agent/ExistingRunModelConfigDraft'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { existingRunModelConfigsEqual } from './existingAgentModelConfigDraft'
import {
  createExistingHierarchicalModelConfigDraft,
  planExistingHierarchicalModelConfigPatches,
  updateExistingHierarchicalScopeModelConfig,
  type ExistingHierarchicalModelConfigDraft,
  type ExistingHierarchicalModelConfigPatch,
} from './existingHierarchicalModelConfigDraft'

export type ExistingAgentOrgModelConfigScopeKind = 'CONFIGURED_ORG' | 'CONFIGURED_TEAM' | 'CONFIGURED_AGENT'
export type ExistingAgentOrgModelConfigDraft = ExistingHierarchicalModelConfigDraft<ExistingAgentOrgModelConfigScopeKind>
export type ExistingAgentOrgModelConfigPatch = ExistingHierarchicalModelConfigPatch<ExistingAgentOrgModelConfigScopeKind>

type Launch = AgentOrgExecutionTree['rootOrg']['defaultLaunchConfiguration']
const selection = (launch: Launch): ExistingRunModelSelection => ({
  llmModelIdentifier: launch.llmModelIdentifier,
  llmConfig: launch.llmConfig,
})
const linked = (child: Launch, parent: Launch): boolean => child.runtimeKind === parent.runtimeKind
  && child.llmModelIdentifier === parent.llmModelIdentifier
  && existingRunModelConfigsEqual(child.llmConfig, parent.llmConfig)

export const createExistingAgentOrgModelConfigDraft = (
  tree: AgentOrgExecutionTree,
): ExistingAgentOrgModelConfigDraft => {
  const root = tree.rootOrg.defaultLaunchConfiguration
  type ScopeInput = Parameters<typeof createExistingHierarchicalModelConfigDraft<ExistingAgentOrgModelConfigScopeKind>>[0][number]
  const scopes: ScopeInput[] = [{
    scopeKind: 'CONFIGURED_ORG', address: '/', parentAddress: null, runtimeKind: root.runtimeKind,
    originalSelection: selection(root), linkedToParentAtDraftStart: false,
  }]
  for (const member of tree.rootOrg.members) {
    if ('agentRunId' in member) {
      scopes.push({ scopeKind: 'CONFIGURED_AGENT', address: member.address,
        parentAddress: '/', runtimeKind: member.launchConfiguration.runtimeKind,
        originalSelection: selection(member.launchConfiguration),
        linkedToParentAtDraftStart: linked(member.launchConfiguration, root) })
      continue
    }
    scopes.push({ scopeKind: 'CONFIGURED_TEAM', address: member.address,
      parentAddress: '/', runtimeKind: member.defaultLaunchConfiguration.runtimeKind,
      originalSelection: selection(member.defaultLaunchConfiguration),
      linkedToParentAtDraftStart: linked(member.defaultLaunchConfiguration, root) })
    for (const agent of member.members) {
      scopes.push({ scopeKind: 'CONFIGURED_AGENT', address: agent.address,
        parentAddress: member.address, runtimeKind: agent.launchConfiguration.runtimeKind,
        originalSelection: selection(agent.launchConfiguration),
        linkedToParentAtDraftStart: linked(agent.launchConfiguration, member.defaultLaunchConfiguration) })
    }
  }
  return createExistingHierarchicalModelConfigDraft(scopes)
}

export const updateExistingAgentOrgScopeModelConfig = (
  draft: ExistingAgentOrgModelConfigDraft,
  address: AgentTeamAddress | string,
  next: ExistingRunModelSelection,
  directlyEdited = true,
): ExistingAgentOrgModelConfigDraft => updateExistingHierarchicalScopeModelConfig(draft, address, next, directlyEdited)

export const planExistingAgentOrgModelConfigPatches = (
  draft: ExistingAgentOrgModelConfigDraft,
): ExistingAgentOrgModelConfigPatch[] => planExistingHierarchicalModelConfigPatches(draft)
