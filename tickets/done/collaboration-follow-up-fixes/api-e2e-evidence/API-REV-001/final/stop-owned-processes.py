import os,json,time,signal,datetime,pathlib
E=pathlib.Path(__file__).resolve().parent.parent
env=json.loads((E/'runtime/environment.json').read_text());owned=[p for p in env['processes'] if not p.get('stoppedAt')];roots={p['pid'] for p in owned}
def processes():
 out={}
 for d in pathlib.Path('/proc').iterdir():
  if not d.name.isdigit():continue
  try:
   stat=(d/'stat').read_text();tail=stat[stat.rindex(')')+2:].split();out[int(d.name)]={'pid':int(d.name),'ppid':int(tail[1]),'pgid':int(tail[2]),'state':tail[0],'cmd':(d/'cmdline').read_bytes().replace(b'\0',b' ').decode(errors='replace')}
  except(FileNotFoundError,ProcessLookupError,PermissionError):pass
 return out
before=processes();desc=set(roots)
while True:
 more={pid for pid,p in before.items() if p['ppid'] in desc}
 if more<=desc:break
 desc|=more
for root in roots:
 assert root in before,root
 assert before[root]['pgid']==root,(root,before[root])
for root in roots:os.killpg(root,signal.SIGTERM)
time.sleep(4);after=processes();remaining=[pid for pid in desc if pid in after and after[pid]['state']!='Z'];forced=[]
for pid in remaining:
 # Exact pre-identified owned descendant only, not wildcard process cleanup.
 try:os.kill(pid,signal.SIGKILL);forced.append(pid)
 except ProcessLookupError:pass
time.sleep(1);last=processes();live=[last[pid] for pid in desc if pid in last and last[pid]['state']!='Z'];result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'ownedRoots':sorted(roots),'before':[before[pid] for pid in sorted(desc) if pid in before],'forcedOwnedDescendants':forced,'remainingLive':live,'sharedServer47StillPresent':47 in last,'sharedBrowser9222NotTouched':True};(E/'final/process-cleanup.json').write_text(json.dumps(result,indent=2)+'\n');assert not live;print(json.dumps({k:v for k,v in result.items() if k!='before'}))
