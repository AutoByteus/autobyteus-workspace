import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => ({ query: vi.fn(), mutate: vi.fn() })) }))

import { PROJECTS_PANEL_STORAGE_PREFIX, useProjectsPanelStore } from '../projectsPanelStore'
import { useProjectStore } from '../projectStore'
import { TEMP_TASKS_LIST_ID, useProjectTaskStore } from '../projectTaskStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'
import type { Project } from '~/types/project'

const project = (projectId: string, updatedAt: string): Project => ({ projectId, name: projectId, description: '', createdAt: updatedAt, updatedAt,
  workspaces: [], openTaskCount: 0, taskCount: 0 })
/** A fresh app (as after a restart): new Pinia, same localStorage. */
const restart = (nodeId = 'node-a') => {
  setActivePinia(createPinia())
  useWindowNodeContextStore().nodeId = nodeId
  return useProjectsPanelStore()
}
const projectsLoaded = (...projects: Project[]) => { const store = useProjectStore(); store.projects = projects; store.hasFetched = true }

describe('projectsPanelStore (projects-always-on REQ-007)', () => {
  beforeEach(() => { window.localStorage.clear() })

  it('defaults to the most recently updated Project, else Temp tasks', () => {
    const panel = restart()
    projectsLoaded()
    expect(panel.choice).toEqual({ kind: 'temp' })
    projectsLoaded(project('older', '2026-10-01T00:00:00.000Z'), project('newer', '2026-10-05T00:00:00.000Z'))
    expect(panel.choice).toEqual({ kind: 'project', projectId: 'newer' })
  })

  it('remembers the choice per node across restarts', () => {
    restart('node-a').choose({ kind: 'project', projectId: 'older' })
    expect(window.localStorage.getItem(`${PROJECTS_PANEL_STORAGE_PREFIX}node-a`)).toBe(JSON.stringify({ kind: 'project', projectId: 'older' }))

    const again = restart('node-a')
    projectsLoaded(project('older', '2026-10-01T00:00:00.000Z'), project('newer', '2026-10-05T00:00:00.000Z'))
    expect(again.choice).toEqual({ kind: 'project', projectId: 'older' })

    const otherNode = restart('node-b')
    projectsLoaded(project('older', '2026-10-01T00:00:00.000Z'), project('newer', '2026-10-05T00:00:00.000Z'))
    expect(otherNode.choice).toEqual({ kind: 'project', projectId: 'newer' })

    restart('node-b').choose({ kind: 'temp' })
    expect(restart('node-b').choice).toEqual({ kind: 'temp' })
  })

  it('keeps a remembered Project until the list is known, then falls back when it was deleted', () => {
    restart().choose({ kind: 'project', projectId: 'gone' })
    const panel = restart()
    expect(panel.choice).toEqual({ kind: 'project', projectId: 'gone' })
    projectsLoaded(project('kept', '2026-10-01T00:00:00.000Z'))
    expect(panel.choice).toEqual({ kind: 'project', projectId: 'kept' })
  })

  it('reads the remembered choice of a newly bound node', async () => {
    restart('node-b').choose({ kind: 'temp' })
    const panel = restart('node-a')
    projectsLoaded(project('p1', '2026-10-01T00:00:00.000Z'))
    expect(panel.choice).toEqual({ kind: 'project', projectId: 'p1' })
    useWindowNodeContextStore().nodeId = 'node-b'
    await nextTick()
    expect(panel.choice).toEqual({ kind: 'temp' })
  })

  it('is empty only with no Projects and a loaded, empty Temp tasks list', () => {
    const panel = restart()
    projectsLoaded()
    expect(panel.isEmpty).toBe(false) // Temp tasks not loaded yet
    useProjectTaskStore().listsByProjectId = { [TEMP_TASKS_LIST_ID]: { status: 'ready', tasks: [], hasLoaded: true, initialPending: false, refreshPending: false, error: null } }
    expect(panel.isEmpty).toBe(true)
    projectsLoaded(project('p1', '2026-10-01T00:00:00.000Z'))
    expect(panel.isEmpty).toBe(false)
  })

  it('ignores an unreadable stored value', () => {
    window.localStorage.setItem(`${PROJECTS_PANEL_STORAGE_PREFIX}node-a`, '{not json')
    const panel = restart()
    projectsLoaded()
    expect(panel.choice).toEqual({ kind: 'temp' })
  })
})
