import { computed, ref } from 'vue'
import { useWorkspaceStore, type WorkspaceInfo } from '~/stores/workspace'
import type { MobileLaunchPickerItem } from '~/types/mobileLaunch'

export interface MobileLaunchWorkspaceLoadResult {
  workspaceId: string
  rootPath: string
}

const normalizeRootPath = (value: string | null | undefined): string => {
  const source = (value || '').trim()
  if (!source) {
    return ''
  }
  const normalized = source.replace(/\\/g, '/')
  if (normalized === '/') {
    return normalized
  }
  return normalized.replace(/\/+$/, '')
}

const workspaceRootPath = (workspace: WorkspaceInfo): string => (
  workspace.absolutePath
    || workspace.workspaceConfig?.root_path
    || workspace.workspaceConfig?.rootPath
    || ''
)

const errorMessage = (cause: unknown, fallback: string): string => {
  if (cause instanceof Error && cause.message.trim()) {
    return cause.message.trim()
  }
  if (typeof cause === 'string' && cause.trim()) {
    return cause.trim()
  }
  if (cause && typeof cause === 'object' && 'message' in cause) {
    const message = (cause as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  }
  return fallback
}

export function useMobileLaunchWorkspaces() {
  const workspaceStore = useWorkspaceStore()
  const isRefreshing = ref(false)
  const isLoadingPath = ref(false)
  const error = ref<string | null>(null)

  const workspaceItems = computed<MobileLaunchPickerItem[]>(() => workspaceStore.allWorkspaces.map((workspace) => {
    const rootPath = workspaceRootPath(workspace)
    return {
      id: workspace.workspaceId,
      label: workspace.name || rootPath || 'Workspace',
      detail: rootPath || workspace.workspaceId,
      group: workspace.isTemp ? 'Temporary workspaces' : 'All workspaces',
    }
  }))

  const workspaceRootPathById = computed(() => new Map(
    workspaceStore.allWorkspaces.map((workspace) => [workspace.workspaceId, workspaceRootPath(workspace)] as const),
  ))

  const workspaceIdByRootPath = computed(() => {
    const entries = workspaceStore.allWorkspaces.flatMap((workspace) => {
      const normalized = normalizeRootPath(workspaceRootPath(workspace))
      return normalized ? [[normalized, workspace.workspaceId] as const] : []
    })
    return new Map(entries)
  })

  async function refresh(force = false): Promise<void> {
    isRefreshing.value = true
    error.value = null
    try {
      await workspaceStore.fetchAllWorkspaces(force)
    } catch (cause) {
      error.value = errorMessage(cause, 'Could not load workspaces.')
      throw cause
    } finally {
      isRefreshing.value = false
    }
  }

  async function loadByPath(path: string): Promise<MobileLaunchWorkspaceLoadResult> {
    const rootPath = path.trim()
    if (!rootPath) {
      error.value = 'Enter a server-side workspace path before loading.'
      throw new Error(error.value)
    }

    isLoadingPath.value = true
    error.value = null
    try {
      const workspaceId = await workspaceStore.createWorkspace({ root_path: rootPath })
      return { workspaceId, rootPath }
    } catch (cause) {
      error.value = errorMessage(cause, 'Could not load that workspace path.')
      throw cause
    } finally {
      isLoadingPath.value = false
    }
  }

  function getWorkspaceIdForRootPath(path: string | null | undefined): string {
    return workspaceIdByRootPath.value.get(normalizeRootPath(path)) || ''
  }

  function getRootPathForWorkspaceId(workspaceId: string): string {
    return workspaceRootPathById.value.get(workspaceId) || ''
  }

  return {
    workspaceItems,
    workspaceRootPathById,
    workspaceIdByRootPath,
    isRefreshing,
    isLoadingPath,
    error,
    refresh,
    loadByPath,
    getWorkspaceIdForRootPath,
    getRootPathForWorkspaceId,
  }
}
