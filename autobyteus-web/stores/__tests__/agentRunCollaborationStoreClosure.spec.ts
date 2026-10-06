import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const stream = vi.hoisted(() => ({ instances: [] as Array<{ options: any }> }))
const staged = vi.hoisted(() => ({ closed: [] as Array<{ agentRunId: string } | { teamRunId: string }> }))
vi.mock('~/services/agentCollaboration/agentRunCollaborationStreamingService', () => ({
  AgentRunCollaborationStreamingService: class {
    connect = vi.fn(); whenReady = vi.fn(async () => undefined); disconnect = vi.fn()
    constructor(public options: any) { stream.instances.push(this as never) }
  },
}))
vi.mock('~/services/agentCollaboration/agentRunCollaborationHydration', async () => {
  const { buildClosureContext, closureView } = await import('~/services/agentCollaboration/__tests__/agentRootClosureFixture')
  return {
    readAgentRunCollaboration: vi.fn(async () => ({})),
    stageAgentRunCollaborationContext: vi.fn(async () => ({ context: buildClosureContext(closureView(staged.closed)), commitActivities: () => undefined })),
  }
})
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn() }) }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'
import { buildClosureContext } from '~/services/agentCollaboration/__tests__/agentRootClosureFixture'

/** task-run-resources-workspace-cleanup REQ-009: a closed run cannot be selected; an open one returns to the host. */
describe('agentRunCollaborationStore with closed task executions', () => {
  beforeEach(() => { setActivePinia(createPinia()); stream.instances.length = 0; staged.closed = [] })

  it('a stored view never selects a closed run, and a reload clears a selection whose Task became DONE', async () => {
    staged.closed = [{ agentRunId: 'writer-run' }]
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    store.selectChild('host-run', 'writer-run')
    expect(store.selectedChild('host-run')).toBeNull()
    store.selectChild('host-run', 'helper-run')
    expect(store.selectedChild('host-run')).toBe('helper-run')
    staged.closed = [{ agentRunId: 'writer-run' }, { teamRunId: 'review-team' }]
    await store.inspect('host-run')
    expect(store.selectedChild('host-run')).toBeNull()
    expect(store.childTargetFor('host-run')).toBeNull()
  })

  it('a live closed event returns the open worker conversation to the run (host) without a reload', () => {
    const store = useAgentRunCollaborationStore()
    store.attach('host-run')
    const service = stream.instances[0]!
    const context = buildClosureContext()
    service.options.publish(context, () => undefined)
    store.selectChild('host-run', 'rb-run')
    expect(store.childTargetFor('host-run')?.address).toBe('/product_team/bootstrapper')
    context.applyEvent(5, { kind: 'task_executions_closed', task_executions: [{ agentRunId: 'other-task-run' }] })
    service.options.onTaskExecutionsClosed(context)
    expect(store.selectedChild('host-run')).toBe('rb-run')
    context.applyEvent(6, { kind: 'task_executions_closed', task_executions: [{ teamRunId: 'review-team' }] })
    service.options.onTaskExecutionsClosed(context)
    expect(store.selectedChild('host-run')).toBeNull()
    expect(store.taskRows('host-run').map((entry) => entry.row.rowKey)).not.toContain('agent:rb-run')
  })
})
