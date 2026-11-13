import { describe, expect, it, vi } from 'vitest'

/**
 * autobyteus-461 SR-069 (CR-461-035): a run on another node takes no `@`, as at base `827f1e68dc` (recorded there,
 * `IMP-53`; autobyteus-278 REQ-808). The composer of a peer row has no mention scope, so the web never sends mentions
 * for it; the server refuses any that arrive (`REMOTE_RUN_MENTIONS_UNSUPPORTED`).
 */
const state = vi.hoisted(() => ({ remote: false }))
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({
  // A delegated row in an agent run's view (a peer's, when remoteRuns knows it).
  activeWorkspaceTarget: { kind: 'agent_run_task_agent', access: 'live', host: { hostRunId: 'host-run' }, context: { state: { runId: 'peer-agent-run' } } },
  send: vi.fn(), interruptGeneration: vi.fn(),
}) }))
vi.mock('~/stores/remoteRunsStore', () => ({ useRemoteRunsStore: () => ({ runOfAgentRun: () => (state.remote ? { nodeId: 'node-b' } : null) }) }))
vi.mock('~/composables/agentInput/runMentionScope', () => ({ resolveRunMentionScope: () => ({ kind: 'local-scope' }) }))

import { useComposerTarget } from '../useComposerTarget'

describe('the composer of a run on another node (SR-069)', () => {
  it('has no mention scope, as at base; a run on this node has one', () => {
    state.remote = true
    expect(useComposerTarget().value?.mentionScope).toBeNull()
    state.remote = false
    expect(useComposerTarget().value?.mentionScope).toEqual({ kind: 'local-scope' })
  })
})
