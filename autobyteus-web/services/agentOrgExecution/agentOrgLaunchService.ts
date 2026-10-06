import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride } from '~/types/agent/TeamRunConfig'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import type { RunSettingsValues } from '~/types/runSettings/RunSettings'
import { resolveRunWorkspaceChoice } from '~/services/workspace/runWorkspaceChoice'
import { toAgentOrgPlacementLaunchConfiguration } from '~/utils/agentOrgLaunchPatch'
import { effectiveAutoExecuteTools } from '~/utils/agentRunRuntimeDraftPolicy'
import { writeChatLastModel } from '~/utils/chat/chatLastModelPreference'

/** What the Org launch page starts: the Org card's settings and each member's own settings. */
export type AgentOrgLaunchSnapshot = Readonly<{
  orgDefinitionId: string
  root: RunSettingsValues & { workspace: RunWorkspaceChoice }
  teamOverrides: Readonly<Record<AgentTeamAddress, AgentConfigOverride>>
  /** A placed team's own workspace (only where it differs from the Org's). */
  teamWorkspaces: Readonly<Record<AgentTeamAddress, RunWorkspaceChoice>>
  agentOverrides: Readonly<Record<AgentTeamAddress, AgentConfigOverride>>
}>

const workspaceKey = (choice: RunWorkspaceChoice): string =>
  choice.kind === 'existing' ? `existing:${choice.workspaceId}` : `folder:${choice.rootPath}`

/**
 * The Org launch side effects (moved out of the old Org form, AF-004): resolve or create the root
 * and placed-team workspaces (each folder once), serialize the placements, create the Org run with
 * no focused recipient, publish it to the history tree and remember the model. Holds no state.
 */
export const agentOrgLaunchService = Object.freeze({
  async launch(snapshot: AgentOrgLaunchSnapshot): Promise<string> {
    const resolved = new Map<string, Promise<string>>()
    const rootPathOf = (choice: RunWorkspaceChoice): Promise<string> => {
      const key = workspaceKey(choice)
      let request = resolved.get(key)
      if (!request) {
        request = resolveRunWorkspaceChoice(choice).then(({ workspaceMetadata }) => workspaceMetadata.workspaceRootPath)
        resolved.set(key, request)
      }
      return request
    }
    const workspaceRootPath = await rootPathOf(snapshot.root.workspace)
    const teamAddresses = [...new Set([...Object.keys(snapshot.teamOverrides), ...Object.keys(snapshot.teamWorkspaces)])].sort()
    const teamOverrides = (await Promise.all(teamAddresses.map(async (address) => {
      const workspace = snapshot.teamWorkspaces[address]
      return {
        address,
        configuration: toAgentOrgPlacementLaunchConfiguration(snapshot.teamOverrides[address] ?? {},
          workspace ? await rootPathOf(workspace) : null),
      }
    }))).filter((item) => Object.keys(item.configuration).length)
    const agentOverrides = Object.entries(snapshot.agentOverrides)
      .map(([address, override]) => ({ address, configuration: toAgentOrgPlacementLaunchConfiguration(override) }))
      .filter((item) => Object.keys(item.configuration).length)

    const orgRunId = await useAgentOrgRunStore().launch({
      agentOrgDefinitionId: snapshot.orgDefinitionId,
      rootConfiguration: {
        runtimeKind: snapshot.root.runtimeKind,
        llmModelIdentifier: snapshot.root.llmModelIdentifier,
        llmConfig: snapshot.root.llmConfig,
        autoExecuteTools: effectiveAutoExecuteTools(snapshot.root.runtimeKind, snapshot.root.autoExecuteTools),
        workspaceRootPath,
      },
      teamOverrides,
      agentOverrides,
    })
    void useRunHistoryStore().refreshAgentOrgHistoryItem(orgRunId)
    writeChatLastModel({ runtimeKind: snapshot.root.runtimeKind, llmModelIdentifier: snapshot.root.llmModelIdentifier })
    return orgRunId
  },
})
