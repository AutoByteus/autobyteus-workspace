import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'

const { gate } = vi.hoisted(() => ({ gate: { projects: true } }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: vi.fn(), mutate: vi.fn() }) }))
vi.mock('~/utils/mobileFeatureGates', () => ({ isFeatureAvailableInRuntime: (feature: string) => feature !== 'projects' || gate.projects }))

import { taskWorkerRefOf, useTaskWorkerTasks } from '../useTaskWorkerTasks'
import { useTaskWorkerTaskStore } from '~/stores/taskWorkerTaskStore'
import { useTaskLocatorStore } from '~/stores/taskLocatorStore'
import type { RunHistoryTeamExecutionRow, RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import type { TaskWorkerTask } from '~/types/project'

const transient = (transientKind: RunHistoryTransientExecutionRow['transientKind'], ids: { agentRunId?: string; teamRunIdForNode?: string }): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution', transientKind, teamRunId: 'host', memberAddress: '/x', agentRunId: ids.agentRunId ?? null,
  teamRunIdForNode: ids.teamRunIdForNode ?? null, rowKey: `${transientKind}:${ids.agentRunId ?? ids.teamRunIdForNode}`, memberKind: 'agent',
  displayName: 'copy', depth: 1, hasChildren: false, currentStatus: null, delegatedBy: null,
})
const agentRow = transient('task_agent', { agentRunId: 'a1' })
const teamRow = transient('task_team', { teamRunIdForNode: 't1', agentRunId: 'lead' })
const memberRow = transient('task_team_child', { agentRunId: 'm1' })
const task: TaskWorkerTask = { taskId: 'task-1', projectId: null, description: 'Ship it', status: 'TODO' }

const host = (rows: () => readonly RunHistoryTeamExecutionRow[]) => {
  let api!: ReturnType<typeof useTaskWorkerTasks>
  const wrapper = mount(defineComponent({ setup() { api = useTaskWorkerTasks(rows); return () => h('div') } }))
  return { wrapper, api: () => api }
}

describe('useTaskWorkerTasks (delegated-copy-task-locator)', () => {
  beforeEach(() => { setActivePinia(createPinia()); gate.projects = true })

  it('maps only task Agent and task Team rows to Task workers', () => {
    expect(taskWorkerRefOf(agentRow)).toEqual({ kind: 'agent', agentRunId: 'a1' })
    expect(taskWorkerRefOf(teamRow)).toEqual({ kind: 'team', teamRunId: 't1' })
    expect(taskWorkerRefOf(memberRow)).toBeNull()
    expect(taskWorkerRefOf(transient('task_agent', {}))).toBeNull()
  })

  it('keeps interest in the listed workers, follows the list and releases it on unmount', () => {
    const store = useTaskWorkerTaskStore()
    const releases: ReturnType<typeof vi.fn>[] = []
    const retain = vi.spyOn(store, 'retain').mockImplementation(() => { const release = vi.fn(); releases.push(release); return release })
    const rows = ref<RunHistoryTeamExecutionRow[]>([agentRow, memberRow])
    const { wrapper } = host(() => rows.value)
    expect(retain).toHaveBeenLastCalledWith([{ kind: 'agent', agentRunId: 'a1' }])

    rows.value = [memberRow, agentRow]
    return Promise.resolve().then(() => {
      expect(retain).toHaveBeenCalledTimes(1) // same workers: no new interest
      rows.value = [agentRow, teamRow]
    }).then(() => new Promise((resolve) => setTimeout(resolve, 0))).then(() => {
      expect(retain).toHaveBeenLastCalledWith([{ kind: 'agent', agentRunId: 'a1' }, { kind: 'team', teamRunId: 't1' }])
      expect(releases[0]).toHaveBeenCalledOnce()
      wrapper.unmount()
      expect(releases[1]).toHaveBeenCalledOnce()
    })
  })

  it('answers a row\'s Task (null until known) and locates through the locator store', () => {
    const store = useTaskWorkerTaskStore()
    vi.spyOn(store, 'retain').mockReturnValue(() => undefined)
    vi.spyOn(store, 'taskOf').mockImplementation((worker) => worker.kind === 'agent' ? task : undefined)
    const locate = vi.spyOn(useTaskLocatorStore(), 'locate').mockImplementation(() => undefined)
    const { api } = host(() => [agentRow, teamRow, memberRow])
    expect(api().taskOf(agentRow)).toEqual(task)
    expect(api().taskOf(teamRow)).toBeNull()
    expect(api().taskOf(memberRow)).toBeNull()
    const openRun = vi.fn()
    api().locate(task, openRun)
    expect(locate).toHaveBeenCalledWith(task, openRun)
  })

  it('shows no summaries and reads nothing where the Projects tab is not available (mobile)', () => {
    gate.projects = false
    const store = useTaskWorkerTaskStore()
    const retain = vi.spyOn(store, 'retain')
    vi.spyOn(store, 'taskOf').mockReturnValue(task)
    const { api } = host(() => [agentRow])
    expect(retain).not.toHaveBeenCalled()
    expect(api().taskOf(agentRow)).toBeNull()
  })
})
