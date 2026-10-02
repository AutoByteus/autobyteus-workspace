"""Offline checks of fresh SR036 captures. Does not drive or modify product."""
import collections, datetime, hashlib, json, pathlib, re
E=pathlib.Path(__file__).resolve().parent
P=E/'product'
def read(n): return json.loads((P/n).read_text())
def ui(n):
    d=read(n)
    assert d['ok'] is True, n
    return d['result']['result']
def root(c,s):
    return read(f'{c}-{s}-root.api.json')['response']['data']['agentRunCollaboration']
def history(c,s):
    return read(f'{c}-{s}-projection.api.json')['response']['data']['agentRunCollaborationMemberProjection']
def one(rows): assert len(rows)==1, len(rows); return rows[0]
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def pid(n):
    ls=(P/n).read_text().splitlines()
    return int(one([line.split()[1] for line in ls if '(LISTEN)' in line]))
def keys_absent(d):
    return all(k not in d for k in ['message_id','dedupe_key','messageId','dedupeKey'])
wire=[json.loads(l) for l in (P/'loopback-wire.jsonl').read_text().splitlines()]
req=[x for x in wire if x['event']=='request']
parent=[x for x in req if x['kind']=='parent']
comp=[x for x in req if x['kind']=='compaction']
errors=[x for x in wire if x['event']=='response_error']
assert (len(req),len(parent),len(comp),len(errors))==(36,12,24,24)
assert {x['id'] for x in comp}=={x['id'] for x in errors}
assert all(x['status']==503 for x in errors)
assert {x['event'] for x in wire}=={'control','request','response','response_error'}
cases=[]
for c in ['r1a','r1t','r2a','r2t']:
    marker='SR036-'+c.upper()+'-HELD'
    pre=root(c,'before'); post=root(c,'after')
    assert pre['root_run_id']==post['root_run_id']
    h0=history(c,'before'); h1=history(c,'after')
    assert h0['agentRunId']==h1['agentRunId']
    run=h0['agentRunId']
    st0=one([x['state'] for x in pre['root_agent']['agent_input_states'] if x['agent_run_id']==run])
    st1=one([x['state'] for x in post['root_agent']['agent_input_states'] if x['agent_run_id']==run])
    assert st0==st1, c+' live state changed'
    entry=one(st0['entries'])
    assert entry['content']==marker and entry['state']=='held'
    assert st0['recoverableBlock']['state']=='awaiting_user'
    assert st0['recoverableBlock']['position']=={'kind':'held_turn','turnId':entry['turn_id']}
    assert st0['revision']==16 and entry['sequence']==3 and entry['turn_id']=='turn_0003'
    assert st0['recoverableBlock']['failureEpoch']==2
    raw=[]
    for s in ['before','after']:
        rows=[json.loads(l) for l in (P/f'{c}-{s}-raw-0.jsonl').read_text().splitlines()]
        item=one([x for x in rows if x.get('trace_type')=='user' and marker in x.get('content','')])
        assert keys_absent(item) and item['turn_id']==entry['turn_id'] and item['seq']==1
        raw.append(item)
    assert raw[0]==raw[1]
    assert sha(P/f'{c}-before-raw-0.jsonl')==sha(P/f'{c}-after-raw-0.jsonl')
    hist=[one([x for x in h['conversation'] if x.get('role')=='user' and marker in x.get('content','')]) for h in [h0,h1]]
    assert hist[0]==hist[1] and all(keys_absent(h) for h in hist)
    assert raw[0]['content']==hist[0]['content']
    before=ui(c+('-before-dom-final.json' if c=='r1a' else '-before-dom.json'))
    control=ui(c+('-control-final.json' if c=='r1a' else '-control.json'))
    sent=ui(c+'-sentinel.json'); doc=ui(c+'-after-document.json')
    after=ui(c+('-expanded-dom.json' if c=='r2a' else '-after-dom.json'))
    assert len(before['copies'])==len(control['copies'])==1
    assert all('Held — waiting for compaction' in d['copies'][0]['parent'] for d in [before,control])
    assert before['timeOrigin']==control['timeOrigin']==sent['timeOrigin']
    assert sent['sentinel'] and doc['sentinel'] is None
    assert doc['timeOrigin']!=sent['timeOrigin'] and after['timeOrigin']==doc['timeOrigin']
    assert len(after['copies'])==2 and all(marker in x['text'] for x in after['copies'])
    assert all('<span class="sr-only">You</span>' in x['parent'] for x in after['copies'])
    assert sum('Held — waiting for compaction' in x['parent'] for x in after['copies'])==1
    prepid=pid('backend-before.txt' if c=='r1a' else c+'-before-backend.txt')
    postpid=pid(c+'-after-backend.txt')
    assert prepid==postpid==41971
    frames=sent.get('out',sent.get('wire'))
    outgoing=[json.loads(x['data']) for x in frames if x.get('direction','out')=='out']
    outgoing=one([x for x in outgoing if x.get('type')=='SEND_MESSAGE' and x['payload'].get('content')==marker])
    payload=outgoing['payload']
    assert payload['target_agent_run_id']==run
    assert payload['message_id']==entry['message_id'] and payload['dedupe_key']==entry['dedupe_key']
    assert not [r for r in parent if marker in json.dumps(r['body'])]
    if c=='r2a':
        assert len(entry['file_attachments'])==1
        assert entry['file_attachments']==raw[0]['file_attachments']
        assert entry['file_attachments'][0]['uri']==one(hist[0]['fileAttachments'])['uri']
        assert hist[0]['content']!=entry['content'] and '**[Context]**' in hist[0]['content']
        assert sum(x['text']==marker for x in after['copies'])==1
        assert all('Open attachment.txt' in x['parent'] for x in after['copies'])
    cases.append({
        'case':c.upper(),'outcome':'Reproduced','productExpectation':'Fail: one corresponding bubble expected, two observed',
        'hostRunId':pre['root_run_id'],'agentRunId':run,'memberAddress':h0['memberAddress'],
        'nativeInstance':st0['run_instance_id'],'revisionBeforeAndAfter':st0['revision'],
        'heldEntry':entry,'recovery':st0['recoverableBlock'],
        'backendPidBeforeAndAfter':prepid,
        'timeOriginBefore':sent['timeOrigin'],'timeOriginAfter':doc['timeOrigin'],
        'sentinelBefore':sent['sentinel'],'sentinelAfter':doc['sentinel'],
        'userBubblesBefore':1,'userBubblesNoReloadControl':1,'correspondingUserBubblesAfter':2,
        'heldLabelsAfter':1,'outgoingHeldSends':1,'rawHeldUserRows':1,'savedHeldUserRows':1,'heldParentDispatches':0,
        'rawTraceId':raw[0]['id'],'rawSha256BeforeAndAfter':sha(P/f'{c}-before-raw-0.jsonl'),
        'rawAndHistoryAcceptedIdentityPresent':False,'rawAndHistoryContentEqual':True,
        'attachmentExpansionQualification':c=='r2a',
        'domEvidenceBefore':c+('-before-dom-final.json' if c=='r1a' else '-before-dom.json'),
        'domEvidenceAfter':c+('-expanded-dom.json' if c=='r2a' else '-after-dom.json')
    })
assert len({c['nativeInstance'] for c in cases})==4
assert len({c['agentRunId'] for c in cases})==4
assert len({c['hostRunId'] for c in cases})==2
for n in ['r1-final-root.api.json','r2-final-root.api.json']:
    r=read(n)['response']['data']['agentRunCollaboration']['root_agent']
    assert not r['is_active']
    assert not r['agent_input_states']
cleanup=read('cleanup.json')
assert cleanup['rootStillExists'] is False
assert cleanup['appStop']['ok'] is True
assert cleanup['appStop']['result']['dataRootRemoved'] is True
assert cleanup['appStop']['result']['forced'] is False
result={
    'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'scope':'User-requested fresh reproduction of already reviewed API009-F001; no fix/post-fix acceptance/new full validation score',
    'reproductionOutcome':'Reproduced','freshAttempts':4,'reproduced':4,'blocked':0,'notReproduced':0,
    'evidenceConsistencyAssertions':'Pass (offline capture checks, not product acceptance)',
    'cases':cases,
    'provider':{'requests':36,'parent':12,'compaction':24,'synthetic503':24,'remoteInference':0,
        'note':'Controlled loopback dependency; two 3-attempt exhausted cycles per child (post-response seed and pre-parent held input).'},
    'cleanup':cleanup,
    'limits':['No frequency/statistical inference','No B/retry recovery after reload in this scope','No backend restart/power-loss proof','No provider quality claim','No new durable tests or production fix']
}
with (E/'repro-result.json').open('x') as f: json.dump(result,f,indent=2);f.write('\n')
print(json.dumps({'reproductionOutcome':'Reproduced','attempts':4,'evidenceConsistencyAssertions':'Pass','source':'fresh actual desktop captures'},indent=2))

