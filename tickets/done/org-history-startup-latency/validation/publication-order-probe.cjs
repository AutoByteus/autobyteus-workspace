// Investigation only. Executes unmodified production scheduler with controlled import boundaries.
// Not an acceptance test or a measurement of the user's Electron startup.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const ts = require('/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-base/autobyteus-web/node_modules/typescript/lib/typescript.js');
const sourcePath = path.resolve('autobyteus-web/stores/runHistoryLoadActions.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise, resolve}; };
const tick = () => new Promise(r => setImmediate(r));
async function run(mode) {
  const avatar = deferred(), workspace = deferred(), hydration = deferred();
  const events = [];
  const rows = [{ rootRunId: 'org-fixture' }];
  const groups = [{agentDefinitions: mode === 'hydration' ? [{runs:[{runId:'active-agent',isActive:true}]}] : [],teamRuns:[]}];
  const stubs = {
    '~/stores/agentOrgContextsStore': {useAgentOrgContextsStore:()=>({reconcileRetainedHistory:()=>events.push('org-reconciled')})},
    '~/stores/windowNodeContextStore': {useWindowNodeContextStore:()=>({waitForBoundBackendReady:async()=>true})},
    '~/utils/apolloClient': {getApolloClient:()=>({query:async({query})=>{
      if(query==='workspace') { if(mode==='workspace') await workspace.promise; events.push('workspace-response'); return {data:{listWorkspaceRunHistory:groups}}; }
      events.push('org-response'); return {data:{listCollaborationRootHistory:rows}};
    }})},
    '~/graphql/queries/runHistoryQueries':{ListWorkspaceRunHistory:'workspace'},
    '~/graphql/queries/collaborationRootHistoryQueries':{ListCollaborationRootHistory:'org'},
    '~/stores/runHistoryStoreSupport':{
      parseAgentOrgHistoryItems:x=>x, flattenWorkspaceTeamRuns:()=>[],
      buildNextAgentAvatarIndex:async()=>{events.push('avatar-enter'); if(mode==='avatar') await avatar.promise; return {};}
    },
    '~/stores/agentContextsStore':{useAgentContextsStore:()=>({runs:new Map(),getRun:()=>null})},
    '~/stores/agentRunStore':{useAgentRunStore:()=>({connectToAgentStream:()=>events.push('agent-connected')})},
    '~/stores/agentTeamContextsStore':{useAgentTeamContextsStore:()=>({allTeamRuns:[]})},
    '~/stores/agentTeamRunStore':{useAgentTeamRunStore:()=>({})},
    '~/stores/runHistoryReadModel':{findAgentNameByRunId:()=> 'Fixture'},
    '~/services/runHydration/runContextHydrationService':{hydrateLiveRunContext:async()=>{events.push('hydrate-enter');await hydration.promise;}},
    '~/types/agent/AgentStatus':{AgentStatus:{Running:'running'}}
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,require:id=>stubs[id]||{},console});
  const store={loading:false,error:null,workspaceGroups:[],agentOrgHistory:[],agentAvatarByDefinitionId:{},historyFamilyErrors:{workspace:null,agentOrg:null},agentOrgRequestGeneration:0};
  const operation=exports.fetchRunHistoryTree(store);
  await tick();
  const blocked={workspaceRows:store.workspaceGroups.length,orgRows:store.agentOrgHistory.length,events:[...events]};
  assert.equal(blocked.orgRows,0);
  assert.equal(blocked.workspaceRows,mode==='workspace'?0:1);
  assert(events.includes('org-response'));
  avatar.resolve(); workspace.resolve(); hydration.resolve();
  await operation;
  assert.equal(store.agentOrgHistory.length,1);
  console.log(JSON.stringify({mode,blocked,completed:{workspaceRows:store.workspaceGroups.length,orgRows:store.agentOrgHistory.length,events},result:'confirmed current blocking dependency'}));
}
(async()=>{console.log(JSON.stringify({sourcePath,sha256:crypto.createHash('sha256').update(source).digest('hex'),boundaries:'query, strict parser, avatar loader, context/hydration imports controlled; scheduler unmodified'}));for(const mode of ['avatar','hydration','workspace']) await run(mode);})().catch(e=>{console.error(e);process.exitCode=1;});
