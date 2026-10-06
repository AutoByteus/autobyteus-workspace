import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  terminateRun: vi.fn(),
  terminateTeamRun: vi.fn(),
  execute: vi.fn(),
}))
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key }) }))
vi.mock('~/stores/agentRunStore', () => ({ useAgentRunStore: () => ({ terminateRun: mocks.terminateRun }) }))
vi.mock('~/stores/agentTeamRunStore', () => ({ useAgentTeamRunStore: () => ({ terminateTeamRun: mocks.terminateTeamRun }) }))
vi.mock('~/composables/useWorkspaceHistorySubjectActions', () => ({ useWorkspaceHistorySubjectActions: () => ({ execute: mocks.execute }) }))

import { useRunStopAction, type RunStopSubject } from '../useRunStopAction'

describe('useRunStopAction (REQ-014, DEC-003)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the tree’s action and wording per run type, then re-reads the run', async () => {
    const onStopped = vi.fn()
    const subject = ref<RunStopSubject | null>({ kind: 'agent', runId: 'run-1' })
    const stop = useRunStopAction(subject, { onStopped })
    expect(stop.label.value).toBe('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_run')
    mocks.terminateRun.mockResolvedValue(true)
    await stop.stop()
    expect(mocks.terminateRun).toHaveBeenCalledWith('run-1')
    expect(onStopped).toHaveBeenCalledTimes(1)

    subject.value = { kind: 'team', teamRunId: 'team-1' }
    expect(stop.label.value).toBe('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_team')
    mocks.terminateTeamRun.mockResolvedValue(true)
    await stop.stop()
    expect(mocks.terminateTeamRun).toHaveBeenCalledWith('team-1')

    subject.value = { kind: 'agent_org', orgRunId: 'org-run' }
    expect(stop.label.value).toBe('workspace.agentOrg.history.stopLabel')
    mocks.execute.mockResolvedValue({ disposition: 'committed' })
    await stop.stop()
    expect(mocks.execute).toHaveBeenCalledWith({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'stop' })
  })

  it('shows the pending verb while stopping and the failure copy when it does not stop', async () => {
    const onStopped = vi.fn()
    const stop = useRunStopAction(ref<RunStopSubject | null>({ kind: 'team', teamRunId: 'team-1' }), { onStopped })
    let finish!: (value: boolean) => void
    mocks.terminateTeamRun.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const pending = stop.stop()
    expect(stop.pending.value).toBe(true)
    expect(stop.label.value).toBe('runSettings.existing.terminating')
    finish(false)
    await pending
    expect(stop.pending.value).toBe(false)
    expect(stop.error.value).toBe('runSettings.existing.terminateFailed')
    expect(onStopped).not.toHaveBeenCalled()

    const org = useRunStopAction(ref<RunStopSubject | null>({ kind: 'agent_org', orgRunId: 'org-run' }))
    mocks.execute.mockRejectedValue(new Error('offline'))
    await org.stop()
    expect(org.error.value).toBe('runSettings.existing.stopOrgFailed')
  })
})
