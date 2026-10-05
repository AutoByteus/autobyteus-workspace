from pathlib import Path
import json,subprocess,urllib.request,datetime,os
E=Path(__file__).resolve().parent;i=json.loads((E/'api-017-history-restart.json').read_text())['result'];j=json.loads((E/'api-017-claude-concrete-agent_org.json').read_text());aid=j['lifetimes']['A']['executions'][0]['ingressAgentRunId']
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'scope':'Read-only exact post-resume actor runtime-reference to own SDK process PID. No inspector/hooks/pauses, no production auth/key inspection; no IO object-state or original-cause claim.','runId':aid}
assert i['ownsDataRoot']
query='query($id:String!){getAgentRunResumeConfig(runId:$id){metadataConfig{runtimeKind runtimeReference{runtimeKind sessionId}}}}'
data=json.loads(urllib.request.urlopen(urllib.request.Request(i['graphqlUrl'],data=json.dumps({'query':query,'variables':{'id':aid}}).encode(),headers={'content-type':'application/json'}),timeout=30).read())
out['response']=data
rows=[]
for line in subprocess.check_output(['ps','-axo','pid=,ppid=,command='],text=True).splitlines():
 a=line.strip().split(maxsplit=2)
 if len(a)==3:rows.append((int(a[0]),int(a[1]),a[2]))
ids={i['pid']}
for _ in rows:
 for pid,ppid,cmd in rows:
  if ppid in ids:ids.add(pid)
if data.get('errors'):
 out['result']='Diagnostic unavailable, not physical evidence';out['limitations']='Member provenance read not exposed by this observational query; not a product scenario failure.'
else:
 ref=data['data']['getAgentRunResumeConfig']['metadataConfig'];assert ref['runtimeKind']=='claude_agent_sdk'
 session=ref['runtimeReference']['sessionId'];assert session
 found=[{'pid':pid,'ppid':ppid,'runtimeSessionId':session,'resumeArgumentMatched':True} for pid,ppid,cmd in rows if pid in ids and ('--resume '+session in cmd or '--session-id '+session in cmd)]
 assert len(found)==1,(session,found)
 out['physicalOwner']=found[0];out['pidWasAlive']=True;out['result']='Scoped Pass exact own runtime-reference/SDK CLI argument and ancestry bind the same resumed Task A actor to one actual OS child. Physical exit after DONE assessed separately.'
 # Store only PIDs/comm, never raw command lines or arbitrary launch secrets.
 out['ownDescendantPids']=[pid for pid,ppid,cmd in rows if pid in ids]
(E/'api-017-physical-owner.json').write_text(json.dumps(out,indent=2)+'\n');print(out['result'])
