import { describe, expect, it } from 'vitest'
import { AgentOrgExecutionViewIndex } from '../agentOrgExecutionViewIndex'
import { taskBearingView } from './taskBearingOrgFixture'

type View = ReturnType<typeof taskBearingView>

const withRootTasks = (mutate: (task: View['execution_tree']['rootOrg']['taskExecutions'][number]) => object): View => {
  const view = structuredClone(taskBearingView())
  return {
    ...view,
    execution_tree: {
      ...view.execution_tree,
      rootOrg: { ...view.execution_tree.rootOrg, taskExecutions: view.execution_tree.rootOrg.taskExecutions.map(mutate) },
    },
  } as View
}

/** Old children (recorded before the delegator was stored) index as delegated executions without a starter. */
describe('AgentOrgExecutionViewIndex delegator binding', () => {
  it('keeps old children delegated with a null delegator', () => {
    const index = new AgentOrgExecutionViewIndex(withRootTasks(({ delegatorAgentRunId: _omit, ...task }) => task) as never)
    expect(index.requireAgent('agent-worker-task')).toMatchObject({
      kind: 'task', delegation: { executionRunId: 'agent-worker-task', delegatorAgentRunId: null },
    })
  })

  it('still rejects a recorded delegator outside the Org', () => {
    expect(() => new AgentOrgExecutionViewIndex(withRootTasks((task) => ({ ...task, delegatorAgentRunId: 'ghost-run' })) as never))
      .toThrow('delegator is not in this AgentOrg')
  })
})
