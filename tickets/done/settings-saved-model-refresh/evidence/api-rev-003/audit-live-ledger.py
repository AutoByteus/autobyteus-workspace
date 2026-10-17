# Evidence-only observer: never controls the product or probe. Poll persisted ledger/JSON.
from pathlib import Path
import sys,json,time,datetime,re
base=Path(__file__).resolve().parent
surface=sys.argv[1]
ledger=base.parents[1]/'api-e2e-test-case-ledger.md'
output=base/surface/'delegated-launch-defaults-evidence.json'
observations=[]; seen=set(); deadline=time.monotonic()+1800
while time.monotonic()<deadline:
    for line in re.split(r'(?m)(?=^- )', ledger.read_text()):
        line=line.strip()
        if str(base/surface) not in line or ' Completed ' not in line or line in seen: continue
        seen.add(line)
        # The writer may already be writing the next JSON; retry a transient read, never infer Pass.
        for retry in range(30):
            try: data=json.loads(output.read_text()); break
            except (ValueError,FileNotFoundError): time.sleep(.01)
        case=line.split()[2]; result=data.get('cases',{}).get(case,{}).get('result')
        observations.append({'checkpoint':line,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'case':case,'persistedResult':result,'checkpointMatchesPersistedResult':f'Completed {result};' in line})
        assert result in ['Pass','Fail'] and observations[-1]['checkpointMatchesPersistedResult'],observations[-1]
    (base/f'{surface}-ledger-live-audit.json').write_text(json.dumps({'observations':observations,'completed':False},indent=2)+'\n')
    try: data=json.loads(output.read_text())
    except (ValueError,FileNotFoundError): data={}
    if data.get('completedAt'):
        (base/f'{surface}-ledger-live-audit.json').write_text(json.dumps({'observations':observations,'completed':True,'caseCount':len(data.get('cases',{}))},indent=2)+'\n')
        assert len(observations)==len(data.get('cases',{})),observations
        print(surface,len(observations),'completed checkpoints with already persisted result'); break
    time.sleep(.1)
else: raise SystemExit('Timed out observing probe completion; no result inferred')
