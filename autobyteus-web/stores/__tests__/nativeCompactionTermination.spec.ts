import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import { useAgentTeamContextsStore } from '../agentTeamContextsStore';
import { useAgentTeamRunStore } from '../agentTeamRunStore';
import { useAgentContextsStore } from '../agentContextsStore';
import { useAgentRunStore } from '../agentRunStore';
import { useAgentActivityStore } from '../agentActivityStore';
import { handleCompactionStatus } from '~/services/agentStreaming/handlers/agentStatusHandler';
import type { AgentContext } from '~/types/agent/AgentContext';
const io = vi.hoisted(() => ({ mutate: vi.fn(), bindingRevision: 1, inactive: vi.fn(), teamInactive: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ mutate: io.mutate, query: vi.fn() }) }));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ bindingRevision:io.bindingRevision, getBoundEndpoints: () => ({agentWs:'ws://fixture.invalid',teamWs:'ws://fixture.invalid'}) }) }));
vi.mock('~/stores/runHistoryStore', () => ({useRunHistoryStore:()=>({ markRunAsInactive:io.inactive,markTeamAsInactive:io.teamInactive,refreshTreeQuietly:vi.fn() })}));
vi.mock('~/services/agentStreaming', async original => {
  const actual = await original<any>();
  class Stream { connectionState='connected'; connect=vi.fn(); disconnect=vi.fn(); attachContext=vi.fn(); constructor(..._args: any[]) {} }
  return {...actual, AgentStreamingService:Stream,TeamStreamingService:Stream};
});
const ROOT='native-team';
beforeEach(()=>{setActivePinia(createPinia());vi.clearAllMocks();io.bindingRevision=1;});
afterEach(()=>{useAgentRunStore().disconnectAgentStream('lead');useAgentTeamRunStore().disconnectTeamStream(ROOT);});
const seed = (context:AgentContext,id='op',phase:'requested'|'started'|'completed'|'failed'='started') => {
  handleCompactionStatus({ phase, compaction_operation_id:id,turn_id:'turn-7',requested_turn_id:'turn-6',execution_turn_id:'turn-7',raw_trace_count:12,compaction_model_identifier:'native-model' },context);
};
const setup=()=>{
  const raw=buildTestTeamContext({teamRunId:ROOT,coordinatorAddress:'/lead',delegations:[{delegatorAgentRunId:'lead',recipientAddress:'/worker',target:{agentRunId:'task-before'}}],rootChildren:['lead','worker','external','empty'].map(id=>testAgentNode(`/${id}`,{agentRunId:id,runtimeKind:id==='external'?'codex_app_server':'autobyteus'}))});
  useAgentTeamContextsStore().teams=new Map([[ROOT,raw]]);
  const team=useAgentTeamContextsStore().getTeamContextById(ROOT)!;
  const context=team.view.getAgentContext('lead')!;
  useAgentContextsStore().runs=new Map([['lead',context]]);
  const lead=useAgentContextsStore().getRun('lead')!;
  lead.state.inputProjection={runInstanceId:'runtime-A',revision:1};
  seed(lead);seed(team.view.getAgentContext('task-before')!,'retained-task');seed(team.view.getAgentContext('worker')!,'worker');seed(team.view.getAgentContext('external')!,'external');
  return {team,lead,activities:useAgentActivityStore()};
};
const response=(kind:'agent'|'team',success=true)=>({data:{[kind==='agent'?'terminateAgentRun':'terminateAgentTeamRun']:{success}}});
const deferred=()=>{let resolve!:(v:any)=>void;io.mutate.mockImplementation(()=>new Promise(done=>{resolve=done}));return(v:any)=>resolve(v);};
it.each(['agent','team'] as const)('%s success before final event settles exact native cards before disconnect/history',async kind=>{
  const {team,lead,activities}=setup();const store=kind==='agent'?useAgentRunStore():useAgentTeamRunStore();
  const service=kind==='agent'?useAgentRunStore().connectToAgentStream('lead')!:useAgentTeamRunStore().connectToTeamStream(ROOT)!;
  vi.spyOn(service,'disconnect').mockImplementation(()=>expect(activities.getCompactionActivities('lead')[0].phase).toBe('stopped'));
  io.mutate.mockResolvedValue(response(kind));
  expect(await (kind==='agent'?(store as ReturnType<typeof useAgentRunStore>).terminateRun('lead'):(store as ReturnType<typeof useAgentTeamRunStore>).terminateTeamRun(ROOT))).toBe(true);
  expect(lead.state.compactionStatus).toMatchObject({phase:'stopped',message:'Stopped',rawTraceCount:12});
  expect(lead.state.currentStatus).toBe('offline');
  expect(activities.getCompactionActivities('external')[0].phase).toBe('started');expect(activities.getActivities('empty')).toEqual([]);
  expect(activities.getCompactionActivities('worker')[0].phase).toBe(kind==='team'?'stopped':'started');
  expect(activities.getCompactionActivities('task-before')[0].phase).toBe(kind==='team'?'stopped':'started');
  expect(team.view.isRootTeamActive()).toBe(kind!=='team');
});
it.each(['completed','failed'] as const)('event %s before response keeps real result while newly observed pending operation is settled',async phase=>{
  const {lead,activities}=setup();const finish=deferred();const pending=useAgentRunStore().terminateRun('lead');
  seed(lead,'op',phase);seed(lead,'late');lead.state.inputProjection=null;
  finish(response('agent'));expect(await pending).toBe(true);
  expect(activities.getCompactionActivities('lead').map(a=>a.phase)).toEqual([phase,'stopped']);
});
it.each(['agent','team'] as const)('%s rejection/partial failure does not confer stopped or teardown',async kind=>{
  const {lead,activities}=setup();io.mutate.mockResolvedValue(response(kind,false));
  expect(await(kind==='agent'?useAgentRunStore().terminateRun('lead'):useAgentTeamRunStore().terminateTeamRun(ROOT))).toBe(false);
  expect(activities.getCompactionActivities('lead')[0].phase).toBe('started');expect(lead.state.currentStatus).toBe('idle');
  expect(io.inactive).not.toHaveBeenCalled();expect(io.teamInactive).not.toHaveBeenCalled();
});
it.each(['binding','state','instance','context','transport'] as const)('standalone stale %s success cannot settle or tear down a replacement',async change=>{
  const {lead,activities}=setup();useAgentRunStore().connectToAgentStream('lead');const finish=deferred();const pending=useAgentRunStore().terminateRun('lead');
  if(change==='binding')io.bindingRevision++;
  if(change==='state')lead.state=Object.assign(Object.create(Object.getPrototypeOf(lead.state)),lead.state);
  if(change==='instance')lead.state.inputProjection={runInstanceId:'runtime-B',revision:1};
  if(change==='context')useAgentContextsStore().runs=new Map([['lead',Object.assign(Object.create(Object.getPrototypeOf(lead)),lead)]]);
  if(change==='transport'){useAgentRunStore().disconnectAgentStream('lead');useAgentRunStore().connectToAgentStream('lead');}
  finish(response('agent'));expect(await pending).toBe(false);
  expect(activities.getCompactionActivities('lead')[0].phase).toBe('started');expect(io.inactive).not.toHaveBeenCalled();
});
it.each(['binding','member-state','member-instance','root','transport'] as const)('Team stale %s success cannot mutate any member or root',async change=>{
  const {team,lead,activities}=setup();useAgentTeamRunStore().connectToTeamStream(ROOT);const finish=deferred();const pending=useAgentTeamRunStore().terminateTeamRun(ROOT);
  if(change==='binding')io.bindingRevision++;
  if(change==='member-state')lead.state=Object.assign(Object.create(Object.getPrototypeOf(lead.state)),lead.state);
  if(change==='member-instance')lead.state.inputProjection={runInstanceId:'runtime-B',revision:1};
  if(change==='root')useAgentTeamContextsStore().teams=new Map([[ROOT,{...team}]]);
  if(change==='transport'){useAgentTeamRunStore().disconnectTeamStream(ROOT);useAgentTeamRunStore().connectToTeamStream(ROOT);}
  finish(response('team'));expect(await pending).toBe(false);
  expect(activities.getCompactionActivities('lead')[0].phase).toBe('started');expect(activities.getCompactionActivities('worker')[0].phase).toBe('started');
  expect(team.view.isRootTeamActive()).toBe(true);expect(io.teamInactive).not.toHaveBeenCalled();
});

it('Team includes a newly published native task member from the same root/service while Stop is pending',async()=>{
  const {team,activities}=setup();const finish=deferred();const pending=useAgentTeamRunStore().terminateTeamRun(ROOT);
  expect(team.view.applyMessage({type:'TASK_EXECUTION_STARTED',payload:{change_sequence:1,parent_team_run_id:ROOT,
    execution:{kind:'task_agent',address:'/worker',agent_run_id:'task-during',platform_agent_run_id:null,delegator_agent_run_id:'lead',started_at:'2026-10-01T00:00:00Z'}}})).toMatchObject({disposition:'applied'});
  const task=team.view.getAgentContext('task-during')!;seed(task,'during-request');
  finish(response('team'));expect(await pending).toBe(true);
  expect(activities.getCompactionActivities('task-during')[0].phase).toBe('stopped');expect(task.state.currentStatus).toBe('offline');
});
