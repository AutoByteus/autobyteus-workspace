import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkspaceTransientExecutionRow from '../WorkspaceTransientExecutionRow.vue'
import { useDelegatedLaunchDraftStore } from '~/stores/delegatedLaunchDraftStore'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'

const liveness = vi.hoisted(() => ({ live: new Set<string>() }))
const client = vi.hoisted(() => ({ stopDelegatedExecution: vi.fn() }))
vi.mock('~/services/runConfigEditing/delegatedCopyLiveness', () => ({
  isDelegatedCopyLive: (_root: unknown, reference: { agentRunId?: string; teamRunId?: string }) =>
    liveness.live.has(reference.agentRunId ?? reference.teamRunId ?? ''),
}))
vi.mock('~/services/runConfigEditing/delegatedLaunchSelectionClient', async (importOriginal) => ({
  ...(await importOriginal<object>()), ...client,
}))
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

/** BEH-001..003: shared sidebar Stop styling and preserved per-copy interaction. CSS rendering is checked separately. */
const root = { rootKind: 'AGENT_TEAM' as const, rootRunId: 'root' }
const row = (overrides: Partial<RunHistoryTransientExecutionRow> = {}): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution', transientKind: 'task_agent', rowKey: 'agent:worker-run', teamRunId: 'root',
  memberAddress: '/writer', agentRunId: 'worker-run', teamRunIdForNode: null, memberKind: 'agent',
  displayName: 'writer', currentStatus: AgentStatus.Running, delegatedBy: 'pm', depth: 0, hasChildren: false, ...overrides,
})
const copies = [
  { kind: 'Agent', id: 'worker-run', reference: { agentRunId: 'worker-run' }, row: row() },
  { kind: 'Team', id: 'review-team', reference: { teamRunId: 'review-team' }, row: row({
    transientKind: 'task_team', agentRunId: null, teamRunIdForNode: 'review-team', memberKind: 'agent_team',
    rowKey: 'team:review-team', displayName: 'reviewers',
  }) },
]
const stopSelector = '[data-test="workspace-delegated-stop"]'

beforeEach(() => {
  setActivePinia(createPinia())
  liveness.live.clear()
  client.stopDelegatedExecution.mockReset()
})

describe.each(copies)('sidebar $kind copy Stop', (copy) => {
  it.each([false, true])('matches normal run color tokens, retaining focus and semantics (selected=%s)', (isSelected) => {
    liveness.live.add(copy.id)
    const wrapper = mount(WorkspaceTransientExecutionRow, { props: { row: copy.row, stopRoot: root, isSelected } })
    const button = wrapper.get(stopSelector)
    expect(button.classes()).toEqual(expect.arrayContaining([
      'text-gray-400', 'transition-colors', 'hover:bg-red-50', 'hover:text-red-600',
      'focus:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-red-500/40',
      'disabled:cursor-default', 'disabled:opacity-60',
    ]))
    expect(button.classes()).not.toContain('text-red-500')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('title')).toBe(`Stop ${copy.row.displayName}`)
    expect(button.attributes('aria-label')).toBe(button.attributes('title'))
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.get('[data-icon="heroicons:stop-20-solid"]').attributes('aria-hidden')).toBe('true')
  })

  it('stops exactly this copy without selecting or toggling its row; activation keys are contained', async () => {
    liveness.live.add(copy.id)
    const stop = vi.spyOn(useDelegatedLaunchDraftStore(), 'stop').mockResolvedValue(true)
    const wrapper = mount(WorkspaceTransientExecutionRow, { props: { row: copy.row, stopRoot: root, hasChildren: true } })
    const button = wrapper.get(stopSelector)
    await button.trigger('keydown', { key: 'Enter' })
    await button.trigger('keydown', { key: ' ' })
    // happy-dom does not synthesize native keyboard clicks; the browser check covers that activation.
    await button.trigger('click')
    expect(stop).toHaveBeenCalledExactlyOnceWith(root, copy.reference)
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })

  it('keeps pending visible, disabled and pulsing, prevents duplicate stops, then hides the stopped copy', async () => {
    liveness.live.add(copy.id)
    let finish!: (value: unknown) => void
    client.stopDelegatedExecution.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const wrapper = mount(WorkspaceTransientExecutionRow, { props: { row: copy.row, stopRoot: root } })
    const button = wrapper.get(stopSelector)
    await button.trigger('click')
    liveness.live.delete(copy.id)
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-label')).toBe(`Stopping ${copy.row.displayName}…`)
    expect(button.attributes('title')).toBe(button.attributes('aria-label'))
    expect(button.get('[data-icon="heroicons:stop-20-solid"]').classes()).toEqual(expect.arrayContaining([
      'animate-pulse', 'motion-reduce:animate-none',
    ]))
    await button.trigger('click')
    // The store also rejects a duplicate from another surface while this request is in flight.
    await expect(useDelegatedLaunchDraftStore().stop(root, copy.reference)).resolves.toBe(false)
    expect(client.stopDelegatedExecution).toHaveBeenCalledExactlyOnceWith(root, copy.reference)
    finish({ success: true, outcome: 'STOPPED', message: 'Stopped.', notStoppedUnattributed: 0 })
    await flushPromises()
    expect(wrapper.find(stopSelector).exists()).toBe(false)
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })

  it('does not offer Stop without a live copy or a root', () => {
    const stopped = mount(WorkspaceTransientExecutionRow, { props: { row: copy.row, stopRoot: root } })
    expect(stopped.find(stopSelector).exists()).toBe(false)
    liveness.live.add(copy.id)
    const noRoot = mount(WorkspaceTransientExecutionRow, { props: { row: copy.row } })
    expect(noRoot.find(stopSelector).exists()).toBe(false)
  })
})

describe('Team copy member rows', () => {
  it('never offers an individual member Stop in place of the whole Team', () => {
    liveness.live.add('member-run')
    const member = mount(WorkspaceTransientExecutionRow, { props: { stopRoot: root,
      row: row({ transientKind: 'task_team_child', agentRunId: 'member-run' }),
    } })
    expect(member.find(stopSelector).exists()).toBe(false)
  })
})
