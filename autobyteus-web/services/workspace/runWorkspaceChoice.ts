import { useWorkspaceStore, type WorkspaceInfo } from '~/stores/workspace'
import {
  ensureRunHistoryWorkspaceByRootPath,
  resolveRunHistoryWorkspaceMetadataByRootPath,
} from '~/stores/runHistoryLoadActions'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { normalizeWorkspaceRootPath, workspaceMetadataFromWorkspaceInfo } from '~/utils/workspaceMetadata'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import type { TeamWorkspaceSelection } from '~/types/agent/TeamRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'

/**
 * The single owner of `RunWorkspaceChoice` resolution and of every conversion between it and the
 * older workspace shapes that survive in owners this change does not replace
 * (design §Workspace Representation Conversion Boundaries).
 */

const t = (key: string): string => localizationRuntime.translate(key)

const workspaceRootPathOf = (info: WorkspaceInfo | null | undefined): string =>
  info?.workspaceRootPath || info?.absolutePath || info?.workspaceConfig?.root_path || info?.workspaceConfig?.rootPath || ''

/** A known workspace for the path, else the folder itself; nothing for an empty path. */
export const runWorkspaceChoiceFromRootPath = (rootPath: string | null | undefined): RunWorkspaceChoice | null => {
  const path = rootPath?.trim()
  if (!path) return null
  const known = useWorkspaceStore().findWorkspaceInfoByRootPath(path)
  return known ? { kind: 'existing', workspaceId: known.workspaceId } : { kind: 'folder', rootPath: path }
}

/** Org "+" seed (`buildEditableAgentOrgRunSeed`) and the saved placed-team workspace draft. */
export const runWorkspaceChoiceFromSelection = (
  selection: WorkspaceSelectionState | null | undefined,
): RunWorkspaceChoice | null => {
  if (!selection) return null
  if (selection.mode === 'existing') {
    return selection.existingWorkspaceId
      ? { kind: 'existing', workspaceId: selection.existingWorkspaceId }
      : runWorkspaceChoiceFromRootPath(selection.newWorkspacePath)
  }
  return runWorkspaceChoiceFromRootPath(selection.newWorkspacePath)
}

/** Team "+" copy (`loadTeamRunLaunchSeed` root workspace). */
export const runWorkspaceChoiceFromTeamWorkspace = (
  workspace: TeamWorkspaceSelection | null | undefined,
): RunWorkspaceChoice | null => {
  if (!workspace) return null
  if (workspace.workspaceId && useWorkspaceStore().workspaces[workspace.workspaceId]) {
    return { kind: 'existing', workspaceId: workspace.workspaceId }
  }
  return runWorkspaceChoiceFromRootPath(workspace.workspaceMetadata?.workspaceRootPath)
}

/** The saved placed-team workspace draft (`existingRunConfigStore.updateAgentOrgWorkspaceSelection`). */
export const toWorkspaceSelection = (choice: RunWorkspaceChoice): WorkspaceSelectionState => choice.kind === 'existing'
  ? { mode: 'existing', existingWorkspaceId: choice.workspaceId, newWorkspacePath: '' }
  : { mode: 'new', existingWorkspaceId: null, newWorkspacePath: choice.rootPath }

/** The folder a choice points at, as far as it is known without asking the server. */
export const runWorkspaceChoiceRootPath = (choice: RunWorkspaceChoice | null | undefined): string | null => {
  if (!choice) return null
  if (choice.kind === 'folder') return normalizeWorkspaceRootPath(choice.rootPath) || null
  const store = useWorkspaceStore()
  return normalizeWorkspaceRootPath(store.workspaceMetadataById[choice.workspaceId]?.workspaceRootPath
    || workspaceRootPathOf(store.workspaces[choice.workspaceId])) || null
}

/** Two choices are the same when they name the same workspace or the same folder. */
export const sameRunWorkspaceChoice = (
  left: RunWorkspaceChoice | null | undefined,
  right: RunWorkspaceChoice | null | undefined,
): boolean => {
  if (!left || !right) return left === right
  if (left.kind === 'existing' && right.kind === 'existing' && left.workspaceId === right.workspaceId) return true
  const leftPath = runWorkspaceChoiceRootPath(left)
  return Boolean(leftPath) && leftPath === runWorkspaceChoiceRootPath(right)
}

/** Read-only: the known workspace behind a choice (a typed folder that is not a workspace yet has none). */
export const knownRunWorkspaceOf = (
  choice: RunWorkspaceChoice | null | undefined,
): { workspaceId: string | null; workspaceMetadata: WorkspaceMetadata | null } => {
  const store = useWorkspaceStore()
  const known = (workspaceId: string) => {
    const info = store.workspaces[workspaceId]
    return { workspaceId, workspaceMetadata: store.workspaceMetadataById[workspaceId] ?? (info ? workspaceMetadataFromWorkspaceInfo(info) : null) }
  }
  if (!choice) return { workspaceId: null, workspaceMetadata: null }
  if (choice.kind === 'existing') return known(choice.workspaceId)
  const match = store.findWorkspaceInfoByRootPath(choice.rootPath)
  return match ? known(match.workspaceId) : { workspaceId: null, workspaceMetadata: null }
}

/**
 * Launch: the choice as a workspace id + metadata. A folder that is not yet a workspace becomes one
 * (created at most once per path by the run-history workspace owner).
 */
export const resolveRunWorkspaceChoice = async (
  choice: RunWorkspaceChoice,
): Promise<{ workspaceId: string; workspaceMetadata: WorkspaceMetadata }> => {
  const workspaceStore = useWorkspaceStore()
  if (choice.kind === 'existing') {
    const info = workspaceStore.workspaces[choice.workspaceId]
    const metadata = workspaceStore.workspaceMetadataById[choice.workspaceId]
      ?? (info ? workspaceMetadataFromWorkspaceInfo(info) : null)
    if (metadata) return { workspaceId: choice.workspaceId, workspaceMetadata: metadata }
    const rootPath = info?.absolutePath
    if (!rootPath) throw new Error(t('chat.launch.workspaceUnavailable'))
    return resolveRunWorkspaceChoice({ kind: 'folder', rootPath })
  }
  const workspaceId = await ensureRunHistoryWorkspaceByRootPath(choice.rootPath)
  const workspaceMetadata = workspaceId
    ? await resolveRunHistoryWorkspaceMetadataByRootPath(choice.rootPath)
    : null
  if (!workspaceId || !workspaceMetadata) throw new Error(t('chat.launch.workspaceUnavailable'))
  return { workspaceId, workspaceMetadata }
}
