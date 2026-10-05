from pathlib import Path
import hashlib,json,subprocess

W=Path.cwd(); T=W/'tickets/in-progress/project-task-manager-linked-delegation'; C=T/'code-review-evidence'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
git=lambda *a:subprocess.check_output(['git',*a],cwd=W)
x=json.loads((C/'crr-020-input-preservation.json').read_text())
allowed={str(T/'code-review-report.md'),str(T/'code-review-revision-record.md')}
changed=[r['path'] for r in x['references'] if not Path(r['path']).is_file() or sha(r['path'])!=r['sha256']]
assert set(changed)==allowed,changed
raw=git('status','--porcelain=v1','-z');rows=raw.split(b'\0');dirty=[];i=0
while i<len(rows) and rows[i]:
    row=rows[i].decode();s=row[:2];p=row[3:];i+=1
    if 'R' in s or 'C' in s:i+=1
    if p.startswith('tickets/'):continue
    target=W/p
    for f in ([target] if target.is_file() else sorted(target.rglob('*')) if target.is_dir() else []):
        if f.is_file():dirty.append({'path':str(f.relative_to(W)),'status':s,'sha256':sha(f)})
assert dirty==x['dirty'],'Candidate/status bytes changed during Reviewer work'
idx=Path(git('rev-parse','--git-path','index').decode().strip());idx=idx if idx.is_absolute() else W/idx
assert sha(idx)==x['indexSha256']
assert hashlib.sha256(git('ls-files','--stage')).hexdigest()==x['stagesSha256']
assert git('rev-parse','HEAD').decode().strip()==x['head']
assert git('branch','--show-current').decode().strip()==x['branch']
assert git('stash','list').decode()==x['stash']
assert not git('ls-files','-u')
checks=[subprocess.run(['git','diff','--check','HEAD'],cwd=W).returncode,subprocess.run(['git','diff','--cached','--check'],cwd=W).returncode]; assert checks==[0,0]
prior=(C/'crr-020-prior-revision-record.md').read_text();current=(T/'code-review-revision-record.md').read_text()
prefix=current.split('\n## CRR-020 —')[0]
prefix=''.join(l for l in prefix.splitlines(keepends=True) if not l.startswith('| **CRR-020** |'))
assert prefix==prior, 'Prior CRR001–019 chronology not byte-preserved'
old=dict((r['path'],r['sha256']) for r in x['references'])
assert sha(C/'crr-020-prior-canonical-report.md')==old[str(T/'code-review-report.md')]
assert sha(C/'crr-020-prior-revision-record.md')==old[str(T/'code-review-revision-record.md')]
a=json.loads((C/'crr-020-size-audit.json').read_text());api=a['apiDurable20'];assert len(api)==20 and all(sha(W/p)==h for p,h in api.items())
assert all(sha(W/r['path'])==r['sha256'] for r in a['rows'])
out={'scope':'Reviewer checkpoint before primary API handoff; authorized downstream changes after handoff are not Reviewer drift','head':x['head'],'branch':x['branch'],'stashUnchanged':True,'indexUnchanged':True,'stagesUnchanged':True,'zeroUnmerged':True,'diffAndCachedChecks':checks,'incomingReferences':len(x['references']),'exactIncomingReferences':len(x['references'])-len(changed),'authorizedChangedReferences':changed,'currentCandidate':len(dirty),'allCandidateBytesAndStatusExact':True,'all136SourceHashesStable':True,'apiDurable20Exact':True,'priorCRR001Through019Exact':True,'priorCanonicalArchivesExact':True,'reviewerSourceTestIndexCommitSDKCredentialAppEdits':False}
(C/'crr-020-final-preservation.json').write_text(json.dumps(out,indent=2)+'\n');(C/'crr-020-final-status.z').write_bytes(raw);print(json.dumps(out,indent=2))
