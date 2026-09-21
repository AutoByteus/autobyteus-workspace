const fs=require('fs'), path=require('path'), Module=require('module');
const root=process.cwd(), old='/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model';
const req=Module.createRequire(old+'/autobyteus-web/package.json');
const ts=req('typescript');
const vue=require(old+'/node_modules/.pnpm/vue@3.5.28_typescript@5.9.3/node_modules/vue');
const routerLib=req('vue-router');
const router=routerLib.createRouter({history:routerLib.createMemoryHistory(),routes:[{path:'/workspace',component:{render(){return null}}}]});
let release;const delayed=new Promise(r=>{release=r});
let focused='old-agent';
const selection={selectedType:'team',selectedRunId:'prior-team',selectRun(id,type){this.selectedRunId=id;this.selectedType=type},selectRunWithoutShellNavigation(id,type){this.selectRun(id,type)}};
const team={view:{getRootTeamRunId:()=> 'prior-team',hasAgentRun:id=>id==='requested-agent',getMemberAddress:()=>'/worker',focusAgentForInspection(id){focused=id;return {disposition:'committed'}},getFocusedAgentRunId:()=>focused}};
const store={error:null,selectedRunId:null,selectedTeamRunId:null,selectedTeamMemberAddress:null,teamMemberInspectionByIdentity:{}};
const noop=()=>{};const records=[];
const stubs={
 '~/stores/agentSelectionStore':{useAgentSelectionStore:()=>selection},
 '~/stores/agentTeamContextsStore':{useAgentTeamContextsStore:()=>({getTeamContextById:()=>team})},
 '~/stores/agentRunConfigStore':{useAgentRunConfigStore:()=>({clearConfig:noop})},
 '~/stores/teamRunConfigStore':{useTeamRunConfigStore:()=>({clearConfig:noop})},
 '~/services/runHydration/teamMemberProjectionHydrationService':{ensureAuthoritativeTeamMemberProjection:()=>delayed},
 '~/stores/runHistorySelectionActions':{getTeamStreamRecoverySelectionFeedback:()=>null},
};
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);cache.set(file,mod);mod.filename=file;mod.require=name=>{
 if(name in stubs)return stubs[name];
 if(name==='./runHistoryNavigationStoreActions')return {refreshRunNavigationTopologyForStore:noop};
 if(name.startsWith('~/'))return load(root+'/autobyteus-web/'+name.slice(2)+'.ts');
 if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
 return req(name);
};mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports;}
(async()=>{
 const inspect=load(root+'/autobyteus-web/stores/runHistoryTeamMemberInspectionActions.ts');
 const actions=load(root+'/autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts');
 await router.push('/workspace');
 let emittedNavigation=Promise.resolve();
 const api=actions.useWorkspaceHistorySelectionActions({runHistoryStore:{selectTreeRun:row=>inspect.inspectTeamMemberForStore(store,row.teamRunId,row.agentRunId)},selectionStore:selection,setTeamExpanded:noop,toggleTeam:noop,emitRunCreated:noop,presentTeamStreamRecoveryFeedback:noop,emitRunSelected:payload=>{
  records.push({event:'run-selected',payload});
  // Exact current AppLeftPanel event handler semantics; no explicit user click here.
  if(router.currentRoute.value.path==='/workspace' && Object.keys(router.currentRoute.value.query).length===0)return;
  emittedNavigation=router.push('/workspace');
 }});
 const pending=api.onSelectTeamMember({teamRunId:'prior-team',agentRunId:'requested-agent',memberAddress:'/worker'});
 await Promise.resolve();
 // User deliberately opens the Org while the earlier Team-member read has not completed.
 selection.selectedType=null;selection.selectedRunId=null;
 await router.push('/workspace?rootSubjectKind=agent_org&orgRunId=chosen-org&memberAddress=/team/lead&mode=active');
 const before=router.currentRoute.value.fullPath;
 release();await pending;await emittedNavigation;await vue.nextTick();
 const result={scope:'actual current selection action, inspection action/coordinator; Vue memory router; delayed projection and Team view/Pinia dependencies controlled; AppLeftPanel event body mirrored; not original API38 timing or hosted reproduction',before,after:router.currentRoute.value.fullPath,selectedType:selection.selectedType,selectedRunId:selection.selectedRunId,focused,records};
 if(result.after!='/workspace'||result.selectedRunId!=='prior-team')throw Error('No late selection reproduced');
 console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
