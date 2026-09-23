import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { stageAgentOrgExecutionContext } from '../agentOrgContextHydration'
import { taskBearingView } from './taskBearingOrgFixture'

const io = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))

vi.mock('~/services/agentOrgExecution/agentOrgReferenceProjection', () => ({
  loadAgentOrgImmediateReferenceProjection: vi.fn().mockResolvedValue({ agents: {}, teams: {} }),
}))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyAgentOrgActivity: vi.fn() }) }))

const configuredAgents = (tree: ReturnType<typeof taskBearingView>['execution_tree']) => tree.rootOrg.members.flatMap(member =>
  'agentRunId' in member ? [member] : [...member.members])
const inactiveView = () => {
  const view = taskBearingView()
  view.is_active = false
  return view
}

describe('AgentOrg whole model-only canonical adoption', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    io.query.mockImplementation(async ({ variables }: any) => ({ data: { getAgentOrgMemberRunProjection: {
      ...variables, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
    } } }))
  })

  it('stages the entire tree before one in-place publication and preserves retained conversation/state objects', async () => {
    const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view: inactiveView() })
    const org = staged.context
    const retained = org.listAgentContextEntries().map(entry => ({ entry,
      state: entry.context.state, conversation: entry.context.conversation, messages: entry.context.conversation.messages,
      files: entry.context.contextFilePaths }))
    const next = JSON.parse(JSON.stringify(org.executionTree))
    next.rootOrg.defaultLaunchConfiguration.llmModelIdentifier = 'root-next'
    next.rootOrg.defaultLaunchConfiguration.llmConfig = { effort: 'high' }
    const expectedByRunId = new Map<string, string>()
    for (const [index, agent] of configuredAgents(next).entries()) {
      agent.launchConfiguration.llmModelIdentifier = `agent-next-${index}`
      agent.launchConfiguration.llmConfig = index ? null : { budget: 0, enabled: false }
      expectedByRunId.set(agent.agentRunId, `agent-next-${index}`)
    }
    const mounted = next.rootOrg.members.find(member => 'teamRunId' in member)
    if (mounted && 'teamRunId' in mounted) {
      mounted.defaultLaunchConfiguration.llmModelIdentifier = 'team-next'
      mounted.defaultLaunchConfiguration.llmConfig = null
    }
    expect(org.applyRunConfig(next, false)).toBe(true)
    for (const item of retained) {
      expect(item.entry.context.state).toBe(item.state)
      expect(item.entry.context.conversation).toBe(item.conversation)
      expect(item.entry.context.conversation.messages).toBe(item.messages)
      expect(item.entry.context.contextFilePaths).toBe(item.files)
      const configured = org.index.agents.get(item.entry.agentRunId)
      if (configured?.kind === 'configured') expect(item.entry.context.config.llmModelIdentifier).toBe(expectedByRunId.get(item.entry.agentRunId))
    }
  })

  it('rejects topology, task, handoff, binding, archive and locked-field drift without partial publication', async () => {
    const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view: inactiveView() })
    const org = staged.context
    for (const mutate of [
      (tree: any) => { tree.archivedAt = '2026-09-17T00:00:00Z' },
      (tree: any) => { tree.applicationBinding = { applicationId: 'app', bindingId: 'binding' } },
      (tree: any) => { tree.handoffs.push({ from: '/director', to: '/team/lead', description: 'changed' }) },
      (tree: any) => { tree.rootOrg.taskExecutions = [] },
      (tree: any) => { tree.rootOrg.members[0].launchConfiguration.workspaceRootPath = '/other' },
    ]) {
      const view = org.view, index = org.index, next = JSON.parse(JSON.stringify(org.executionTree))
      mutate(next)
      expect(() => org.applyRunConfig(next, false)).toThrow('locked fields')
      expect(org.view).toBe(view); expect(org.index).toBe(index)
    }
  })
})
