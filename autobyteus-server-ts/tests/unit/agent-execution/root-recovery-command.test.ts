import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";
import fs from 'node:fs';
import path from 'node:path';
import { describe,it,expect,vi } from 'vitest';
import { createRecoveryFixture,eventually,summary } from './recovery-native-fixture.js';
import { ConfiguredAgentExecutionHandle } from '../../../src/agent-collaboration/execution/backends/configured-agent-execution-handle.js';
import { createTeamRootExecutionIdentity,createAgentOrgRootExecutionIdentity,createCollaborationMemberExecutionIdentity,createRootExecutionPhysicalScope } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { MemberExecutionContext,MemberCollaborationContext } from '../../../src/agent-collaboration/execution/domain/member-execution-context.js';
import { AgentTeamStreamHandler } from '../../../src/services/agent-streaming/agent-team-stream-handler.js';
import { AgentOrgStreamHandler } from '../../../src/services/agent-streaming/agent-org-stream-handler.js';
import { AgentSessionManager } from '../../../src/services/agent-streaming/agent-session-manager.js';
import { RootEventPublisher } from '../../../src/agent-collaboration/execution/services/root-event-publisher.js';
import { testAgentOrgExecutionTree,testOrgAgentNode } from '../../fixtures/current-agent-org-run-fixtures.js';

// Real strict command decoding -> configured live handle -> AgentRun -> native core.
// Root package hosting is test-owned; this is not a full root/API acceptance campaign.
async function ingress(kind:'agent_team'|'agent_org', f:Awaited<ReturnType<typeof createRecoveryFixture>>) {
 const root=kind==='agent_team'?createTeamRootExecutionIdentity('team-run-root'):createAgentOrgRootExecutionIdentity('org-run-1');
 const identity=createCollaborationMemberExecutionIdentity({root,memberAddress:'/product_manager',agentRunId:f.run.runId});
 const memberExecutionContext=new MemberExecutionContext({identity,teamScoped:true,
  collaboration:new MemberCollaborationContext({deliverLogicalMessage:async()=>({accepted:true})}),
  tasks:{root,delegateToNewCopy:vi.fn(),assignToExistingCopy:vi.fn(),submitTaskResult:vi.fn(),reviewTaskResult:vi.fn()}});
 const prepareNewAgentRun=vi.fn(async()=>({runId:f.run.runId,runtimeKind:'autobyteus',platformAgentRunId:null,
  commitPublication:()=>f.run,abort:async()=>({kind:'aborted'})}));
 const handle=new ConfiguredAgentExecutionHandle({identity,physicalScope:createRootExecutionPhysicalScope({root,ancestorTeamRunIds:[]}),
  execution:{agentDefinitionId:'test',llmModelIdentifier:'parent',llmConfig:null,autoExecuteTools:false,runtimeKind:'autobyteus',workspaceRootPath:null,platformAgentRunId:null},
  activationMode:'fresh',memberExecutionContext,callbacks:{publishAgentEvent:vi.fn(),commitPlatformBindingChange:vi.fn()},
  agentRunManager:testActivationManager({newPreparation: prepareNewAgentRun,getActiveRun:()=>f.run}) as any,
  memoryLocator:{getLocation:()=>({memoryDir:'/unused/test-owned'})} as any});
 const activation=await handle.prepareConfiguredActivation();activation.commitAfterDurability();
 const send=vi.fn(); const connection={send,close:vi.fn()};
 const publisher=new RootEventPublisher<any>();
 const executeAgentCommand=async (id:string,command:any)=>{
  expect(id).toBe(f.run.runId);expect(command.kind).toBe('post_message');
  expect(command.message.senderType).toBe('user');return handle.postMessage(command.message);
 };
 let handler:AgentTeamStreamHandler|AgentOrgStreamHandler;
 if(kind==='agent_team') {
  const tree=JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/current-team-run-v2/case-001-nested-task-team/team_run_execution_tree.json'),'utf8').replaceAll('agent-run-product-manager',f.run.runId));
  tree.rootTeam.collaborators=[];
  const run={teamRunId:root.rootRunId,getExecutionTreeSnapshot:()=>tree,executeAgentCommand,
   openPackageSnapshotConnection:()=>publisher.openSnapshotConnection(()=>({tree,closedTaskExecutions:[],messages:{schemaVersion:1,teamRunId:root.rootRunId,messages:[]},statuses:[],inputStates:handle.getInputStateSnapshots()}))};
  handler=new AgentTeamStreamHandler(new AgentSessionManager(),{resolveActiveTeamRun:async()=>run,getActiveTeamRun:()=>run,recordRunActivity:async()=>{}} as any,
   {getLifecycleSnapshot:()=>({teamRunId:root.rootRunId,isActive:true}),subscribeToLifecycle:()=>()=>{}} as any);
 } else {
  const tree=testAgentOrgExecutionTree({orgRunId:root.rootRunId,members:[testOrgAgentNode(identity.memberAddress,f.run.runId)]});
  const run={orgRunId:root.rootRunId,isActive:()=>true,executeAgentCommand,
   executeAgentCommandWithExecutionKind:async(id:string,command:any)=>({result:await executeAgentCommand(id,command),executionKind:'configured'}),
   openPackageSnapshotConnection:()=>publisher.openSnapshotConnection(()=>({tree,closedTaskExecutions:[],messages:{schemaVersion:1,subjectKind:'agent_org',orgRunId:root.rootRunId,messages:[]},statuses:[handle.getStatusSnapshot()],inputStates:handle.getInputStateSnapshots()}))};
  handler=new AgentOrgStreamHandler({getActive:()=>run,recordRunActivity:async()=>{}} as any);
 }
 const session=await handler.connect(connection,root.rootRunId);expect(session,JSON.stringify(send.mock.calls)).toBeTruthy();
 return { handle,prepareNewAgentRun,
  send:async(text:string,id=text)=>handler.handleMessage(session!,JSON.stringify({type:'SEND_MESSAGE',payload:{
   content:text,context_file_paths:[],image_urls:[],message_id:id,dedupe_key:`input:${id}`,
   ...(kind==='agent_team'?{agent_run_id:f.run.runId}:{root_subject_kind:'agent_org',root_run_id:root.rootRunId,target_agent_run_id:f.run.runId,command_id:`command:${id}`})}})),
  close:async()=>{await handler.disconnect(session!);handle.dispose();} };
}

describe('actual root user command compaction recovery ingress',()=>{
 it.each(['agent_team','agent_org'] as const)('%s wakes held A via configured handle and keeps B queued, without reactivation',async kind=>{
  const f=await createRecoveryFixture();let route:Awaited<ReturnType<typeof ingress>>|undefined;
  try {
   route=await ingress(kind,f);f.request();f.compress.mockRejectedValueOnce(new Error('first'));
   await route.send('A');await eventually(()=>f.native.getCompactionRecovery()?.state==='awaiting_user');
   let release!:(s:string)=>void;f.compress.mockImplementationOnce(()=>new Promise(r=>{release=r}));
   await route.send('B');await eventually(()=>!!release);
   expect(f.run.getInputStateSnapshot().entries.map(e=>e.message_id)).toEqual(['A','B']);
   expect(route.handle.getInputStateSnapshots()[0].state).toEqual(f.run.getInputStateSnapshot());
   expect(f.parent.requests).toHaveLength(3);release(summary);
   await eventually(()=>f.parent.requests.length===5 && f.run.getInputStateSnapshot().entries.length===0);
   expect(f.parent.requests.slice(3).map(m=>m.at(-1)?.content)).toEqual(['A','B']);
   expect(route.prepareNewAgentRun).toHaveBeenCalledOnce();
  }finally{await route?.close();await f.close()}
 },15000);
});
