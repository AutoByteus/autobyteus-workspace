import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useUpdateNotificationsStore, compareUrlOf, type SourceNotificationRow } from '../updateNotificationsStore'
import { useAppUpdateStore } from '../appUpdateStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'
import type { NodeUpdateNotification } from '~/types/updateNotifications'

const { packagesStore, skillSourcesStore, skillStore, skillNamesStore } = vi.hoisted(() => ({
  packagesStore: { updateAgentPackage: vi.fn() },
  skillSourcesStore: { githubOperation: vi.fn() },
  skillStore: { fetchAllSkills: vi.fn() },
  skillNamesStore: { runWithSkillNameChecks: vi.fn(async (action: () => Promise<unknown>) => action()) },
}))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))
vi.mock('~/stores/agentPackagesStore', () => ({ useAgentPackagesStore: () => packagesStore }))
vi.mock('~/stores/skillSourcesStore', () => ({ useSkillSourcesStore: () => skillSourcesStore }))
vi.mock('~/stores/skillStore', () => ({ useSkillStore: () => skillStore }))
vi.mock('~/stores/skillNamesStore', () => ({ useSkillNamesStore: () => skillNamesStore }))

const A = 'a'.repeat(40)
const B = 'b'.repeat(40)
const node = (overrides: Partial<NodeUpdateNotification> = {}): NodeUpdateNotification => ({
  kind: 'AGENT_PACKAGE', sourceId: 'github:acme/agents', name: 'acme/agents', repositoryUrl: 'https://github.com/acme/agents',
  defaultBranch: 'main', installedRevision: A, latestRevision: B, foundAt: '2026-10-20T09:00:00.000Z', read: false,
  state: 'WAITING', handledRevision: null, handledAt: null, ...overrides,
})
const appRecord = (overrides: Record<string, unknown> = {}) => ({
  version: '1.5.7', fromVersion: '1.5.6', foundAt: '2026-10-20T10:00:00.000Z', read: false, state: 'waiting' as const,
  handledVersion: null, releasePageUrl: 'https://github.com/AutoByteus/x/releases/tag/v1.5.7', ...overrides,
})

const apollo = (notifications: NodeUpdateNotification[], mutate = vi.fn()) => {
  const query = vi.fn().mockResolvedValue({ data: { updateNotifications: notifications } })
  vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as any)
  return { query, mutate }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  skillNamesStore.runWithSkillNameChecks.mockImplementation(async (action: () => Promise<unknown>) => action())
  skillStore.fetchAllSkills.mockResolvedValue(undefined)
})

describe('updateNotificationsStore', () => {
  it('lists node rows with counts and the unread state; handled rows do not count (REQ-008, REQ-011)', async () => {
    apollo([
      node(),
      node({ kind: 'SKILL_SOURCE', sourceId: 's1', name: 'acme/skills', read: true }),
      node({ sourceId: 'p2', state: 'HANDLED', handledRevision: B }),
    ])
    const store = useUpdateNotificationsStore()
    await store.reload()
    expect(store.waitingCount).toBe(2)
    expect(store.hasUnread).toBe(true)
    expect(store.waitingByKind).toEqual([['agent_package', 1], ['skill_source', 1]])
    expect(store.rows.find((row) => row.id === 'agent_package:p2')?.state).toBe('handled')
  })

  it('orders: Software update first, then kinds by their newest waiting update; waiting rows first, newest first', async () => {
    apollo([
      node({ sourceId: 'p-old', foundAt: '2026-10-19T09:00:00.000Z' }),
      node({ sourceId: 'p-handled', state: 'HANDLED', handledRevision: B, foundAt: '2026-10-20T11:00:00.000Z' }),
      node({ sourceId: 'p-new', foundAt: '2026-10-20T08:00:00.000Z' }),
      node({ kind: 'SKILL_SOURCE', sourceId: 's1', foundAt: '2026-10-20T10:00:00.000Z' }),
    ])
    const app = useAppUpdateStore()
    app.isElectron = true
    app.applyRemoteState({ status: 'idle', currentVersion: '1.5.6', notification: appRecord() })
    const store = useUpdateNotificationsStore()
    await store.reload()
    expect(store.sections.map((section) => section.kind)).toEqual(['app', 'skill_source', 'agent_package'])
    expect(store.sections[2]!.rows.map((row) => row.id)).toEqual(['agent_package:p-new', 'agent_package:p-old', 'agent_package:p-handled'])
    expect(store.waitingCount).toBe(4)
  })

  it('shows no app row in a browser window (REQ-017)', () => {
    const app = useAppUpdateStore()
    app.isElectron = false
    app.applyRemoteState({ notification: appRecord() })
    expect(useUpdateNotificationsStore().sections).toEqual([])
  })

  it('maps the app record and the download states to the app row', () => {
    const app = useAppUpdateStore()
    app.isElectron = true
    app.applyRemoteState({ status: 'downloading', downloadPercent: 40, notification: appRecord({ read: true }) })
    const store = useUpdateNotificationsStore()
    expect(store.rows[0]).toMatchObject({ id: 'app', state: 'downloading', fromVersion: '1.5.6', version: '1.5.7', unread: false })
    app.applyRemoteState({ status: 'downloaded' })
    expect(store.rows[0]!.state).toBe('downloaded')
    app.applyRemoteState({ status: 'idle', notification: appRecord({ state: 'handled', handledVersion: '1.5.7' }) })
    expect(store.rows[0]).toMatchObject({ state: 'handled', handledVersion: '1.5.7' })
    expect(store.waitingCount).toBe(0)
  })

  it('markAllRead marks node rows read through the mutation and the app through the shell', async () => {
    const { mutate } = apollo([node()])
    mutate.mockResolvedValue({ data: { markUpdateNotificationsRead: [node({ read: true })] } })
    const app = useAppUpdateStore()
    const markRead = vi.spyOn(app, 'markNotificationRead').mockResolvedValue()
    const store = useUpdateNotificationsStore()
    await store.reload()
    await store.markAllRead()
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(markRead).toHaveBeenCalledTimes(1)
    expect(store.hasUnread).toBe(false)
    await store.markAllRead()
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('updates a package through the existing store action, showing Updating… then re-reading (REQ-007)', async () => {
    const { query } = apollo([node()])
    const store = useUpdateNotificationsStore()
    await store.reload()
    let finish!: () => void
    packagesStore.updateAgentPackage.mockReturnValue(new Promise<void>((resolve) => { finish = resolve }))
    const pending = store.updateSource(store.rows[0] as SourceNotificationRow)
    await nextTick()
    expect(store.rows[0]!.state).toBe('updating')
    query.mockResolvedValue({ data: { updateNotifications: [node({ state: 'HANDLED', handledRevision: B })] } })
    finish()
    await pending
    expect(packagesStore.updateAgentPackage).toHaveBeenCalledWith('github:acme/agents')
    expect(store.rows[0]!.state).toBe('handled')
    expect(store.waitingCount).toBe(0)
  })

  it('keeps the row with its reason when an update fails (REQ-007)', async () => {
    apollo([node()])
    const store = useUpdateNotificationsStore()
    await store.reload()
    packagesStore.updateAgentPackage.mockRejectedValue(new Error('GitHub returned 502'))
    await store.updateSource(store.rows[0] as SourceNotificationRow)
    expect(store.rows[0]).toMatchObject({ state: 'failed', error: 'GitHub returned 502' })
    expect(store.waitingCount).toBe(1)
  })

  it('updates a skill source through the existing GitHub operation and refreshes the skills', async () => {
    apollo([node({ kind: 'SKILL_SOURCE', sourceId: 's1' })])
    const store = useUpdateNotificationsStore()
    await store.reload()
    skillSourcesStore.githubOperation.mockResolvedValue(undefined)
    await store.updateSource(store.rows[0] as SourceNotificationRow)
    expect(skillSourcesStore.githubOperation).toHaveBeenCalledWith('update', 's1')
    expect(skillStore.fetchAllSkills).toHaveBeenCalledTimes(1)
  })

  it('clears a handled node row with its compound identity', async () => {
    const { mutate } = apollo([node({ kind: 'SKILL_SOURCE', sourceId: 's1', state: 'HANDLED', handledRevision: B })])
    mutate.mockResolvedValue({ data: { clearUpdateNotification: [] } })
    const store = useUpdateNotificationsStore()
    await store.reload()
    await store.clear(store.rows[0]!)
    expect(mutate.mock.calls[0]![0].variables).toEqual({ kind: 'SKILL_SOURCE', sourceId: 's1' })
    expect(store.isEmpty).toBe(true)
  })

  it('a failed app download shows the failure in the row', async () => {
    const app = useAppUpdateStore()
    app.isElectron = true
    app.applyRemoteState({ status: 'idle', notification: appRecord() })
    vi.spyOn(app, 'downloadUpdate').mockImplementation(async () => {
      app.applyRemoteState({ status: 'error', message: 'Network down', errorKind: 'download', errorOperation: 'download' })
    })
    const store = useUpdateNotificationsStore()
    await store.downloadApp()
    expect(store.rows[0]).toMatchObject({ state: 'failed', error: 'Network down' })
  })

  it('drops the previous node rows when the window is bound to another node', async () => {
    apollo([node()])
    const store = useUpdateNotificationsStore()
    await store.reload()
    useWindowNodeContextStore().bindingRevision += 1
    await nextTick()
    expect(store.rows).toEqual([])
  })

  it('builds GitHub compare links from the two revisions', () => {
    expect(compareUrlOf({ repositoryUrl: 'https://github.com/acme/agents', installedRevision: A, latestRevision: B } as SourceNotificationRow))
      .toBe(`https://github.com/acme/agents/compare/${A}...${B}`)
  })
})
