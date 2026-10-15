from pathlib import Path
import json,hashlib,subprocess as s,re
E=Path(__file__).resolve().parent;T=E.parents[2];R=T.parents[2];a=json.loads((E/'input-audit.json').read_text());checks=[]
def h(p):
 b=Path(p).read_bytes();return {'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
def ck(name,value,details=None):
 checks.append({'check':name,'pass':bool(value),'details':details});assert value,(name,details)
for name in ('protected','dist'):
 bad=[p for p,v in a[name].items() if not Path(p).is_file() or h(p)!=v];ck(name+' byte/hash preservation',not bad,{'count':len(a[name]),'mismatch':bad})
ck('1302 incoming refs exist',len(a['reference_files'])==1302 and all(Path(p).is_file() for p in a['reference_files']))
ck('solution history exact prior byte prefix',(T/'solution-revision-record.md').read_bytes().startswith((E/'prior-solution-revision-record.md').read_bytes()))
p=json.loads((E/'prototype-result.json').read_text());o={x['label']:x for x in p['observations']};base=o['baseline'];boots=[o['ordinary-boot-'+str(i)] for i in (1,2,3)];bootlines=[x['bootAndHashes'].splitlines()[0] for x in [base]+boots]
ck('prototype complete with 11 observations',p['result']=='Pass' and len(o)==11)
ck('3 distinct ordinary boots and stable binding',len(set(bootlines))==4 and all(x['identity']==base['identity'] for x in boots),bootlines)
ck('actual raw device changed',any(x['deviceObservation']!=base['deviceObservation'] for x in boots),[x['deviceObservation'] for x in [base]+boots])
ck('original source hashes UID GID mode remain',all(x['bootAndHashes'].splitlines()[1:]==base['bootAndHashes'].splitlines()[1:] and [x[k] for k in ('uid','gid','mode')]==[base[k] for k in ('uid','gid','mode')] for x in boots+[o['final-original']]))
x=o['replacement-directory'];ck('actual directory replacement same UUID different inode',x['identity']['volumeUuid']==base['identity']['volumeUuid'] and x['identity']['inode']!=base['identity']['inode'] and x['bootAndHashes'].splitlines()[1:]==base['bootAndHashes'].splitlines()[1:])
x,y=o['APFS-volume-1'],o['APFS-volume-2'];ck('actual volume replacement with equal raw device/inode/content',x['deviceObservation']==y['deviceObservation'] and x['identity']['inode']==y['identity']['inode'] and x['identity']['volumeUuid']!=y['identity']['volumeUuid'] and x['bootAndHashes'].splitlines()[1:]==y['bootAndHashes'].splitlines()[1:])
ck('original volume restored',o['original-APFS-volume-reattached']['identity']==x['identity'])
ck('5 probe/comparison controls all refuse',len(p['controls'])==5 and all(x['refused'] for x in p['controls']))
# Independently inspect the recorded command observations for the 3 actual probe failures.
for msg in ('not real directory','symlink ancestor','permission denied'):
 ck('raw nonzero helper result: '+msg,any(q.get('rc',0)!=0 and msg in q.get('stdout','') for q in p['commands']))
c=json.loads((E/'cleanup.json').read_text());ck('exact-owned cleanup complete',c['result']=='Complete' and all(c[k] for k in ('ownCloneAbsent','ownProcessAbsent','ownScratchAbsent','publicBaselineRetained')))
ck('no own scratch remains',not Path(json.loads((E/'resource.json').read_text())['scratch']).exists())
for f in E.rglob('*.json'):json.loads(f.read_text())
ck('all SR023 JSON parse',True)
# Retain source/file instructions additionally inspected this round, without guessing future files.
additional=[R/'autobyteus-nfs/internal/platform/filesystem_linux.go',R/'autobyteus-nfs/internal/setup/plan.go',R/'autobyteus-nfs/internal/platform/commands.go']
refs=sorted(set(a['reference_files']+[str(x) for x in E.rglob('*') if x.is_file()]+[str(x) for x in additional if x.is_file()]+[str(E/'package-index.json'),str(E/'final-audit.json')]))
index={'round':'SR023','result':'Architecture Design Complete','requirements':'Approved SR018 unchanged','design':'Ready SR023','finding':'CR007 P1 / API-F005','task_size':'Large','architectural_risk':'High','route':'Reviewed', 'recipient_address':'/software_engineering_team/architecture_reviewer','incomingReferenceCount':1302,'referenceCount':len(refs),'reference_files':refs,'sourceCommit':'d65aeda24fc4b9a534a3941b194dd4a55b88c00c','inputHead':a['head'],'api':'API005 Fail57.14% / broaderRequired','notes':'Complete cumulative context; probe only, no product/independent API/physical Pass. Prior CR005/CR006 resolutions scoped retained.'}
(E/'package-index.json').write_text(json.dumps(index,indent=2)+'\n')
ck('all prior refs included',set(a['reference_files'])<=set(refs))
q=s.run(['git','diff','--name-only',a['head']],cwd=R,capture_output=True,text=True,check=True);allowed={str((T/n).relative_to(R)) for n in ('design-spec.md','investigation-notes.md','solution-revision-record.md','solution-design-handoff.md')};ck('tracked changes only owned solution docs',all(v in allowed or v.startswith(str(E.relative_to(R))+'/') for v in q.stdout.splitlines()),q.stdout.splitlines())
q=s.run(['git','diff','--check'],cwd=R,capture_output=True,text=True);ck('tracked diff whitespace',q.returncode==0,q.stdout+q.stderr)
manifest={p:h(p) for p in refs if Path(p).is_file() and p not in (str(E/'package-index.json'),str(E/'final-audit.json'))}
result={'result':'Pass','scope':'Artifact/source preservation and retained experiment evidence audit, not production tests','checks':checks,'referenceCount':len(refs),'manifest':manifest,'ownedAfter':{str(T/n):h(T/n) for n in ('design-spec.md','investigation-notes.md','solution-revision-record.md','solution-design-handoff.md')},'limits':'Product source unchanged; public API-F005 closure pending; no physical/release/user verification.'}
(E/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'result':'Pass','checks':len(checks),'references':len(refs),'protected':len(a['protected']),'dist':len(a['dist'])}))
