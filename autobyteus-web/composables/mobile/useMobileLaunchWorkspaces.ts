import { computed, ref } from 'vue'
import { useWorkspaceStore, type WorkspaceInfo } from '~/stores/workspace'
import type { MobileLaunchPickerItem } from '~/types/mobileLaunch'
import { useLocalization } from '~/composables/useLocalization'
import { readWorkspacePathRefusal, workspacePathRefusalText } from '~/utils/workspace/workspacePathRefusal'

export interface MobileLaunchWorkspaceLoadResult {
  workspaceId: string
  rootPath: string
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
  const isLoadingPath = ref(false)
  const error = ref<string | null>(null)

  const workspaceItems = computed<MobileLaunchPickerItem[]>(() => workspaceStore.allWorkspaces.map((workspace) => {
    const rootPath = workspaceRootPath(workspace)
    return {
      id: workspace.workspaceId,
      label: workspace.name || rootPath || 'Workspace',
      detail: rootPath || workspace.workspaceId,
    }
  }))

  async function refresh(force = false): Promise<void> {
    error.value = null
    try {
      await workspaceStore.fetchAllWorkspaces(force)
    } catch (cause) {
      error.value = errorMessage(cause, 'Could not load workspaces.')
      throw cause
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
      const refusal = readWorkspacePathRefusal(cause)
      error.value = refusal
        ? workspacePathRefusalText(refusal, rootPath, useLocalization().t)
        : errorMessage(cause, 'Could not load that workspace path.')
      throw cause
    } finally {
      isLoadingPath.value = false
    }
  }

  return {
    workspaceItems,
    isLoadingPath,
    error,
    refresh,
    loadByPath,
  }
}
