from pathlib import Path
import json,collections,statistics
E=Path(__file__).parent
p=json.loads((E/'api-009-round9-concrete-agent_team.json').read_text()); rows=[json.loads(l) for l in (E/'api-009-round9-owner-debugger.jsonl').read_text().splitlines()]
selected=[]
for n,r in enumerate(rows):
 if r.get('event') in ['resumed','breakpoint','error-caller-facts']:continue
 v=r.get('value',{})
 if r.get('event')=='input-outcome-fact':
  caller=next((q for q in rows[n+1:n+4] if q.get('event')=='error-caller-facts' and q.get('trigger')=='input-outcome-fact'),None)
  if caller:v={**v,'callerRunId':caller['value']['runId'],'generation':caller['value']['runInstanceId']}
 selected.append({k:r[k] for k in ['at','event','trigger','evaluationException'] if k in r}|{'value':v})
reader=p['readerId'];ids=p['newIds']; team=p['newLife']['executions'][0]['execution']['teamRunId']; turn=next(r['value']['provider']['activeTurnId'] for r in selected if r['event']=='agent-force-begin' and r['value'].get('runId')==reader)
def has(ev,pred):return any(r['event']==ev and pred(r['value']) for r in selected)
assert has('agent-force-begin',lambda v:v.get('runId')==reader and any(x['state']=='forwarded' for x in v['input']['entries']))
assert has('native-terminal',lambda v:v.get('runId')==reader and v['eventTurnId']==turn and v['status']=='interrupted')
assert has('input-outcome-fact',lambda v:v.get('callerRunId')==reader and v['sequence']==2 and v['terminal']=={'kind':'interrupted','turnId':turn})
for id in ids:
 assert has('agent-backend-return',lambda v:v.get('runId')==id and v['backendResult']=={'accepted':True} and not v['input']['entries'] and v['sourceWorkCount']==0)
 assert has('agent-manager-components',lambda v:v.get('runId')==id and v['result']=={'accepted':True} and not v['forceReleaseErrors'] and not v['attachments']['errors'] and v['providerThread']==False)
 assert has('agent-manager-removal',lambda v:v.get('runId')==id and v['result']=={'accepted':True} and v['removal']=={'kind':'removed','errors':[]} and v['activePublished']==False)
assert has('root-proof-settled',lambda v:v['execution'].get('teamRunId')==team and len(v['proofs'])==2 and all(q['status']=='fulfilled' and q['value']=={'accepted':True} for q in v['proofs']))
pauses=[r['pauseDurationMs'] for r in rows if r.get('event')=='resumed'];errors=[r for r in rows if r.get('evaluationException') or r.get('event')=='evaluation-error']
assert not errors;assert rows[-1]['event']=='detached'
out={'result':'Scoped Pass fresh ordinary exact submitted-reader closure; no historical backfill or default-pipeline second-cause claim','instanceId':p['instanceId'],'rootId':p['rootId'],'lifetimeId':p['newLife']['lifetimeId'],'teamId':team,'memberIds':ids,'readerId':reader,'turnId':turn,'ownerReceipts':selected,'uiCheckpoints':p['uiCheckpoints'],'initialRoute':p['uiInitialRoute'],'finalRoute':p['uiFinalRoute'],'pauseAudit':{'count':len(pauses),'totalMs':sum(pauses),'maximumMs':max(pauses),'evaluationErrors':len(errors),'detached':rows[-1]},'limits':['Read-only debugger pauses perturbed timing; ordinary companion without observer still required. No source hooks, forced terminal, latch, reload or Root Stop repair.','Historical reader backend/wire/stage UNOBSERVED; fresh accepted result never backfills original. AgentRun FIFO prior protection and finite source continuation contract distinct.','FAPI-007 remains independently Open/Unclear/NotReproduced.']}
(E/'api-009-round9-positive-owner-witness.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'reader':reader,'turn':turn,'events':collections.Counter(r['event'] for r in selected),'pause':out['pauseAudit'],'teamCurrent':[r for r in selected if r['event']=='exact-team-current-proof']},indent=2))
