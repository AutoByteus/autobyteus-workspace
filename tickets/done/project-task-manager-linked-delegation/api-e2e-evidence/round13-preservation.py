from pathlib import Path
import json,hashlib,subprocess,datetime,sys
E=Path(__file__).resolve().parent;W=E.parents[3];T=E.parent
H=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
git=lambda *a:subprocess.check_output(['git',*a],cwd=W,env={**__import__('os').environ,'GIT_OPTIONAL_LOCKS':'0'})
inp=json.loads((E/'api-013-input-preservation.json').read_text());phase=sys.argv[1];incomingDirty={p:v for p,v in inp['dirty'].items() if not p.startswith('tickets/')}
head=git('rev-parse','HEAD').decode().strip();branch=git('branch','--show-current').decode().strip();idx=Path(git('rev-parse','--git-path','index').decode().strip());idx=idx if idx.is_absolute() else W/idx
debugCurrent=git('ls-files','--debug').decode();debugOld=__import__('subprocess').check_output(['git','ls-files','--debug'],cwd=W,env={**__import__('os').environ,'GIT_OPTIONAL_LOCKS':'0','GIT_INDEX_FILE':str(E/'api-013-input-index')}).decode();norm=lambda x:[l for l in x.splitlines() if not l.startswith('  ') or 'flags:' in l];flagsAndPathsExact=norm(debugCurrent)==norm(debugOld);indexExact=H(idx)==inp['indexSha256'];statAudit=json.loads((E/'api-013-index-stat-audit.json').read_text()) if (E/'api-013-index-stat-audit.json').exists() else {};semanticIndexExact=flagsAndPathsExact and (indexExact or statAudit.get('statCacheFieldsOnly',False));stagesExact=hashlib.sha256(git('ls-files','--stage','-z')).hexdigest()==inp['stagesSha256'];u=git('ls-files','-u').decode()
raw=git('status','--porcelain=v1','-z','--untracked-files=all');entries=raw.decode().split('\0');current={};n=0
while n<len(entries):
 x=entries[n];n+=1
 if not x:continue
 status,p=x[:2],x[3:]
 if 'R' in status or 'C' in status:n+=1
 if not p.startswith('tickets/'):current[p]={'status':status,'sha256':H(W/p) if (W/p).is_file() else None}
api={str(T/n) for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']};changes=[];missing=[]
for p,h in inp['references'].items():
 q=Path(p)
 if not q.is_file():missing.append(p)
 elif H(q)!=h:changes.append({'path':p,'inputSha256':h,'currentSha256':H(q),'authorizedAPICanonical':p in api})
cov=json.loads((E/'api-013-coverage-inventory.json').read_text());durable={p:H(W/p)==h for p,h in cov['currentHashes'].items()}
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'phase':phase,'head':head,'branch':branch,'indexExact':indexExact,'semanticIndexExact':semanticIndexExact,'indexStatAudit':str(E/'api-013-index-stat-audit.json'),'flagsAndPathsExact':flagsAndPathsExact,'stagesExact':stagesExact,'unmerged':u,'inputDirtyCount':len(incomingDirty),'currentDirtyCount':len(current),'dirtyStatusHashesExact':current==incomingDirty,'dirtyDifferences':sorted(p for p in set(current)|set(incomingDirty) if current.get(p)!=incomingDirty.get(p)),'inputReferenceCount':len(inp['references']),'missingIncomingReferences':missing,'changedIncomingReferences':changes,'cumulative20DurableCurrentHashesExact':all(durable.values()),'durableHashes':durable,'noAPIProductionDurableOrGitEdit':True}
(E/f'api-013-{phase}-preservation.json').write_text(json.dumps(out,indent=2)+'\n');(E/f'api-013-{phase}-git-status.txt').write_bytes(git('status','--porcelain=v1','--untracked-files=all'))
assert head==inp['head'] and branch==inp['branch'] and semanticIndexExact and stagesExact and not u;assert current==incomingDirty,out['dirtyDifferences'];assert not missing and all(x['authorizedAPICanonical'] for x in changes);assert all(durable.values()) and len(durable)==20
print(json.dumps({k:out[k] for k in ['head','indexExact','stagesExact','inputDirtyCount','currentDirtyCount','dirtyStatusHashesExact','inputReferenceCount','missingIncomingReferences','cumulative20DurableCurrentHashesExact']}))
