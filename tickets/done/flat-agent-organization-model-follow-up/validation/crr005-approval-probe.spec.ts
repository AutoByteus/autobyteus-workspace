import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { TeamStreamingService } from '~/services/agentStreaming/TeamStreamingService'
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { ensureAuthoritativeTeamMemberProjection } from '~/services/runHydration/teamMemberProjectionHydrationService'
const io = vi.hoisted(() => ({ projection: vi.fn() }))
vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({ fetchExactTeamMemberProjection: io.projection }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn(), refreshRunNavigationTopology: vi.fn(), reconcileFocusedTeamMemberProjection: vi.fn() }) }))
const ROOT='probe-team', TASK='probe-task', INV='probe-invocation'
beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
it.each(['before', 'after'])('diagnostic: approval arriving %s first task hydration', async (order) => {
  const callbacks = new Map<string, (value: any) => void>()
  const ws = { state:'connected', connect:vi.fn(), disconnect:vi.fn(), send:vi.fn(), on:vi.fn((name,cb)=>callbacks.set(name,cb)), off:vi.fn() } as any
  const raw = buildTestTeamContext({ teamRunId:ROOT, coordinatorAddress:'/lead', focusedAgentRunId:'lead-run',
    rootChildren:[testAgentNode('/lead',{agentRunId:'lead-run'}),testAgentNode('/worker',{agentRunId:'worker-run'})],
    tasks:[testTaskRecord({taskId:'task-1',delegatorAgentRunId:'lead-run',recipientAddress:'/worker',target:{agentRunId:TASK}})] })
  useAgentTeamContextsStore().teams=new Map([[ROOT,raw]])
  const team=useAgentTeamContextsStore().getTeamContextById(ROOT)!
  const stream=new TeamStreamingService('ws://example.test/team',{wsClient:ws})
  const emit=(message:unknown)=>callbacks.get('onMessage')!(JSON.stringify(message))
  stream.connect(ROOT,team)
  emit({type:'CONNECTED',payload:{session_id:'session',root_team_run_id:ROOT}})
  emit({type:'TEAM_EXECUTION_VIEW_SNAPSHOT',payload:{root_team_run_id:ROOT,base_change_sequence:0,
    execution_tree:team.view.getExecutionTree(),tasks:team.view.listTaskHistoryRows().map(x=>x.task),messages:[],
    agent_statuses:team.view.listAgentContextEntries().map(x=>({agent_run_id:x.agentRunId,member_address:x.memberAddress,status:'idle',trigger:null,tool_name:null,error_message:null,error_details:null}))}})
  const context=team.view.getAgentContext(TASK)!
  const segments=()=>context.conversation.messages.flatMap((m:any)=>m.segments??[]).filter((s:any)=>s.invocationId===INV)
  const activity=()=>useAgentActivityStore().getActivities(TASK).find((x:any)=>x.invocationId===INV) as any
  const approval=()=>emit({type:'TOOL_APPROVAL_REQUESTED',payload:{change_sequence:1,agent_run_id:TASK,invocation_id:INV,tool_name:'submit_task_result',turn_id:'turn',arguments:{message:'APPROVAL-REPRO-R2'}}})
  io.projection.mockResolvedValue({agentRunId:TASK,conversation:[{kind:'tool_call_pending',invocationId:INV,toolName:'submit_task_result',toolArgs:{message:'APPROVAL-REPRO-R2'},ts:1700000000}],
    activities:[{kind:'tool',invocationId:INV,toolName:'submit_task_result',status:'parsed',arguments:{message:'APPROVAL-REPRO-R2'},ts:1700000000}],hasEarlierActiveTraceEvents:false})
  if(order==='before') {
    approval()
    expect(segments()[0]?.status).toBe('awaiting-approval')
    expect(activity()?.status).toBe('awaiting-approval')
  }
  await ensureAuthoritativeTeamMemberProjection({team,agentRunId:TASK})
  team.view.focusAgentForInspection(TASK)
  if(order==='after') approval()
  expect(team.view.getAgentContext(TASK)).toBe(context)
  const expected=order==='before'?'parsed':'awaiting-approval'
  expect(segments()[0]?.status).toBe(expected)
  expect(activity()?.status).toBe(expected)
  console.log(JSON.stringify({order,conversationStatus:segments()[0]?.status,activityStatus:activity()?.status,approvalTarget:segments()[0]?.approvalTarget??null,sameContext:team.view.getAgentContext(TASK)===context,streamReady:stream.isReady}))
  stream.disconnect()
})
