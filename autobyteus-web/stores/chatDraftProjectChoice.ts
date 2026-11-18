import type { ChatDraft, ChatTarget } from '~/stores/chatDraftStore'
import type { Project } from '~/types/project'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import type { RunStartSettings } from '~/types/runSettings/RunSettings'
import { runWorkspaceChoiceFromRootPath } from '~/services/workspace/runWorkspaceChoice'
import { useWorkspaceStore } from '~/stores/workspace'
import { TEMP_WORKSPACE_ID } from '~/utils/chat/chatDefaults'

/**
 * projects-left-navigation (REQ-004, REQ-005, DEC-014): a New chat draft's Project choice. `projectId` is the Project
 * the run will be started under (null: a plain start); `folderPicked` records that the user picked the folder on this
 * start, so choosing a Project later keeps it. Fixed once the run exists (the draft is gone then).
 */
export type ChatDraftProjectChoice = { projectId: string | null; folderPicked: boolean }

export const noProjectChoice = (): ChatDraftProjectChoice => ({ projectId: null, folderPicked: false })

/** The folder a run under the Project starts in: its first linked folder (the primary one); null when it has none. */
export const projectFolderOf = (project: Pick<Project, 'workspaces'> | null | undefined): string | null =>
  project?.workspaces[0]?.workspaceRootPath?.trim() || null

const tempWorkspaceChoice = (): RunWorkspaceChoice =>
  ({ kind: 'existing', workspaceId: useWorkspaceStore().tempWorkspaceId ?? TEMP_WORKSPACE_ID })

/** The user picks a folder on this start (the chip's Workspaces tab): it is used, and kept if a Project is chosen later. */
export const chooseDraftFolder = (draft: ChatDraft, workspace: RunWorkspaceChoice): void => {
  draft.workspace = workspace
  draft.projectChoice.folderPicked = true
}

/**
 * The chip's Projects tab (or "+" on a Project): the run will start under the Project, in its first linked folder,
 * else the temp workspace, unless the user already picked a folder on this start. "No project" (null) makes it a plain
 * start and keeps the folder. Nothing changes while the first send is in flight.
 */
export const chooseDraftProject = (draft: ChatDraft, projectId: string | null, folderRootPath: string | null): void => {
  if (draft.starting) return
  draft.projectChoice.projectId = projectId
  if (projectId && !draft.projectChoice.folderPicked) {
    draft.workspace = runWorkspaceChoiceFromRootPath(folderRootPath) ?? tempWorkspaceChoice()
  }
}

type DraftStarts = Readonly<{
  startNewChat(preset?: { agentDefinitionId?: string; workspaceRootPath?: string }): ChatDraft
  startForDefinition(target: ChatTarget): ChatDraft
  setProject(projectId: string | null, folderRootPath: string | null): void
}>

/**
 * "+" on a Project (no target: the default agent, chosen again in the heading) or on one of its groups (that agent or
 * team): the same New chat a workspace's "+" opens for that kind, under the Project and in its folder.
 */
export const startDraftUnderProject = (
  drafts: DraftStarts,
  input: Readonly<{ projectId: string; folderRootPath: string | null; target: ChatTarget | null }>,
): ChatDraft => {
  const target = input.target
  const draft = target?.kind === 'team'
    ? drafts.startForDefinition(target)
    : drafts.startNewChat(target ? { agentDefinitionId: target.agentDefinitionId } : {})
  drafts.setProject(input.projectId, input.folderRootPath)
  return draft
}

/** The draft's settings as a start carries them (the heading switcher, "+"); a carried start is not under a Project. */
export const chatStartSettingsOf = (draft: ChatDraft): RunStartSettings => ({
  workspace: draft.workspace,
  runtimeKind: draft.context.config.runtimeKind,
  llmModelIdentifier: draft.context.config.llmModelIdentifier,
  llmConfig: draft.context.config.llmConfig ?? null,
  autoExecuteTools: draft.autoExecuteTools,
})
