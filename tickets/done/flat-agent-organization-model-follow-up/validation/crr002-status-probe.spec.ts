// Temporary failure-origin probe, not a durable product regression.
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, shallowReactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi } from 'vitest'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
const mocks = vi.hoisted(() => ({ streams: [] as any[] }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: async ({variables}: any) => variables.agentRunId
  ? {data: {getAgentOrgMemberRunProjection: {...variables, conversation: [], activities: [], hasEarlierActiveTraceEvents: false}}}
  : {data: {getAgentOrgRunInspection: {schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: taskBearingView()}}}
}) }))
vi.mock('~/services/agentOrgExecution/agentOrgStreamingService', () => ({ AgentOrgStreamingService: class {
 constructor(public options: any) { mocks.streams.push(this) }
 connect() {} disconnect() {} isReady() { return true }
} }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyAgentOrgActivity: vi.fn(), refreshAgentOrgHistory: vi.fn() }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({useAgentDefinitionStore: () => ({getAgentDefinitionById: () => null})}))
import {useAgentOrgContextsStore} from '~/stores/agentOrgContextsStore'
import {stageAgentOrgExecutionContext} from '~/services/agentOrgExecution/agentOrgContextHydration'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'

describe('CRR002 focused status propagation', () => {
 it.each(['inactive-event','historical-snapshot'] as const)('%s preserves mounted header observability', async mode => {
 setActivePinia(createPinia()); mocks.streams.length=0
 const store=useAgentOrgContextsStore(); await store.openForInspection('org-run')
 store.contextFor('org-run')!.phase='live'; store.select('org-run','/team/worker')
 const target=computed(() => store.activeTargetFor('org-run')!)
 const component=defineComponent({ setup: () => () => h(TeamWorkspaceSurface,{target:target.value as any}) })
 const wrapper=mount(component,{global:{stubs:{AgentEventMonitor:true,SkillImprovementComposerCta:true,WorkspaceHeaderActions:true}}})
 expect(wrapper.text()).toContain('Idle')
 const previous=target.value.context
 if(mode==='historical-snapshot') {
  const view=taskBearingView(); view.is_active=false; view.agent_statuses=[]
  const staged=await stageAgentOrgExecutionContext({source:'stream',orgRunId:'org-run',view})
  mocks.streams[0].options.publish(shallowReactive(staged.context),staged.commitActivities)
 }
 mocks.streams[0].options.onInactive()
 await nextTick()
 console.log(JSON.stringify({mode,model:store.contextFor('org-run')!.getAgentContext(previous.state.runId)!.state.currentStatus,target:target.value.context.state.currentStatus,same:target.value.context===previous,dom:wrapper.text()}))
 expect(wrapper.text()).toContain('Offline'); expect(wrapper.text()).not.toContain('Idle')
 wrapper.unmount()
 })
})
