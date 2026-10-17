# Final evidence/identity/owned-resource audit. Read-only except its own result receipt.
from pathlib import Path
import json,subprocess,re,hashlib,datetime,socket
base=Path(__file__).resolve().parent
w=base.parents[4]; ticket=base.parents[1]
expected={'desktop':['SSR-001','SSR-002','SSR-003','SSR-004','DCP-001','DCP-002','DCP-003','DCP-004','DCP-005'],
          'browser':['SSR-001','SSR-002','SSR-003','SSR-004','DCP-001','DCP-002','DCP-003']}
r={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'surfaces':{},'apiRoots':[]}
ledger=(ticket/'api-e2e-test-case-ledger.md').read_text()
for surface,ids in expected.items():
    d=json.loads((base/surface/'delegated-launch-defaults-evidence.json').read_text())
    assert list(d['cases'])==ids
    assert d['summary']=={'pass':len(ids),'fail':0},d.get('summary')
    assert not d.get('fatal') and d.get('browserErrors')==[] and d.get('completedAt')
    lines=[x.strip() for x in re.split(r'(?m)(?=^- )',ledger) if (str(base/surface)+'/' in x or str(base/surface)+'\n' in x) and (' Started ' in x or ' Completed ' in x)]
    events=[(x.split()[2],x.split()[3]) for x in lines]
    assert events==[(i,e) for i in ids for e in ['Started','Completed']],events
    if True:
        live=json.loads((base/f'{surface}-ledger-live-audit.json').read_text())
        assert live['completed'] and len(live['observations'])==len(ids)
        assert all(x['checkpointMatchesPersistedResult'] and x['persistedResult']=='Pass' for x in live['observations'])
    checkpoints=[x.strip() for x in re.split(r'(?m)(?=^- )',ledger) if ' Checkpoint ' in x and lines[0].split()[1] <= x.split()[1] <= lines[-1].split()[1]]
    assert [(x.split()[2],x.split()[3]) for x in checkpoints] == [(f'DCP-00{i}-{kind}', 'Checkpoint') for i in [1,2,3] for kind in ['copy','root']],checkpoints
    assert not Path(d['ownedRoot']).exists(),d['ownedRoot']
    ports=[]
    for url in [d['backendUrl'],d['frontUrl']]:
        m=re.search(r':(\d+)$',url)
        if m: ports.append(int(m[1]))
    identity=None
    if surface.startswith('desktop'):
        identity=json.loads((base/surface/'desktop-identity.json').read_text())
        assert identity['head']=='76fab065ec30bff5be76dd2e013243abda3a6934'
        assert identity['skipBuild'] is False
        assert identity['asarSha256']!='15ff98c7a607f6e33d814c9a63489d2c6c8d33bfb256de92a815c5f6ec53fab0'
        assert identity['asarSha256']!='55749a6189e5680f13bf5b2c254e50a6096a07ba1904dcc728055fab4116bc4b'
        assert hashlib.sha256(Path(identity['asar']).read_bytes()).hexdigest()==identity['asarSha256']
        stop=json.loads((base/surface/'desktop-stop.json').read_text())['result']
        assert all(stop[k] for k in ['controlPortReleased','serverPortReleased','dataRootRemoved'])
        assert not Path(identity['instance']['dataRoot']).exists()
        desktopProcess=subprocess.run(['ps','-p',str(identity['instance']['pid']),'-o','command='],capture_output=True,text=True)
        assert not desktopProcess.stdout.strip(),desktopProcess.stdout
        ports += [identity['instance']['controlPort'],identity['instance']['serverPort']]
    for port in ports:
        with socket.socket() as s: assert s.connect_ex(('127.0.0.1',port))!=0,port
    processes=[]
    for p in d['processes']:
        result=subprocess.run(['ps','-p',str(p['pid']),'-o','command='],capture_output=True,text=True)
        assert not result.stdout.strip(),result.stdout
        processes.append({**p,'absent':True})
    r['surfaces'][surface]={'caseOrder':ids,'summary':d['summary'],'oneStartedAndCompletedPerCase':True,
       'completedResultsObservedPersisted':True,'subcaseCheckpoints':checkpoints,'noPageErrors':True,'ownedRootRemoved':d['ownedRoot'],
       'releasedPorts':ports,'ownedProcesses':processes,'screenshotCount':len(list((base/surface).glob('*.png')))}
    if identity:r['surfaces'][surface].update({'sourceHead':identity['head'],'skipBuild':identity['skipBuild'],'asarSha256':identity['asarSha256'],'instanceId':identity['instance']['instanceId'],'desktopPidAbsent':identity['instance']['pid']})
log=re.sub(r'\x1b\[[0-9;]*m','',(base/'server-e2e.log').read_text())
for root in sorted({str(Path(x).resolve()) for x in re.findall(r'/[^\s\x1b]*?/T/dcm-e2e-[A-Za-z0-9_-]+',log)}):
    assert not Path(root).exists(),root
    r['apiRoots'].append({'root':root,'absent':True})
status=subprocess.check_output(['git','status','--short'],cwd=w,text=True)
r['status']=status
r['sourceDeltaSinceValidatedHead']=subprocess.check_output(['git','diff','--name-only','76fab065ec30bff5be76dd2e013243abda3a6934','--','autobyteus-web','autobyteus-server-ts'],cwd=w,text=True)
assert not r['sourceDeltaSinceValidatedHead']
r['result']='Pass'
(base/'validation-audit.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps(r,indent=2))
