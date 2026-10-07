import type { RouteLocationRaw } from 'vue-router'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentRunStore } from '~/stores/agentRunStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useChatDraftStore, type ChatDraft } from '~/stores/chatDraftStore'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { effectiveAutoExecuteTools } from '~/utils/agentRunRuntimeDraftPolicy'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import { writeChatLastModel } from '~/utils/chat/chatLastModelPreference'
import { isTemporaryRunId } from '~/utils/chat/chatDefaults'
import { buildAgentRunChatRoute } from '~/services/workspace/workspaceNavigationService'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { buildAgentDraftContextFileOwner } from '~/utils/contextFiles/contextFileOwner'
import { normalizeMemberAddress } from '~/utils/teamDefinitionMembers'
import { buildChatTeamLaunchConfig } from '~/services/chat/chatTeamLaunchConfig'
import type { TeamLaunchDraftId } from '~/types/agent/TeamLaunchDraft'
import { resolveRunWorkspaceChoice, sameRunWorkspaceChoice } from '~/services/workspace/runWorkspaceChoice'
import type { RunSettingsValues } from '~/types/runSettings/RunSettings'
import { buildTeamMemberTree, type RunMemberNode } from '~/utils/runSettings/runMemberTree'
import { resolveScopesReadiness, type LaunchReadiness } from '~/utils/runSettings/launchReadiness'
import { mentionsPresentInText } from '~/utils/collaborators/collaboratorMentionText'
import { resolveMemberSettings } from '~/utils/runSettings/memberOverrides'

const t = (key: string, params?: Record<string, string | number>): string =>
  localizationRuntime.translate(key, params)

export type ChatLaunchNavigate = (route: RouteLocationRaw) => Promise<unknown>

/** A launch is blocked when the draft cannot start a run; the reason labels the disabled send button. */
export type ChatLaunchReadiness = LaunchReadiness

/**
 * The shared readiness rule (DI-004) over the draft's effective scopes: the chat settings, and for a
 * Team every member with its own settings (`runMemberTree`), so a member on a disabled runtime
 * blocks the launch too.
 */
export const resolveChatLaunchReadiness = (draft: ChatDraft): ChatLaunchReadiness => {
  const config = draft.context.config
  const availability = useRuntimeAvailabilityStore()
  const root: RunSettingsValues = {
    workspace: draft.workspace,
    runtimeKind: config.runtimeKind,
    llmModelIdentifier: config.llmModelIdentifier,
    llmConfig: config.llmConfig ?? null,
    autoExecuteTools: draft.autoExecuteTools,
  }
  let targetAvailable: boolean
  let members: readonly RunMemberNode[] = []
  let targetUnavailable: string
  if (draft.target.kind === 'agent') {
    const definitions = useAgentDefinitionStore()
    targetAvailable = definitions.agentDefinitions.length === 0
      || Boolean(definitions.getAgentDefinitionById(draft.target.agentDefinitionId))
    targetUnavailable = t('chat.launch.agentUnavailable')
  } else {
    const teamId = draft.target.teamDefinitionId
    const team = useAgentTeamDefinitionStore().agentTeamDefinitions.find((candidate) => candidate.id === teamId)
    targetAvailable = Boolean(team)
    targetUnavailable = t('chat.launch.teamUnavailable')
    if (team) {
      const catalogs = useLLMProviderConfigStore()
      members = buildTeamMemberTree({ team, root, agentOverrides: draft.teamAgentOverrides }, {
        schemaFor: (runtimeKind, llmModelIdentifier) => catalogs.modelConfigSchemaByIdentifier(runtimeKind, llmModelIdentifier),
        sameWorkspace: sameRunWorkspaceChoice,
      })
    }
  }
  return resolveScopesReadiness({
    targetAvailable,
    scopes: { status: 'ready', root, members },
    isRuntimeEnabled: availability.hasFetched ? (runtimeKind) => availability.isRuntimeEnabled(runtimeKind) : null,
  }, {
    targetUnavailable,
    runtimeUnavailable: (runtimeKind) => t('chat.launch.runtimeUnavailable', { runtime: runtimeKindToLabel(runtimeKind) }),
    chooseModel: t('chat.launch.chooseModel'),
  })
}

/**
 * Launch a New chat addressed to an agent through the existing first-send path.
 *
 * Order (D-04): mark starting → register + select the draft context → await the first send
 * (which presents its own failures) → route to `/chat?id=<selected id>` → finish the sent draft.
 * On success the selected id is the promoted run id; a first send that failed before
 * promotion lands on the still-registered `temp-*` context, where its error is shown. Either way
 * the message now belongs to that run, so the draft and its row go (REQ-006). A failure before
 * registration throws and keeps the draft.
 */
export const launchAgentChat = async (
  draft: ChatDraft,
  deps: { navigate: ChatLaunchNavigate },
): Promise<{ runId: string }> => {
  if (draft.target.kind !== 'agent') throw new Error('launchAgentChat requires an agent-addressed draft.')
  const readiness = resolveChatLaunchReadiness(draft)
  if (!readiness.ready) throw new Error(readiness.reason)

  const chatDraftStore = useChatDraftStore()
  const agentContextsStore = useAgentContextsStore()
  const selectionStore = useAgentSelectionStore()
  chatDraftStore.markStarting(draft)

  const context = draft.context
  try {
    const { workspaceId, workspaceMetadata } = await resolveRunWorkspaceChoice(draft.workspace)
    context.config.workspaceId = workspaceId
    context.config.workspaceMetadata = workspaceMetadata
    context.config.autoExecuteTools = effectiveAutoExecuteTools(context.config.runtimeKind, draft.autoExecuteTools)
    context.config.isLocked = false
    selectionStore.beginSelectionIntent()
    agentContextsStore.registerDraftRun(context)
  } catch (error) {
    // Nothing was registered: the New chat stays as it was, with its text and files.
    chatDraftStore.clearStarting(draft)
    throw error
  }

  await useAgentRunStore().sendUserInputAndSubscribe()

  const runId = selectionStore.selectedType === 'agent' && selectionStore.selectedRunId
    ? selectionStore.selectedRunId
    : context.state.runId
  if (!isTemporaryRunId(context.state.runId)) {
    writeChatLastModel({
      runtimeKind: context.config.runtimeKind,
      llmModelIdentifier: context.config.llmModelIdentifier,
    })
  }
  await deps.navigate(buildAgentRunChatRoute(runId))
  // The context now belongs to agentContextsStore.
  chatDraftStore.finishSentDraft(draft)
  return { runId }
}

/**
 * Launch a New chat addressed to a team (REQ-010): a launch draft with the chat's runtime, model,
 * model config, workspace and approval for every member, the customized members' own settings
 * (REQ-009), focused on the coordinator. The first message, with its `@` mentions (REQ-012), goes to
 * the coordinator through the existing Team send, finalizing the attachments uploaded under the
 * chat draft. The user lands in the existing Team view and the sent draft goes (REQ-006); any
 * failure throws and keeps the draft.
 */
export const launchTeamChat = async (
  draft: ChatDraft,
  deps: { navigate: ChatLaunchNavigate },
): Promise<{ teamRunId: string | null }> => {
  if (draft.target.kind !== 'team') throw new Error('launchTeamChat requires a team-addressed draft.')
  const readiness = resolveChatLaunchReadiness(draft)
  if (!readiness.ready) throw new Error(readiness.reason)

  const chatDraftStore = useChatDraftStore()
  const selectionStore = useAgentSelectionStore()
  const teamRunConfigStore = useTeamRunConfigStore()
  // The Team view opens on the new team's conversation, never on settings left open for another run.
  useWorkspaceCenterViewStore().showChat()
  const teamDefinitionId = draft.target.teamDefinitionId
  const definition = useAgentTeamDefinitionStore().agentTeamDefinitions.find((team) => team.id === teamDefinitionId)
  if (!definition) throw new Error(t('chat.launch.teamUnavailable'))
  chatDraftStore.markStarting(draft)

  const context = draft.context
  let teamDraftId: TeamLaunchDraftId | null = null
  try {
    const { workspaceId, workspaceMetadata } = await resolveRunWorkspaceChoice(draft.workspace)
    const root = {
      runtimeKind: context.config.runtimeKind,
      llmModelIdentifier: context.config.llmModelIdentifier,
      llmConfig: context.config.llmConfig ?? null,
      autoExecuteTools: effectiveAutoExecuteTools(context.config.runtimeKind, draft.autoExecuteTools),
    }
    const config = buildChatTeamLaunchConfig(definition, { ...root, workspaceId, workspaceMetadata }, draft.teamAgentOverrides)
    // Team launch readiness checks every effective runtime's catalog on the team config owner.
    const catalogs = useLLMProviderConfigStore()
    const runtimeKinds = new Set([root.runtimeKind, ...Object.values(draft.teamAgentOverrides)
      .map((override) => resolveMemberSettings(root, override).runtimeKind)])
    for (const runtimeKind of runtimeKinds) {
      await catalogs.fetchProvidersWithModels(runtimeKind)
      teamRunConfigStore.setRuntimeModelCatalog(runtimeKind, catalogs.models(runtimeKind))
    }
    selectionStore.beginSelectionIntent()
    teamDraftId = teamRunConfigStore.createDraft(config, normalizeMemberAddress(definition.coordinatorMemberName))
    selectionStore.selectTeamDraftWithoutShellNavigation(teamDraftId)
  } catch (error) {
    chatDraftStore.clearStarting(draft)
    throw error
  }

  try {
    await useAgentTeamRunStore().sendMessageToFocusedMember(
      context.requirement,
      [...context.contextFilePaths],
      {
        attachmentDraftOwner: buildAgentDraftContextFileOwner(context.state.runId),
        mentions: mentionsPresentInText(context.requirement, context.requestedMentions),
      },
    )
  } catch (error) {
    // The launch failed before any message was recorded: stay on New chat with the draft intact
    // and leave no orphan Team launch draft behind.
    if (teamDraftId) {
      try {
        if (selectionStore.selectedDraftId === teamDraftId) selectionStore.clearSelectionWithoutShellNavigation()
        teamRunConfigStore.removeDraft(teamDraftId)
      } catch (cleanupError) {
        console.warn('Failed to discard the Team launch draft after a failed chat launch:', cleanupError)
      }
    }
    chatDraftStore.clearStarting(draft)
    throw error
  }

  const teamRunId = selectionStore.selectedType === 'team' ? selectionStore.selectedRunId : null
  if (teamRunId) {
    writeChatLastModel({
      runtimeKind: context.config.runtimeKind,
      llmModelIdentifier: context.config.llmModelIdentifier,
    })
  }
  await deps.navigate('/workspace')
  chatDraftStore.finishSentDraft(draft)
  return { teamRunId }
}
