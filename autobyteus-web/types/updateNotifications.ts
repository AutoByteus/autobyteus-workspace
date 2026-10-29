/** Node notification kinds, as the server names them (GraphQL `UpdateNotificationKind`). */
/** `AGENT_RUNTIME` (update-checks-and-auto-updates): the desktop's own node only; `sourceId` is the runtime kind. */
export type NodeUpdateNotificationKind = 'AGENT_PACKAGE' | 'SKILL_SOURCE' | 'AGENT_RUNTIME'

/**
 * What an automatic update did, when the setting of that kind was on (REQ-008, REQ-022). `AUTO_UPDATED` is a handled
 * record that stays unread until seen; `AUTO_FAILED` and `AUTO_WAITING` (a runtime whose agents run) are waiting records
 * that say why nothing changed. Local changes never skip an update (SR-003, DEC-019).
 */
export type UpdateNotificationOutcome = 'AUTO_UPDATED' | 'AUTO_FAILED' | 'AUTO_WAITING'

/** One node update notification (GraphQL `UpdateNotification`). */
export interface NodeUpdateNotification {
  kind: NodeUpdateNotificationKind
  sourceId: string
  /** For agent runtimes the runtime kind (`codex_app_server`); the web names it as Settings → Agent Runtimes does. */
  name: string
  /** Null for agent runtimes. */
  repositoryUrl: string | null
  defaultBranch: string | null
  /** A commit SHA, or a version for agent runtimes. */
  installedRevision: string
  latestRevision: string
  foundAt: string
  read: boolean
  state: 'WAITING' | 'HANDLED'
  handledRevision: string | null
  handledAt: string | null
  outcome: UpdateNotificationOutcome | null
  /** The reason of `AUTO_FAILED` / `AUTO_WAITING` (the node's or the vendor's message). */
  outcomeReason: string | null
  outcomeAt: string | null
}

/** The kinds the Notification Center shows; a section, its icon and its strings per kind. */
export type UpdateNotificationKind = 'app' | 'agent_package' | 'skill_source' | 'agent_runtime'
/** The node's kinds, as the Notification Center names them. */
export type NodeSourceKind = Exclude<UpdateNotificationKind, 'app'>

export const NODE_KIND_OF: Readonly<Record<NodeSourceKind, NodeUpdateNotificationKind>> = {
  agent_package: 'AGENT_PACKAGE', skill_source: 'SKILL_SOURCE', agent_runtime: 'AGENT_RUNTIME',
}

/** `/ws/update-notifications` frames (server → client); every frame means "re-read" (the notifications or the settings). */
export type UpdateNotificationChangeMessage =
  | { type: 'connected' }
  | { type: 'update_notifications_changed' }
  | { type: 'update_settings_changed' }

type PerKind<T> = { agentPackages: T; skillSources: T; agentRuntimes: T }

/** The node's check intervals and automatic-update switches (GraphQL `UpdateAutomationSettings`). */
export interface UpdateAutomationSettings {
  /** Minutes, 15..1440. */
  intervals: PerKind<number>
  automaticUpdates: PerKind<boolean>
  /** ISO time until which GitHub asked this node to wait; null when it did not. */
  githubWaitUntil: string | null
  /** The node is the desktop's own node: the only one with agent runtime checks and updates. */
  desktopEmbeddedNode: boolean
}

/** The settings' field of each node kind. */
export const SETTINGS_FIELD_OF: Readonly<Record<NodeSourceKind, keyof PerKind<unknown>>> = {
  agent_package: 'agentPackages', skill_source: 'skillSources', agent_runtime: 'agentRuntimes',
}

export const MIN_UPDATE_INTERVAL_MINUTES = 15
export const MAX_UPDATE_INTERVAL_MINUTES = 24 * 60
