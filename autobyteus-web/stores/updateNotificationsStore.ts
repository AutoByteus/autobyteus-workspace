import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import { useAgentPackagesStore } from '~/stores/agentPackagesStore'
import { useSkillSourcesStore } from '~/stores/skillSourcesStore'
import { useSkillStore } from '~/stores/skillStore'
import { useSkillNamesStore } from '~/stores/skillNamesStore'
import { useUpdateAutomationStore } from '~/stores/updateAutomationStore'
import { agentRuntimeName } from '@autobyteus/agent-presentation-contracts'
import { showsAgentRuntimeUpdates } from '~/utils/ownNodeWindow'
import type { AgentRuntime } from '~/types/agentRuntimes'
import {
  CLEAR_UPDATE_NOTIFICATION,
  GET_UPDATE_NOTIFICATIONS,
  MARK_UPDATE_NOTIFICATIONS_READ,
} from '~/graphql/updateNotifications'
import {
  NODE_KIND_OF,
  type NodeSourceKind,
  type NodeUpdateNotification,
  type NodeUpdateNotificationKind,
  type UpdateNotificationKind,
  type UpdateNotificationOutcome,
} from '~/types/updateNotifications'

type SourceKind = NodeSourceKind

/** One package, skill source or agent runtime update in the Notification Center. */
export interface SourceNotificationRow {
  id: string
  kind: SourceKind
  sourceId: string
  name: string
  /** Null for agent runtimes. */
  repositoryUrl: string | null
  branch: string | null
  installedRevision: string
  latestRevision: string
  foundAt: string
  unread: boolean
  state: 'waiting' | 'updating' | 'failed' | 'handled'
  handledRevision: string | null
  handledAt: string | null
  error: string | null
  /** What an automatic update did (update-checks-and-auto-updates); null for a plain waiting or manually handled row. */
  outcome: UpdateNotificationOutcome | null
  /** The reason of an automatic failure or wait (the node's or the vendor's message). */
  outcomeReason: string | null
  /** Runtimes: agents of that runtime running now (read while the panel is open); 0 otherwise. */
  runningAgentCount: number
}

/** The app's own update in the Notification Center (desktop windows only). */
export interface AppNotificationRow {
  id: 'app'
  kind: 'app'
  fromVersion: string
  version: string
  foundAt: string | null
  unread: boolean
  state: 'waiting' | 'downloading' | 'downloaded' | 'installing' | 'failed' | 'handled'
  handledVersion: string | null
  releasePageUrl: string | null
  error: string | null
}

export type NotificationRow = SourceNotificationRow | AppNotificationRow
export type NotificationSection = { kind: UpdateNotificationKind; rows: NotificationRow[] }

const SOURCE_KINDS: Record<NodeUpdateNotificationKind, SourceKind> = { AGENT_PACKAGE: 'agent_package', SKILL_SOURCE: 'skill_source', AGENT_RUNTIME: 'agent_runtime' }
/**
 * A row's own action. For a runtime update, `before` is the runtime reading current when the update had started (unset
 * while it is being started): only a later reading tells how it ended.
 */
type RowAction = { state: 'updating' | 'failed'; error: string | null; before?: AgentRuntime[] | null }
/** The runtimes' state and update as the open panel reads them (`useAgentRuntimes`). */
export type RuntimeStatusesSource = Readonly<{
  runtimes: Readonly<Ref<AgentRuntime[] | null>>
  /** Starts the runtime's update; false when the node refused or could not be reached. */
  update: (runtimeKind: string) => Promise<boolean>
}>

const errorMessage = (cause: unknown): string => cause instanceof Error ? cause.message : String(cause)
const graphqlErrors = (errors: ReadonlyArray<{ message: string }> | undefined): void => {
  if (errors?.length) throw new Error(errors.map((entry) => entry.message).join(', '))
}
export const shortRevision = (revision: string): string => revision.slice(0, 7)
/** GitHub's compare page for the two revisions: what changed, without an API call (DEC-005). */
export const compareUrlOf = (row: SourceNotificationRow): string =>
  `${row.repositoryUrl ?? ''}/compare/${row.installedRevision}...${row.latestRevision}`
const isUnreadOutcome = (entry: Pick<NodeUpdateNotification, 'read' | 'state' | 'outcome'>): boolean =>
  !entry.read && entry.state === 'HANDLED' && entry.outcome === 'AUTO_UPDATED'

/**
 * The window's update notifications: the bound node's package, skill source and agent runtime
 * records (GraphQL, re-read on every feed frame) combined with the app record from the desktop
 * shell. Owns counts, order and each row's transient Update state; row actions run the existing
 * explicit update of their kind. Agent runtime rows show only in the node's own window of the
 * desktop's embedded node (DEC-020, AR-005).
 */
export const useUpdateNotificationsStore = defineStore('updateNotifications', () => {
  const node = useWindowNodeContextStore()
  const app = useAppUpdateStore()
  const automation = useUpdateAutomationStore()
  const nodeNotifications = ref<NodeUpdateNotification[]>([])
  const rowActions = ref<Record<string, RowAction>>({})
  const runtimeStatuses = shallowRef<RuntimeStatusesSource | null>(null)

  watch(() => node.bindingRevision, () => {
    nodeNotifications.value = []
    rowActions.value = {}
  })

  const showsRuntimes = computed(() => showsAgentRuntimeUpdates(node, automation.resolved))
  const runtimeReading = computed(() => runtimeStatuses.value?.runtimes.value ?? null)
  const runtimeOf = (runtimeKind: string): AgentRuntime | null =>
    runtimeReading.value?.find((runtime) => runtime.runtimeKind === runtimeKind) ?? null

  /** A runtime row without an action of its own still shows an update running elsewhere (Settings, automatic). */
  const runtimeState = (sourceId: string, action: RowAction | undefined): SourceNotificationRow['state'] => {
    if (action) return action.state
    const operation = runtimeOf(sourceId)?.operation
    return operation?.kind === 'UPDATE' && operation.state === 'RUNNING' ? 'updating' : 'waiting'
  }

  const sourceRows = computed<SourceNotificationRow[]>(() => nodeNotifications.value
    .filter((entry) => entry.kind !== 'AGENT_RUNTIME' || showsRuntimes.value)
    .map((entry) => {
      const kind = SOURCE_KINDS[entry.kind]
      const id = `${kind}:${entry.sourceId}`
      const action = rowActions.value[id]
      const waiting = entry.state === 'WAITING'
      const runtime = kind === 'agent_runtime'
      return {
        id, kind, sourceId: entry.sourceId, name: runtime ? agentRuntimeName(entry.name) : entry.name,
        repositoryUrl: entry.repositoryUrl, branch: entry.defaultBranch,
        installedRevision: entry.installedRevision, latestRevision: entry.latestRevision, foundAt: entry.foundAt,
        unread: !entry.read && (waiting || entry.outcome === 'AUTO_UPDATED'),
        state: !waiting ? 'handled' : runtime ? runtimeState(entry.sourceId, action) : action?.state ?? 'waiting',
        handledRevision: entry.handledRevision, handledAt: entry.handledAt, error: waiting ? action?.error ?? null : null,
        outcome: entry.outcome ?? null, outcomeReason: entry.outcomeReason ?? null,
        runningAgentCount: runtime ? runtimeOf(entry.sourceId)?.runningAgentCount ?? 0 : 0,
      }
    }))

  /** Shown while the shell has a record, or while a download or install is in progress. */
  const appRow = computed<AppNotificationRow | null>(() => {
    if (!app.isElectron) return null
    const record = app.notification
    const busy = app.status === 'downloading' || app.status === 'downloaded' || app.status === 'installing'
    if (!record && !busy) return null
    const failed = rowActions.value.app?.state === 'failed' && app.status === 'error'
    const state: AppNotificationRow['state'] = record?.state === 'handled' ? 'handled'
      : busy ? app.status as 'downloading' | 'downloaded' | 'installing' : failed ? 'failed' : 'waiting'
    return {
      id: 'app', kind: 'app', fromVersion: record?.fromVersion ?? app.currentVersion, version: record?.version ?? app.availableVersion ?? '',
      foundAt: record?.foundAt ?? null, unread: record?.state === 'waiting' && !record.read, state,
      handledVersion: record?.handledVersion ?? null, releasePageUrl: record?.releasePageUrl ?? null,
      error: failed ? rowActions.value.app?.error ?? null : null,
    }
  })

  /** Software update first; then one section per kind, by its newest waiting update; waiting rows first. */
  const sections = computed<NotificationSection[]>(() => {
    const byKind = new Map<SourceKind, SourceNotificationRow[]>()
    for (const row of sourceRows.value) byKind.set(row.kind, [...(byKind.get(row.kind) ?? []), row])
    const ordered = (rows: SourceNotificationRow[]) => [...rows].sort((a, b) =>
      Number(a.state === 'handled') - Number(b.state === 'handled') || b.foundAt.localeCompare(a.foundAt))
    const newestWaiting = (rows: SourceNotificationRow[]) => rows.find((row) => row.state !== 'handled')?.foundAt ?? ''
    const sourceSections = [...byKind].map(([kind, rows]) => ({ kind, rows: ordered(rows) }))
      .sort((a, b) => newestWaiting(b.rows).localeCompare(newestWaiting(a.rows)))
    return [...(appRow.value ? [{ kind: 'app' as const, rows: [appRow.value] }] : []), ...sourceSections]
  })

  const rows = computed<NotificationRow[]>(() => sections.value.flatMap((section) => section.rows))
  const waitingRows = computed(() => rows.value.filter((row) => row.state !== 'handled'))
  const waitingCount = computed(() => waitingRows.value.length)
  /** Rows an automatic update has already applied and the user has not seen: they keep the entry visible (REQ-008). */
  const unreadOutcomeRows = computed(() => rows.value.filter((row) => row.state === 'handled' && row.kind !== 'app' && row.outcome === 'AUTO_UPDATED' && row.unread))
  const hasUnread = computed(() => waitingRows.value.some((row) => row.unread) || unreadOutcomeRows.value.length > 0)
  /** The entry shows while updates wait or an automatic outcome is unread, even when nothing waits (DEC-007). */
  const hasEntry = computed(() => waitingCount.value > 0 || unreadOutcomeRows.value.length > 0)
  /** Waiting rows per kind, in section order, for the entry's type lines ("1 software update", …). */
  const waitingByKind = computed(() => sections.value
    .map((section) => [section.kind, section.rows.filter((row) => row.state !== 'handled').length] as const)
    .filter(([, count]) => count > 0))
  const isEmpty = computed(() => rows.value.length === 0)

  async function reload(): Promise<void> {
    const revision = node.bindingRevision
    try {
      const { data, errors } = await getApolloClient().query({ query: GET_UPDATE_NOTIFICATIONS, fetchPolicy: 'network-only' })
      graphqlErrors(errors)
      if (revision === node.bindingRevision) nodeNotifications.value = data?.updateNotifications ?? []
    } catch (cause) {
      console.warn('Failed to load update notifications:', cause)
    }
  }

  /** The user opened the Notification Center: every waiting row and automatic update is read, on the node and in the shell. */
  async function markAllRead(): Promise<void> {
    const appRead = app.markNotificationRead().catch((cause) => console.warn('Failed to mark the app update read:', cause))
    if (nodeNotifications.value.some((entry) => (entry.state === 'WAITING' && !entry.read) || isUnreadOutcome(entry))) {
      const revision = node.bindingRevision
      try {
        const { data, errors } = await getApolloClient().mutate({ mutation: MARK_UPDATE_NOTIFICATIONS_READ })
        graphqlErrors(errors)
        if (revision === node.bindingRevision && data?.markUpdateNotificationsRead) nodeNotifications.value = data.markUpdateNotificationsRead
      } catch (cause) {
        console.warn('Failed to mark update notifications read:', cause)
      }
    }
    await appRead
  }

  /** Runs the source's existing explicit update; skill sources are confirmed by the caller first (DEC-012). */
  async function updateSource(row: SourceNotificationRow): Promise<void> {
    if (row.state === 'updating' || row.state === 'handled') return
    rowActions.value = { ...rowActions.value, [row.id]: { state: 'updating', error: null } }
    const skillNames = useSkillNamesStore()
    try {
      if (row.kind === 'agent_package') {
        await skillNames.runWithSkillNameChecks(() => useAgentPackagesStore().updateAgentPackage(row.sourceId))
      } else {
        await skillNames.runWithSkillNameChecks(() => useSkillSourcesStore().githubOperation('update', row.sourceId))
        await useSkillStore().fetchAllSkills().catch((cause) => console.warn('Failed to refresh skills after an update:', cause))
      }
      await reload()
      const { [row.id]: _done, ...rest } = rowActions.value
      rowActions.value = rest
    } catch (cause) {
      rowActions.value = { ...rowActions.value, [row.id]: { state: 'failed', error: errorMessage(cause) } }
    }
  }

  /** The open panel lends its runtime readings (running agents, a running or failed update); null when it closes. */
  function attachRuntimeStatuses(source: RuntimeStatusesSource | null): void {
    runtimeStatuses.value = source
  }

  const setAction = (id: string, action: RowAction | null): void => {
    const { [id]: _previous, ...rest } = rowActions.value
    rowActions.value = action ? { ...rest, [id]: action } : rest
  }

  /**
   * A runtime's Update runs the vendor update of Settings → Agent Runtimes (REQ-021, DS-003) through the open panel's
   * runtime readings. A refusal (agents running, busy) shows through the next reading. The row says "Updating…" until a
   * reading after the start shows how the update ended.
   */
  async function updateRuntime(row: SourceNotificationRow): Promise<void> {
    const source = runtimeStatuses.value
    if (!source || row.kind !== 'agent_runtime' || row.state === 'updating' || row.state === 'handled' || row.runningAgentCount > 0) return
    setAction(row.id, { state: 'updating', error: null })
    const started = await source.update(row.sourceId)
    setAction(row.id, started ? { state: 'updating', error: null, before: runtimeReading.value } : null)
  }

  watch(runtimeReading, (reading) => {
    if (!reading) return
    for (const [id, action] of Object.entries(rowActions.value)) {
      // Readings taken while the update is being started (`before` unset) or before it started say nothing about it.
      if (!id.startsWith('agent_runtime:') || action.state !== 'updating' || action.before === undefined || reading === action.before) continue
      const operation = runtimeOf(id.slice('agent_runtime:'.length))?.operation
      if (operation?.kind === 'UPDATE' && operation.state === 'RUNNING') continue
      if (operation?.kind === 'UPDATE' && operation.state === 'FAILED') {
        setAction(id, { state: 'failed', error: operation.error })
      } else {
        // Updated (the record turns handled through the feed; read it now as well) or nothing to report.
        setAction(id, null)
        void reload()
      }
    }
  })

  /** Download (it re-checks first after a restart); a failure shows its message in the row. */
  async function downloadApp(): Promise<void> {
    const { app: _previous, ...rest } = rowActions.value
    rowActions.value = rest
    await app.downloadUpdate()
    if (app.status === 'error') rowActions.value = { ...rowActions.value, app: { state: 'failed', error: app.message || null } }
  }

  async function clear(row: NotificationRow): Promise<void> {
    if (row.state !== 'handled') return
    try {
      if (row.kind === 'app') {
        await app.clearNotification()
        return
      }
      const { data, errors } = await getApolloClient().mutate({
        mutation: CLEAR_UPDATE_NOTIFICATION, variables: { kind: NODE_KIND_OF[row.kind], sourceId: row.sourceId },
      })
      graphqlErrors(errors)
      if (data?.clearUpdateNotification) nodeNotifications.value = data.clearUpdateNotification
    } catch (cause) {
      console.warn('Failed to clear the update notification:', cause)
    }
  }

  return {
    sections, rows, waitingCount, hasUnread, hasEntry, unreadOutcomeRows, waitingByKind, isEmpty,
    reload, markAllRead, updateSource, updateRuntime, attachRuntimeStatuses, downloadApp,
    installApp: () => app.installUpdateAndRestart(), clear,
  }
})
