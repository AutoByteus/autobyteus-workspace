import { useRouter } from 'vue-router'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentOrgLaunchDraftStore } from '~/stores/agentOrgLaunchDraftStore'
import { chatStartSettingsOf, useChatDraftStore, type ChatTarget } from '~/stores/chatDraftStore'
import type { RunStartSettings } from '~/types/runSettings/RunSettings'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { loadTeamRunLaunchSeed } from '~/services/runConfigEditing/teamRunLaunchSeed'
import {
  runWorkspaceChoiceFromRootPath,
  runWorkspaceChoiceFromTeamWorkspace,
} from '~/services/workspace/runWorkspaceChoice'
import { buildAgentOrgLaunchRoute } from '~/services/workspace/workspaceNavigationService'

/** A heading-switcher choice: what to run next. */
export type RunStartTarget = Readonly<{ kind: 'agent' | 'team' | 'org'; definitionId: string }>

/**
 * The single start intent for every Run, "+" and heading switch (design DS-001/002/003/005):
 * which draft owner starts, with which settings, and which route opens. Agents and Agent Teams
 * start in New chat (`chatDraftStore`); Agent Orgs on the Org launch page
 * (`agentOrgLaunchDraftStore`). It owns no draft state and launches nothing.
 */
export function useRunStart() {
  const router = useRouter()
  const chatDraftStore = useChatDraftStore()
  const orgLaunchDraftStore = useAgentOrgLaunchDraftStore()

  const openChat = async (target: ChatTarget, options: { carried?: RunStartSettings | null; copied?: RunStartSettings | null } = {}) => {
    chatDraftStore.startForDefinition(target, options)
    await router.push('/chat')
  }
  const openOrg = async (orgDefinitionId: string, options: { sourceOrgRunId?: string | null; carried?: RunStartSettings | null } = {}) => {
    orgLaunchDraftStore.start({ orgDefinitionId, sourceOrgRunId: options.sourceOrgRunId ?? null, carried: options.carried ?? null })
    await router.push(buildAgentOrgLaunchRoute(orgDefinitionId, options.sourceOrgRunId ?? null))
  }

  /** Run on an Agent (list/detail): New chat with the definition's launch defaults. */
  const runAgent = (agentDefinitionId: string) => openChat({ kind: 'agent', agentDefinitionId })

  /** Run on an Agent Team (list/detail): New chat for the team. */
  const runTeam = (teamDefinitionId: string) => openChat({ kind: 'team', teamDefinitionId })

  /** Run on an Agent Org: the Org launch page with the Org's launch defaults. */
  const runOrg = (orgDefinitionId: string) => openOrg(orgDefinitionId)

  /** "+" on an Agent run: New chat for its agent with its workspace, approval and model config. */
  const copyAgentRun = async (runId: string) => {
    const config = useAgentContextsStore().getRun(runId)?.config
    if (!config) return
    const copied: RunStartSettings = {
      workspace: runWorkspaceChoiceFromRootPath(config.workspaceMetadata?.workspaceRootPath),
      runtimeKind: config.runtimeKind,
      llmModelIdentifier: config.llmModelIdentifier,
      llmConfig: config.llmConfig ?? null,
      autoExecuteTools: config.autoExecuteTools,
    }
    await openChat({ kind: 'agent', agentDefinitionId: config.agentDefinitionId }, { copied })
  }

  /**
   * "+" on a Team run: New chat for its team with the run's saved settings and member overrides.
   * If the run's settings cannot be read, the team's defaults are used.
   */
  const copyTeamRun = async (input: Readonly<{
    teamRunId: string
    teamDefinitionId: string
    workspaceMetadata?: readonly WorkspaceMetadata[]
    /** False once the user has moved on while the run was read: a late copy then opens nothing. */
    isCurrent?: () => boolean
  }>) => {
    let copied: RunStartSettings | null = null
    try {
      const seed = await loadTeamRunLaunchSeed({
        teamRunId: input.teamRunId,
        expectedDefinitionId: input.teamDefinitionId,
        workspaceMetadata: input.workspaceMetadata,
      })
      copied = {
        workspace: runWorkspaceChoiceFromTeamWorkspace(seed.rootConfig.workspace),
        runtimeKind: seed.rootConfig.runtimeKind,
        llmModelIdentifier: seed.rootConfig.llmModelIdentifier,
        llmConfig: seed.rootConfig.llmConfig,
        autoExecuteTools: seed.rootConfig.autoExecuteTools,
        teamAgentOverrides: seed.agentOverrides,
      }
    } catch (error) {
      console.warn('Could not copy the Team run settings; the team defaults are used.', error)
    }
    if (input.isCurrent && !input.isCurrent()) return
    await openChat({ kind: 'team', teamDefinitionId: input.teamDefinitionId }, { copied })
  }

  /** "+" on an Org run: the Org launch page prefilled from the run (the draft owner reads it). */
  const copyOrgRun = (orgRunId: string, orgDefinitionId: string) => openOrg(orgDefinitionId, { sourceOrgRunId: orgRunId })

  /**
   * The heading switcher (REQ-019). Workspace, approval and model config carry across; member
   * overrides reset. Between an Agent and a Team in New chat the typed text stays (DEC-006).
   */
  const switchTarget = async (choice: RunStartTarget, from: 'chat' | 'org') => {
    const carried = from === 'chat'
      ? (chatDraftStore.draft ? chatStartSettingsOf(chatDraftStore.draft) : null)
      : orgLaunchDraftStore.startSettings
    if (choice.kind === 'org') {
      await openOrg(choice.definitionId, { carried })
      return
    }
    const target: ChatTarget = choice.kind === 'team'
      ? { kind: 'team', teamDefinitionId: choice.definitionId }
      : { kind: 'agent', agentDefinitionId: choice.definitionId }
    if (from === 'chat' && chatDraftStore.draft) {
      chatDraftStore.retarget(target)
      return
    }
    await openChat(target, { carried })
  }

  /** The workspace tree "+": New chat for that agent in that workspace (today's New chat settings rule). */
  const newChatInWorkspace = async (input: Readonly<{ agentDefinitionId: string; workspaceRootPath: string }>) => {
    chatDraftStore.startNewChat(input)
    await router.push('/chat')
  }

  return { runAgent, runTeam, runOrg, copyAgentRun, copyTeamRun, copyOrgRun, switchTarget, newChatInWorkspace }
}
