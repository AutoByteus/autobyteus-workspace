import { describe, expect, it, vi, beforeEach } from 'vitest'
import { computed, effectScope, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'

/**
 * autobyteus-461 SR-083 (CR-461-079, CR-461-080; F-61, F-62): Settings' delegated rows are the run's view's rows, live or
 * stopped (a stored tree has none, E9), and each delegated run's liveness is its own status, not its delegator's.
 */
const mocks = vi.hoisted(() => ({ teamView: null as unknown, hold: vi.fn(() => () => undefined) }))
vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => ({
  getTeamContextById: () => (mocks.teamView ? { view: { getExecutionTree: () => mocks.teamView } } : null),
}) }))
vi.mock('~/stores/remoteRunsStore', () => ({ useRemoteRunsStore: () => ({ executionsDelegatedBy: () => [], withLaunches: (value: unknown) => value }) }))

import { useDelegatedRunRows } from '../useDelegatedRunRows'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { NO_CONTROL_FOR_TESTS } from './noControl'

const created = '2026-11-01T00:00:00.000Z'
const launch = { runtime_kind: 'codex_app_server' as const, llm_model_identifier: 'gpt', llm_config: null, auto_execute_tools: false, workspace_root_path: '/w' }
const tree = (withCopy: boolean): TeamRunExecutionTreeDto => ({ created_at: created, archived_at: null, application_binding: null, handoffs: [],
  root_team: { address: '/', team_definition_id: 'pm', team_definition_name: 'PM', team_run_id: 'team-1', coordinator_address: '/pm',
    default_launch_configuration: launch, members: [],
    task_executions: withCopy ? [{ kind: 'task_agent', address: '/writer', agent_run_id: 'copy', platform_agent_run_id: null, delegator_agent_run_id: 'pm-run',
      started_at: created, source: { kind: 'agent', agent_definition_id: 'writer', launch_configuration: launch } }] : [] } }) as TeamRunExecutionTreeDto

beforeEach(() => { setActivePinia(createPinia()); mocks.teamView = null })

describe('useDelegatedRunRows (SR-083)', () => {
  it('F-61: a stopped Team\'s rows come from its view, not its stored tree; F-62: a live copy of the stopped Team is live by its own status', () => {
    const runStatus = useRunStatusStore()
    const hold = vi.spyOn(runStatus, 'hold')
    // The stored tree has no rows (E9); the view has the copy.
    const draft = ref<unknown>({ kind: 'team', teamRunId: 'team-1', isActive: false, executionTree: tree(false) })
    mocks.teamView = tree(true)
    const live = (id: string) => rows.isAgentLive(id)
    const control = computed(() => ({ ...NO_CONTROL_FOR_TESTS, isAgentLive: live }))
    let rows!: ReturnType<typeof useDelegatedRunRows>
    const scope = effectScope()
    scope.run(() => { rows = useDelegatedRunRows({ draft: draft as never, control, schemaFor: () => null }) })
    expect(rows.rows.value.map((row) => row.key)).toEqual(['/writer@copy'])
    expect(hold).toHaveBeenLastCalledWith([{ kind: 'agent', runId: 'copy' }])
    expect(rows.rows.value[0]!.delegated?.running).toBe(false)
    runStatus.apply({ type: 'RUN_STATUS_SNAPSHOT', payload: { runs: [{ kind: 'agent', runId: 'copy', answer: 'ok', node: null, status: null, agents: [{ agentRunId: 'copy', status: 'idle' }] }] } })
    expect(rows.rows.value[0]!.delegated?.running).toBe(true)
    // Without the view, there are no rows: the stored tree is never read for them.
    mocks.teamView = null
    draft.value = { ...(draft.value as object), teamRunId: 'team-2' }
    expect(rows.rows.value).toEqual([])
    scope.stop()
  })
})
