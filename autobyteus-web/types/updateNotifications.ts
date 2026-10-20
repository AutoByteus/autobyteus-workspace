/** Node notification kinds, as the server names them (GraphQL `UpdateNotificationKind`). */
export type NodeUpdateNotificationKind = 'AGENT_PACKAGE' | 'SKILL_SOURCE'

/** One node update notification (GraphQL `UpdateNotification`). */
export interface NodeUpdateNotification {
  kind: NodeUpdateNotificationKind
  sourceId: string
  name: string
  repositoryUrl: string
  defaultBranch: string | null
  installedRevision: string
  latestRevision: string
  foundAt: string
  read: boolean
  state: 'WAITING' | 'HANDLED'
  handledRevision: string | null
  handledAt: string | null
}

/** The kinds the Notification Center shows; a section, its icon and its strings per kind. */
export type UpdateNotificationKind = 'app' | 'agent_package' | 'skill_source'

/** `/ws/update-notifications` frames (server → client); every frame means "re-read". */
export type UpdateNotificationChangeMessage =
  | { type: 'connected' }
  | { type: 'update_notifications_changed' }
