# Ticket-owned execution evidence. Every invocation must be completed before the next.
import sys,os,subprocess,tempfile,json,time,signal,re
from pathlib import Path
from datetime import datetime,timezone
W=Path(__file__).resolve().parents[5];E=Path(__file__).resolve().parent;P=E.parent.parent
label,case,expected,*cmd=sys.argv[1:];expected=int(expected);ledger=E/'execution-ledger.md'
if (E/f'{label}.log').exists():raise RuntimeError('Refuse to overwrite an execution attempt')
def event(stage,result,observed):
 with ledger.open('a') as f:f.write(f'| {case} | {datetime.now(timezone.utc).isoformat()} | {stage} | {label}; clean HOME/TMPDIR | Expected exit {expected}; see plan | {str(observed).replace(chr(10)," ").replace("|","/")} | {result} | evidence/delivery/{label}.log/.resources.json |\n')
def processes():
 rows=[]
 for line in subprocess.check_output(['ps','-axo','pid,ppid,pgid,command'],text=True).splitlines()[1:]:
  a=line.strip().split(None,3)
  if len(a)==4:
   try:rows.append({'pid':int(a[0]),'ppid':int(a[1]),'pgid':int(a[2]),'command':a[3]})
   except ValueError:pass
 return rows
(E/f'{label}.command.json').write_text(json.dumps({'argv':cmd,'cwd':str(W),'expectedExit':expected,'environment':'PATH + fresh private HOME/TMPDIR + explicit TEST_DELIVERY_EXECUTION marker, target-only AGY_ERROR_EVIDENCE_DIR','RUN_CLAUDE_E2E':'absent','revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip()},indent=2)+'\n')
event('Started','N/A','Running')
with tempfile.TemporaryDirectory(prefix='delivery-fixture-types-') as root:
 root=Path(root);home=root/'home';tmp=root/'tmp';home.mkdir();tmp.mkdir()
 env={'PATH':os.environ['PATH'],'HOME':str(home),'TMPDIR':str(tmp),'TEST_DELIVERY_EXECUTION':label}
 if label.startswith('target'):
  frames=E/f'{label}-frames';frames.mkdir();env['AGY_ERROR_EVIDENCE_DIR']=str(frames)
 seen={};start=time.monotonic();timedout=False
 with (E/f'{label}.log').open('w') as out:
  child=subprocess.Popen(cmd,cwd=W,env=env,stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
  while child.poll() is None:
   for row in processes():
    if row['pgid']==child.pid:seen[row['pid']]=row
   if time.monotonic()-start>240:
    timedout=True;os.killpg(child.pid,signal.SIGTERM);break
   time.sleep(.08)
  try:code=child.wait(timeout=10)
  except subprocess.TimeoutExpired:os.killpg(child.pid,signal.SIGKILL);code=child.wait()
 remaining=[r for r in processes() if r['pgid']==child.pid]
 log=(E/f'{label}.log').read_text();clean=re.sub(r'\x1b\[[0-9;]*m','',log)
 paths=[str(v.relative_to(root)) for v in root.rglob('*')]
 data={'actualExit':code,'expectedExit':expected,'seconds':round(time.monotonic()-start,3),'timedout':timedout,'unhandledErrorMarker':bool(re.search('Unhandled Errors|Unhandled Rejection|uncaughtException',clean,re.I)),'compilerDiagnosticLines':[line for line in clean.splitlines() if re.search(r'error TS\d+:',line)],'ownedGroupRemaining':remaining,'ownedProcessesObserved':list(seen.values()),'privateRoot':str(root),'privateRootRemoved':False,'tmpNonCacheState':[x for x in paths if x.startswith('tmp/') and not x.startswith('tmp/node-compile-cache')],'workspaceRemnants':[x for x in paths if re.match(r'tmp/claude-(fake-ws|runtime-error|live-interrupt-ws|owned-sdk-test|prompt-equality)',x)]}
 (E/f'{label}.exit').write_text(str(code)+'\n')
data['privateRootRemoved']=not root.exists();(E/f'{label}.resources.json').write_text(json.dumps(data,indent=2)+'\n')
ok=code==expected and not timedout and not remaining and not data['unhandledErrorMarker'] and not data['workspaceRemnants']
event('Completed','Pass' if ok else 'Fail',f'actualExit={code}; {data["seconds"]}s; compilerDiagnostics={len(data["compilerDiagnosticLines"])}; unhandled={data["unhandledErrorMarker"]}; ownedRemaining={len(remaining)}; workspaces={len(data["workspaceRemnants"])}; rootRemoved={data["privateRootRemoved"]}')
print(json.dumps({k:data[k] for k in ['actualExit','expectedExit','seconds','compilerDiagnosticLines','unhandledErrorMarker','ownedGroupRemaining','workspaceRemnants','privateRootRemoved']},indent=2))
print('\n'.join(clean.splitlines()[-18:]));sys.exit(0 if ok else 1)
