import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { agentRow, peerAgentRow, peerTeamRows, seedPeerRows } from '~/test-support/runTreeFixtures'

/**
 * autobyteus-461 SR-069 (CR-461-035, CR-461-099): a run on another node takes no `@`, as at base `827f1e68dc` (recorded
 * there, `IMP-53`; autobyteus-278 REQ-808). The composer of a peer row has no mention scope, so the web never sends
 * mentions for it; the server refuses any that arrive (`REMOTE_RUN_MENTIONS_UNSUPPORTED`). Whether the run is a peer's
 * is its tree row's (`peer`, `openTarget.nodeId`).
 */
const active = vi.hoisted(() => ({ runId: 'peer-agent-run' }))
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({
  get activeWorkspaceTarget() {
    return { kind: 'agent_run_task_agent', access: 'live', viewRun: { runId: 'host-run' }, context: { state: { runId: active.runId } }, browse: { kind: 'run', runId: active.runId } }
  },
  send: vi.fn(), interruptGeneration: vi.fn(),
}) }))
vi.mock('~/composables/agentInput/runMentionScope', () => ({ resolveRunMentionScope: () => ({ kind: 'local-scope' }) }))

import { useComposerTarget } from '../useComposerTarget'

describe('the composer of a run on another node (SR-069)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    seedPeerRows(useRunTreeStore(), 'host-run', [peerAgentRow('peer-agent-run', 'agent:host-run'), agentRow('local-run', 'agent:host-run', 1),
      ...peerTeamRows('peer-team', 'agent:host-run', [{ agentRunId: 'peer-lead', address: '/studio_team/lead' }, { agentRunId: 'peer-mate', address: '/studio_team/mate' }])])
  })

  it.each(['peer-agent-run', 'peer-lead', 'peer-mate'])('a peer row (%s) has no mention scope, as at base', (runId) => {
    active.runId = runId
    expect(useComposerTarget().value?.mentionScope).toBeNull()
  })

  it('a run on this node has one', () => {
    active.runId = 'local-run'
    expect(useComposerTarget().value?.mentionScope).toEqual({ kind: 'local-scope' })
  })
})
