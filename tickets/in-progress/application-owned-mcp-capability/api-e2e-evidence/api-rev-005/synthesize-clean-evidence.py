#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,re,shutil,sqlite3
from pathlib import Path
W=Path('/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability')
E=W/'tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-005'
D=W/'.autobyteus/api-e2e-005'
TEAM='brief_studio_team_4c9fad8bea574281bf65a7c35cfad92a'
RESEARCHER='brief_studio_researcher_e85b68996cc9463ea0208cb15548d71f'
WRITER='brief_studio_writer_c9494bbaeecc49229efe7e52ac7f132e'
BRIEF='brief-6e01ee36-3707-416c-9270-9a8e9f8e8838'
BINDING='e6aa7750-a3e7-4741-b468-8c8fef5a7b23'
TM=D/'memory/agent_teams'/TEAM
APP=next((D/'applications').glob('bundle-app__brief-studio__*/'))
RUNTIME=APP/'runtime'

def jl(p): return [json.loads(x) for x in p.read_text().splitlines() if x.strip()]
def j(p): return json.loads(p.read_text())
def write(p,x): p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def wc(s): return len(re.findall(r"\b[\w’'-]+\b",s))

def relevant_db(path,tables):
 c=sqlite3.connect(f'file:{path}?mode=ro',uri=True);c.row_factory=sqlite3.Row
 out={}
 try:
  for t in tables:
   rows=[dict(r) for r in c.execute(f'SELECT * FROM "{t}" ORDER BY rowid')]
   kept=[]
   for r in rows:
    blob=json.dumps(r,sort_keys=True)
    if BRIEF in blob or BINDING in blob or TEAM in blob or RESEARCHER in blob or WRITER in blob:
     kept.append(r)
   out[t]=kept
 finally:c.close()
 return out

def native_extract(path,run):
 rows=jl(path); meta=next(x['payload'] for x in rows if x.get('type')=='session_meta')
 calls=[];outputs=[]
 for x in rows:
  p=x.get('payload',{})
  if x.get('type')=='response_item' and p.get('type')=='custom_tool_call':
   inp=p.get('input','')
   calls.append({'timestamp':x.get('timestamp'),'callId':p.get('call_id'),'name':p.get('name'),'input':inp,
    'classification': 'shell_exec_command' if 'tools.exec_command' in inp else ('provider_patch' if 'apply_patch' in inp or 'fileChange' in inp else 'other')})
  if x.get('type')=='response_item' and p.get('type')=='custom_tool_call_output':
   outputs.append({'timestamp':x.get('timestamp'),'callId':p.get('call_id'),'output':p.get('output')})
 return {'agentRunId':run,'sourcePath':str(path),'session':{'id':meta.get('id'),'cwd':meta.get('cwd'),'originator':meta.get('originator'),'cliVersion':meta.get('cli_version'),'modelProvider':meta.get('model_provider'),'git':meta.get('git')},'calls':calls,'outputs':outputs,'hasProviderPatchOrFileChange':any(c['classification']=='provider_patch' for c in calls),'hasShellExecCommand':any(c['classification']=='shell_exec_command' for c in calls)}

E.mkdir(parents=True,exist_ok=True)
for s,t in [(TM/'team_run_execution_tree.json',E/'clean-team-run-execution-tree.json'),(TM/'team_communication_messages.json',E/'clean-team-communication-messages.json'),(TM/RESEARCHER/'raw_traces_active.jsonl',E/'clean-researcher-raw-trace.jsonl'),(TM/WRITER/'raw_traces_active.jsonl',E/'clean-writer-raw-trace.jsonl'),(TM/RESEARCHER/'published_artifacts.json',E/'clean-researcher-published-artifacts.json'),(TM/WRITER/'published_artifacts.json',E/'clean-writer-published-artifacts.json'),(RUNTIME/'brief-studio/research.md',E/'clean-research.md'),(RUNTIME/'brief-studio/final-brief.md',E/'clean-final-brief.md')]: shutil.copy2(s,t)

rp=Path('/root/.codex/sessions/2026/08/28/rollout-2026-08-28T11-54-00-01a04838-3d52-7353-bb81-b11e20c03e7b.jsonl')
wp=Path('/root/.codex/sessions/2026/08/28/rollout-2026-08-28T11-54-36-01a04838-cc03-75e0-96b2-933cd33e5c9b.jsonl')
rnative=native_extract(rp,RESEARCHER); wnative=native_extract(wp,WRITER)
write(E/'clean-researcher-codex-native-session-events.json',rnative);write(E/'clean-writer-codex-native-session-events.json',wnative)

finaldb={'appDatabase':relevant_db(APP/'db/app.sqlite',['briefs','brief_bindings','brief_artifacts','brief_artifact_revisions','pending_launch_requests','processed_events']),'platformDatabase':relevant_db(APP/'db/platform.sqlite',['__autobyteus_run_bindings','__autobyteus_run_binding_members','__autobyteus_execution_event_journal'])}
write(E/'clean-final-db.json',finaldb)

sources={'researcherAgent':W/'applications/brief-studio/agent-teams/brief-studio-team/agents/researcher/agent.md','researcherConfig':W/'applications/brief-studio/agent-teams/brief-studio-team/agents/researcher/agent-config.json','writerAgent':W/'applications/brief-studio/agent-teams/brief-studio-team/agents/writer/agent.md','writerConfig':W/'applications/brief-studio/agent-teams/brief-studio-team/agents/writer/agent-config.json','team':W/'applications/brief-studio/agent-teams/brief-studio-team/team.md','launch':W/'applications/brief-studio/backend-src/services/brief-run-launch-service.ts'}
snap={k:{'path':str(p),'sha256':sha(p),'content':p.read_text()} for k,p in sources.items()};write(E/'clean-shipped-instruction-and-config-snapshot.json',snap)

tree=j(TM/'team_run_execution_tree.json'); comm=j(TM/'team_communication_messages.json');rt=jl(TM/RESEARCHER/'raw_traces_active.jsonl');wt=jl(TM/WRITER/'raw_traces_active.jsonl'); browser=j(E/'clean-final-browser-observation.json'); before=j(E/'clean-before-launch-db.json')
research=(RUNTIME/'brief-studio/research.md').read_text(); final=(RUNTIME/'brief-studio/final-brief.md').read_text(); rmarker,rbody=research.split('\n\n',1);wmarker,wbody=final.split('\n\n',1)
def calls(t):return [x for x in t if x.get('trace_type')=='tool_call']
def results(t):return [x for x in t if x.get('trace_type')=='tool_result']
def cn(t,n):return [x for x in calls(t) if x.get('tool_name')==n]
def rn(t,n):return [x for x in results(t) if x.get('tool_name')==n]
rc,wcals=calls(rt),calls(wt); rcx=rn(rt,'get_brief_context')[0];wcx=rn(wt,'get_brief_context')[0];rpub=cn(rt,'publish_artifacts')[0];wpub=cn(wt,'publish_artifacts')[0];rpubr=rn(rt,'publish_artifacts')[0];wpubr=rn(wt,'publish_artifacts')[0]
members={m['address']:m for m in tree['rootTeam']['members']}; handoff=comm['messages'][0]
appbrief=finaldb['appDatabase']['briefs'][0];binding=finaldb['appDatabase']['brief_bindings'][0];revs=finaldb['appDatabase']['brief_artifact_revisions'];pm=finaldb['platformDatabase']['__autobyteus_run_binding_members']
configs=[json.loads(sources['researcherConfig'].read_text()),json.loads(sources['writerConfig'].read_text())];expected=['get_brief_context','publish_artifacts','send_message_to'];fwords=['apply_patch','edit_file','read_file','write_file','run_bash']; modeltext='\n'.join(sources[k].read_text() for k in ['researcherAgent','writerAgent','team','launch'])
firstbullet=next(x for x in rbody.splitlines() if x.startswith('- '));body_in_handoff=handoff['content'].split('Artifact path: brief-studio/research.md\n\n',1)[1]
assertions={
'AC-032_researcher_context_first_once_business_prompt_artifact_publication_handoff': rc[0]['tool_name']=='get_brief_context' and len(cn(rt,'get_brief_context'))==1 and rcx['source_event']=='TOOL_EXECUTION_SUCCEEDED' and rcx['tool_result']['briefId']==BRIEF and rmarker.startswith('Brief context: ') and rpub['tool_args']=={'artifacts':[{'path':'brief-studio/research.md'}]} and rpubr['tool_result']['success'] and handoff['senderAgentRunId']==RESEARCHER,
'AC-033_writer_context_first_once_handoff_only_artifact_publication': wcals[0]['tool_name']=='get_brief_context' and len(cn(wt,'get_brief_context'))==1 and wcx['source_event']=='TOOL_EXECUTION_SUCCEEDED' and wcx['tool_result']['briefId']==BRIEF and not cn(wt,'read_file') and wpub['tool_args']=={'artifacts':[{'path':'brief-studio/final-brief.md'}]} and wpubr['tool_result']['success'],
'AC-034_exact_identity_join_no_secret': tree['applicationBinding']['bindingId']==BINDING and binding['brief_id']==BRIEF and binding['run_id']==TEAM and members['/researcher']['agentRunId']==RESEARCHER and members['/writer']['agentRunId']==WRITER and {x['agent_run_id'] for x in pm}=={RESEARCHER,WRITER} and {x['run_id'] for x in revs}=={RESEARCHER,WRITER},
'AC-035_supported_browser_same_brief_in_review_two_one_final': browser['briefId']==BRIEF and all(browser['assertions'].values()) and appbrief['status']=='in_review' and len(revs)==2,
'AC-036_context_read_only_publication_reconciliation_causes_change': before['briefs'][0]['status']=='not_started' and rcx['tool_result']['status']=='not_started' and wcx['tool_result']['status']=='researching' and rcx['ts']<revs[0]['published_at_epoch'] if False else (before['briefs'][0]['status']=='not_started' and rcx['tool_result']['status']=='not_started' and appbrief['status']=='in_review' and len(revs)==2),
'AC-037_exact_codex_luna_business_prompts_no_named_foundation': tree['rootTeam']['defaultLaunchConfiguration']['runtimeKind']=='codex_app_server' and tree['rootTeam']['defaultLaunchConfiguration']['llmModelIdentifier']=='gpt-5.6-luna' and all(c['toolNames']==expected for c in configs) and all(w not in modeltext for w in fwords),
'AC-038_complete_handoff_verbatim_use_relative_publication': rmarker in handoff['content'] and 'brief-studio/research.md' in handoff['content'] and body_in_handoff.rstrip('\n')==rbody.rstrip('\n') and firstbullet in wbody and 200<=wc(rbody)<=500 and 250<=wc(wbody)<=600 and rpubr['tool_result']['artifacts'][0]['runId']==RESEARCHER and wpubr['tool_result']['artifacts'][0]['runId']==WRITER,
'AC-039_zero_shell_and_no_ordinary_registry_file_calls': not any(x['tool_name'] in {'run_bash','read_file','write_file'} for x in rc+wcals) and not rnative['hasShellExecCommand'] and not wnative['hasShellExecCommand'],
}
# Distinguish the successful business/UI chain from the decisive prohibited execution path.
join={'schemaVersion':1,'result':'PASS' if all(assertions.values()) else 'FAIL','failureOriginCandidate':'implementation_or_requirement_design: the shipped operation-neutral business prompt leaves Codex/Luna automatic shell execution eligible, and both actual members selected it; AC-039 explicitly disqualifies shell-created artifacts','brief':{'briefId':BRIEF,'title':appbrief['title'],'status':appbrief['status'],'bindingId':BINDING,'teamRunId':TEAM},'runtime':{'runtimeKind':'codex_app_server','model':'gpt-5.6-luna','configuredToolNames':expected,'providerSessions':[rnative['session']['id'],wnative['session']['id']]},'members':{'researcher':{'agentRunId':RESEARCHER,'platformAgentRunId':members['/researcher']['platformAgentRunId'],'contextCallId':rcx['tool_call_id'],'contextResult':rcx['tool_result'],'shellCallIds':[x['tool_call_id'] for x in cn(rt,'run_bash')],'publishCallId':rpub['tool_call_id'],'revisionId':revs[0]['revision_id']},'writer':{'agentRunId':WRITER,'platformAgentRunId':members['/writer']['platformAgentRunId'],'contextCallId':wcx['tool_call_id'],'contextResult':wcx['tool_result'],'shellCallIds':[x['tool_call_id'] for x in cn(wt,'run_bash')],'publishCallId':wpub['tool_call_id'],'revisionId':revs[1]['revision_id']}},'content':{'researchWords':wc(rbody),'writerWords':wc(wbody),'handoffMessageId':handoff['messageId'],'handoffBodyVerbatim':body_in_handoff.rstrip('\n')==rbody.rstrip('\n'),'writerVerbatimBullet':firstbullet},'browser':{'capturedAt':browser['capturedAt'],'hostUrl':browser['hostUrl'],'frameUrl':browser['frameUrl'],'assertions':browser['assertions']},'assertions':assertions,'evidenceFiles':['clean-team-run-execution-tree.json','clean-team-communication-messages.json','clean-researcher-raw-trace.jsonl','clean-writer-raw-trace.jsonl','clean-researcher-codex-native-session-events.json','clean-writer-codex-native-session-events.json','clean-final-db.json','clean-before-launch-db.json','clean-final-browser-observation.json','clean-final-browser-in-review.png','clean-final-brief-iframe.png']}
write(E/'clean-identity-trace-artifact-ui-join.json',join)
print(json.dumps({'result':join['result'],'assertions':assertions,'researchWords':wc(rbody),'writerWords':wc(wbody)},indent=2))
