import sys,os,subprocess,tempfile,json,time,signal,re
from pathlib import Path
from datetime import datetime,timezone
W=Path(__file__).resolve().parents[5]; E=Path(__file__).resolve().parent; P=E.parent.parent
label,group,*cmd=sys.argv[1:]; ledger=E/'execution-ledger.md'
def event(stage,result,detail):
    with ledger.open('a') as f:f.write(f'| {group} | {datetime.now(timezone.utc).isoformat()} | {stage} | {label}, clean HOME/TMPDIR; no gate/keys | See investigation | {detail.replace(chr(10)," ").replace("|","/")} | {result} | evidence/api-e2e/{label}.log; {label}.resources.json |\n')
def processes():
    lines=subprocess.check_output(['ps','-axo','pid,ppid,pgid,command'],text=True).splitlines()[1:]
    rows=[]
    for l in lines:
        a=l.strip().split(None,3)
        if len(a)==4:
            try:rows.append({'pid':int(a[0]),'ppid':int(a[1]),'pgid':int(a[2]),'command':a[3]})
            except ValueError:pass
    return rows
(E/f'{label}.command.json').write_text(json.dumps({'cwd':str(W),'argv':cmd,'environment':'PATH + new HOME/private TMPDIR + TEST_DELIVERY_EXECUTION; AGY_ERROR_EVIDENCE_DIR for target only; no inherited app variables/keys','gate':'RUN_CLAUDE_E2E absent','revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip()},indent=2)+'\n')
event('Started','N/A','Executing')
with tempfile.TemporaryDirectory(prefix='api-claude-validation-') as root:
    root=Path(root); home=root/'home'; tmp=root/'tmp';home.mkdir();tmp.mkdir()
    env={'PATH':os.environ['PATH'],'HOME':str(home),'TMPDIR':str(tmp),'TEST_DELIVERY_EXECUTION':label}
    if label.startswith('target'):
        frames=E/f'{label}-frames';frames.mkdir(); env['AGY_ERROR_EVIDENCE_DIR']=str(frames)
    before=processes(); seen={};start=time.monotonic(); timedout=False
    with (E/f'{label}.log').open('w') as out:
        p=subprocess.Popen(cmd,cwd=W,env=env,stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
        while p.poll() is None:
            for row in processes():
                if row['pgid']==p.pid:seen[row['pid']]=row
            if time.monotonic()-start>240:
                timedout=True;os.killpg(p.pid,signal.SIGTERM);break
            time.sleep(.075)
        try:code=p.wait(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid,signal.SIGKILL);code=p.wait()
    after=processes();remnants=[r for r in after if r['pgid']==p.pid]
    leftover=[str(v.relative_to(root)) for v in root.rglob('*')]
    cli=[r for r in seen.values() if re.search(r'\S*node\s+'+re.escape(str(W/'autobyteus-server-ts/tests/fixtures/claude-owned-sdk-cli.mjs'))+r'(?:\s|$)',r['command'])]
    data={'seconds':round(time.monotonic()-start,3),'exit':code,'timedout':timedout,'privateRoot':str(root),'privateStateEntryCountBeforeRemoval':len(leftover),'privateTopLevelStateBeforeRemoval':sorted(set('/'.join(v.split('/')[:2]) for v in leftover)),'privateTmpNonCacheStateBeforeRemoval':[v for v in leftover if v.startswith('tmp/') and not v.startswith('tmp/node-compile-cache')],'ownedGroupRemaining':remnants,'fixtureChildrenObserved':cli,'ownedProcessesObserved':list(seen.values()),'privateRootRemoved':False}
    log=(E/f'{label}.log').read_text()
    # No error masking, or skip/pass equivalence: result also reconciled with actual test summaries.
    data['unhandledErrorMarker']=bool(re.search('Unhandled Errors|Unhandled Rejection|uncaughtException',log,re.I))
    data['testWorkspaceRemnants']=[x for x in leftover if re.match(r'tmp/claude-(fake-ws|runtime-error|live-interrupt-ws|owned-sdk-test|held-child)',x)]
    (E/f'{label}.exit').write_text(str(code)+'\n')
# TemporaryDirectory deletes only wrapper-owned root after process evidence captured.
data['privateRootRemoved']=not root.exists();(E/f'{label}.resources.json').write_text(json.dumps(data,indent=2)+'\n')
ok=code==0 and not timedout and not remnants and not data['unhandledErrorMarker'] and not data['testWorkspaceRemnants']
event('Completed','Pass' if ok else 'Fail',f'exit={code}; {data["seconds"]}s; unhandled={data["unhandledErrorMarker"]}; groupRemaining={len(remnants)}; workspaceRemnants={len(data["testWorkspaceRemnants"])}; fixtureChildrenObserved={len(cli)}; privateRootRemoved={data["privateRootRemoved"]}')
print(json.dumps({k:data[k] for k in ['seconds','exit','timedout','unhandledErrorMarker','ownedGroupRemaining','fixtureChildrenObserved','testWorkspaceRemnants','privateRootRemoved']},indent=2))
print('\n'.join(log.splitlines()[-24:]))
sys.exit(0 if ok else 1)
