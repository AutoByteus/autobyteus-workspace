from pathlib import Path
import json,hashlib,datetime,os,socket,re
e=Path(__file__).parent
checks=[]
def check(name,condition):
 checks.append({'name':name,'pass':bool(condition)})
 assert condition,name
read=lambda name:json.loads((e/name).read_text())
execution=read('execution.json');manifest=read('manifest.json')
rows=[]
for phase in ['flow','quality']:
 rs=[json.loads(x) for x in (e/(phase+'-wire.jsonl')).read_text().splitlines()]
 check(phase+' no provider/capture/guard error',not any(x.get('event') in ['capture_error','wire_error','guard_rejected'] for x in rs))
 rows+=rs
req=[x for x in rows if x['event']=='wire_request'];statuses=[x for x in rows if x['event']=='wire_status']
check('11 total <= approved13',len(req)==11 and len(req)<=manifest['maxGenerations'])
check('global sequence crosses two workers without reset',[x['sequence'] for x in req]==list(range(1,12)))
check('8 parent + 3 summary',sum(x['kind']=='parent' for x in req)==8 and sum(x['kind']=='summary' for x in req)==3)
check('all11 HTTP200',len(statuses)==11 and all(x['status']==200 for x in statuses))
check('model only requested deepseek-v4-flash',all(x['body']['model']=='deepseek-v4-flash' for x in req))
check('one flow summary/two quality',sum(x['kind']=='summary' and x['phase']=='flow' for x in req)==1 and sum(x['kind']=='summary' and x['phase']=='quality' for x in req)==2)
for x in req:
 b=x['body'];n=x['sequence']
 if x['kind']=='summary':
  check(f'request{n} exact approved v5',hashlib.sha256(b['messages'][0]['content'].encode()).hexdigest()==manifest['systemSha256'])
  check(f'request{n} generation0.7/cap8192/no tools',b['temperature']==0.7 and (b.get('max_tokens') or b.get('max_completion_tokens'))==8192 and not b.get('tools'))
 else:
  check(f'parent{n} config0/1024/thinking disabled',b['temperature']==0 and (b.get('max_tokens') or b.get('max_completion_tokens'))==1024 and b['thinking']['type']=='disabled')
check('all planned phases exit0',[(x['phase'],x['status']) for x in execution['attempts']]==[('preflight',0),('flow',0),('quality',0)])
elapsed=(datetime.datetime.fromisoformat(execution['finished'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(execution['attempts'][0]['completed'].replace('Z','+00:00'))).total_seconds()
check('live campaign under12minutes',0<elapsed<720)
allExit=read('managed_compaction_all_exit.json');budget=read('managed_compaction_budget_probe.json');quality=read('product_compactor_quality_probe.json')
check('normal 4 turns finished without error',allExit['stage']=='passed' and allExit['completedTurns']==4 and allExit['error'] is None)
check('real threshold ratio5percent crossing',budget['compactionRatio']==0.05 and budget['triggerThresholdTokens']==49936 and min(budget['promptTokens'])<49936<max(budget['promptTokens']))
check('one complete lifecycle',budget['phases']==['requested','started','completed'])
check('persisted summary exactly next parent summary',quality['snapshotSummary']==quality['nextRequestSummary'])
check('all eight retained anchors exact',all(quality['anchorPresence'].values()))
check('all projected anchors exact',all(quality['projectedInvocationAnchorPresence'].values()))
expected={'customer':'Northwind Helios','rollback_action':'restore the last stable payments build','safety_rule':'the ledger delta must remain zero','verification':'reconcile both ledgers before reopening retries','owner':'Mira Chen','mitigation':'freeze payment retries','rejection_condition':'any duplicate ledger entry','communication_channel':'payments incident bridge','new_constraint':'preserve auditable rollback proof'}
check('exact nine-field continuation artifact',quality['exactContinuationArtifact']==expected)
first=read('semantic_first.json');repeated=read('semantic_repeated.json')
check('two distinct successful semantic invocations',first['execution']['invocationId']!=repeated['execution']['invocationId'] and first['execution']['completionStatus']==repeated['execution']['completionStatus']=='complete')
r11=next(x for x in req if x['sequence']==11)
check('repeated uses actual first response once',r11['body']['messages'][1]['content'].count(first['summary'])==1)
check('pair durable two-call assertion ran',read('semantic_two_calls_verified.json')['invocationCount']==2)
check('owned database/rootkey/runtime removed',all(execution['cleanup'].values()) and not any(Path(p).exists() for p in [execution['runtimeRoot'],execution['database']['databasePath'],execution['database']['rootKeyPath']]))
try:os.kill(execution['pid'],0);alive=True
except ProcessLookupError:alive=False
check('owned builtserver exited',not alive)
port=int(execution['serverUrl'].rsplit(':',1)[1])
sock=socket.socket();sock.settimeout(.3);open_=sock.connect_ex(('127.0.0.1',port))==0;sock.close()
check('owned server port released',not open_)
source=Path(manifest['sourcePath']);stat=source.lstat()
check('source stat unchanged importer-only access',stat.st_size==manifest['sourceStatOnly']['size'] and stat.st_mtime_ns==manifest['sourceStatOnly']['mtimeNs'])
m=re.search(r'(/[^"\n]+live-e2e-compaction-agent-flow-[^/]+)',(e/'flow-summary-source.txt').read_text())
check('normal harness-owned flow workspace removed',bool(m) and not Path(m.group(1)).exists())
sizes={'flowPreparedSourceChars':len(next(x for x in req if x['kind']=='summary')['body']['messages'][1]['content']),'flowAcceptedSummaryChars':len(quality['snapshotSummary']),'firstSourceChars':sum(map(len,first['source'])),'firstSummaryChars':len(first['summary']),'repeatedPreparedSourceChars':len(r11['body']['messages'][1]['content']),'repeatedSummaryChars':len(repeated['summary'])}
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'passed':len(checks),'liveSeconds':elapsed,'sizesDescriptiveNotAcceptanceThreshold':sizes,'productionSummaryVsSmallSyntheticPair':'Manual review separate; no keyword/length-only acceptance.'}
(e/'evidence-assertions.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'passed':len(checks),'liveSeconds':elapsed,'sizes':sizes}))
