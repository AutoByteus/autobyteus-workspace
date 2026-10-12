import { watch } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useProjectStore } from '~/stores/projectStore'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { useTaskWorkerTaskStore } from '~/stores/taskWorkerTaskStore'
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth'
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'
import type { ProjectChangeMessage } from '~/types/project'
import { NodeChangeFeed, type NodeChangeSocket } from '~/services/nodeChangeFeed/nodeChangeFeed'

const MESSAGE_TYPES = new Set(['connected', 'project_upserted', 'project_removed', 'task_upserted', 'task_removed', 'task_worker_status'])
export const parseProjectChangeMessage = (raw: string): ProjectChangeMessage | null => {
  try {
    const value = JSON.parse(raw) as { type?: unknown }
    return value && typeof value === 'object' && typeof value.type === 'string' && MESSAGE_TYPES.has(value.type) ? value as ProjectChangeMessage : null
  } catch { return null }
}

/**
 * The window node's `/ws/projects` change feed. Projects pages retain it while they are mounted, and
 * the Task-worker store while the Workspaces tree shows Task workers; the socket lifecycle is the
 * shared node change feed. Every `connected` frame makes the stores re-read what they have loaded.
 */
export class ProjectChangeFeed extends NodeChangeFeed<ProjectChangeMessage> {
  constructor(options: Readonly<{
    endpoint(): string | null
    deliver(message: ProjectChangeMessage): void
    createSocket?(url: string): NodeChangeSocket
    retryDelayMs?(attempt: number): number
  }>) {
    super({ ...options, label: 'Projects', parse: parseProjectChangeMessage })
  }
}

let feed: ProjectChangeFeed | null = null
/** The process feed, delivering to the Project, Task and Task-worker stores of the bound node. */
export const getProjectChangeFeed = (): ProjectChangeFeed => {
  if (feed) return feed
  const node = useWindowNodeContextStore()
  const created = new ProjectChangeFeed({
    endpoint: () => {
      try { return buildAuthenticatedWebSocketUrl(node.getBoundEndpoints().projectsWs, getActiveRemoteAccessCredential() ?? '') }
      catch { return null }
    },
    deliver: (message) => {
      useProjectStore().applyChange(message)
      useProjectTaskStore().applyChange(message)
      useTaskWorkerTaskStore().applyChange(message)
    },
  })
  watch(() => node.bindingRevision, () => created.rebind())
  feed = created
  return created
}
export const resetProjectChangeFeedForTests = (): void => { feed = null }
