import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import { useAgentPackagesStore } from '~/stores/agentPackagesStore'
import { useSkillSourcesStore } from '~/stores/skillSourcesStore'
import { useSkillStore } from '~/stores/skillStore'
import { useSkillNamesStore } from '~/stores/skillNamesStore'
import {
  CLEAR_UPDATE_NOTIFICATION,
  GET_UPDATE_NOTIFICATIONS,
  MARK_UPDATE_NOTIFICATIONS_READ,
} from '~/graphql/updateNotifications'
import type { NodeUpdateNotification, NodeUpdateNotificationKind, UpdateNotificationKind } from '~/types/updateNotifications'

type SourceKind = Exclude<UpdateNotificationKind, 'app'>

/** One package or skill source update in the Notification Center. */
export interface SourceNotificationRow {
  id: string
  kind: SourceKind
  sourceId: string
  name: string
  repositoryUrl: string
  branch: string | null
  installedRevision: string
  latestRevision: string
  foundAt: string
  unread: boolean
  state: 'waiting' | 'updating' | 'failed' | 'handled'
  handledRevision: string | null
  error: string | null
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

const SOURCE_KINDS: Record<NodeUpdateNotificationKind, SourceKind> = { AGENT_PACKAGE: 'agent_package', SKILL_SOURCE: 'skill_source' }
const NODE_KINDS: Record<SourceKind, NodeUpdateNotificationKind> = { agent_package: 'AGENT_PACKAGE', skill_source: 'SKILL_SOURCE' }
type RowAction = { state: 'updating' | 'failed'; error: string | null }

const errorMessage = (cause: unknown): string => cause instanceof Error ? cause.message : String(cause)
const graphqlErrors = (errors: ReadonlyArray<{ message: string }> | undefined): void => {
  if (errors?.length) throw new Error(errors.map((entry) => entry.message).join(', '))
}
export const shortRevision = (revision: string): string => revision.slice(0, 7)
/** GitHub's compare page for the two revisions: what changed, without an API call (DEC-005). */
export const compareUrlOf = (row: SourceNotificationRow): string =>
  `${row.repositoryUrl}/compare/${row.installedRevision}...${row.latestRevision}`

/**
 * The window's update notifications: the bound node's package and skill source records (GraphQL,
 * re-read on every feed frame) combined with the app record from the desktop shell. Owns counts,
 * order and each row's transient Update state; row actions run the existing explicit update of
 * their kind.
 */
export const useUpdateNotificationsStore = defineStore('updateNotifications', () => {
  const node = useWindowNodeContextStore()
  const app = useAppUpdateStore()
  const nodeNotifications = ref<NodeUpdateNotification[]>([])
  const rowActions = ref<Record<string, RowAction>>({})

  watch(() => node.bindingRevision, () => {
    nodeNotifications.value = []
    rowActions.value = {}
  })

  const sourceRows = computed<SourceNotificationRow[]>(() => nodeNotifications.value.map((entry) => {
    const kind = SOURCE_KINDS[entry.kind]
    const id = `${kind}:${entry.sourceId}`
    const action = rowActions.value[id]
    const waiting = entry.state === 'WAITING'
    return {
      id, kind, sourceId: entry.sourceId, name: entry.name, repositoryUrl: entry.repositoryUrl, branch: entry.defaultBranch,
      installedRevision: entry.installedRevision, latestRevision: entry.latestRevision, foundAt: entry.foundAt,
      unread: waiting && !entry.read, state: !waiting ? 'handled' : action?.state ?? 'waiting',
      handledRevision: entry.handledRevision, error: waiting ? action?.error ?? null : null,
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
  const hasUnread = computed(() => waitingRows.value.some((row) => row.unread))
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

  /** The user opened the Notification Center: every waiting row is read, on the node and in the shell. */
  async function markAllRead(): Promise<void> {
    const appRead = app.markNotificationRead().catch((cause) => console.warn('Failed to mark the app update read:', cause))
    if (nodeNotifications.value.some((entry) => entry.state === 'WAITING' && !entry.read)) {
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
        mutation: CLEAR_UPDATE_NOTIFICATION, variables: { kind: NODE_KINDS[row.kind], sourceId: row.sourceId },
      })
      graphqlErrors(errors)
      if (data?.clearUpdateNotification) nodeNotifications.value = data.clearUpdateNotification
    } catch (cause) {
      console.warn('Failed to clear the update notification:', cause)
    }
  }

  return {
    sections, rows, waitingCount, hasUnread, waitingByKind, isEmpty,
    reload, markAllRead, updateSource, downloadApp, installApp: () => app.installUpdateAndRestart(), clear,
  }
})
