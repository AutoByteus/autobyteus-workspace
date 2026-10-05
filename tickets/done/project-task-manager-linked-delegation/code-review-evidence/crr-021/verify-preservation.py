import pathlib,json,hashlib,subprocess,os,datetime,re
W=pathlib.Path.cwd();T=W/'tickets/in-progress/project-task-manager-linked-delegation';C=T/'code-review-evidence/crr-021';state=json.loads((C/'input-preservation.json').read_text())
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'}
def git(*a):return subprocess.check_output(['git',*a],env=env)
changed=[p for p,h in state['referenceHashes'].items() if not pathlib.Path(p).is_file() or sha(p)!=h];assert changed==[str(T/'code-review-revision-record.md')],changed
assert sha(T/'code-review-report.md')==state['sourceReportHash']
for key,args in [('head',('rev-parse','HEAD')),('branch',('branch','--show-current')),('stash',('rev-parse','--verify','refs/stash'))]:assert git(*args).decode().strip()==state[key]
assert sha(state['indexPath'])==state['indexHash'];assert git('ls-files','--stage','-z')==(C/'input-stages.z').read_bytes();assert not git('ls-files','-u')
for args in [('diff','--check','HEAD'),('diff','--cached','--check')]:subprocess.run(['git',*args],check=True,env=env)
old=(C/'prior-revision-record.md').read_text();cur=(T/'code-review-revision-record.md').read_text();index=(C/'revision-index-row.txt').read_text();assert cur.count(index)==1
reconstructed=cur.replace(index,'',1).split('\n\n## CRR-021 — First proportional successful test-code result',1)[0];assert reconstructed.encode()==old.encode()
oldStatus=dict((row[3:],row[:2]) for row in (C/'input-status.z').read_bytes().decode().split('\0') if row)
currentStatus=dict((row[3:],row[:2]) for row in git('status','--porcelain=v1','-z','--untracked-files=all').decode().split('\0') if row)
assert all(currentStatus.get(p)==s for p,s in oldStatus.items()),'Existing dirty stage/status changed'
new=[p for p in currentStatus if p not in oldStatus];allowPrefix=str(C.relative_to(W))+'/'
assert all(p.startswith(allowPrefix) or p==str((T/'api-e2e-test-review-report.md').relative_to(W)) for p in new),new
rows=json.loads((C/'durable-scope.json').read_text());assert len(rows)==20 and all(sha(r['path'])==r['sha256'] for r in rows)
disabled=[]
for r in rows:
 if pathlib.Path(r['path']).suffix in ['.ts','.mjs']:
  for n,line in enumerate(pathlib.Path(r['path']).read_text().splitlines(),1):
   if re.search(r'\b(?:it|test|describe)\.(?:skip|todo|only)\b',line):disabled.append((r['relative'],n,line))
assert not disabled,disabled
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checkpoint':'Pre-result-return; not constraint on later authorized owner edits','incomingReferences':4167,'exactReferences':4166,'authorizedChangedReferences':changed,'all20DurableHashesExact':True,'sourceReportExact':True,'priorCRR001Through020ReconstructByteExact':True,'headBranchStashIndexBytesStagesExact':True,'zeroUnmerged':True,'diffHEADAndCachedCheckExit0':True,'existingDirtyStatusPreserved':True,'newFilesReviewerOwnedOnly':new,'disabledSelectedDurables':disabled,'noSourceTestAppDBCredentialOrGitWrites':True,'routing':'Requesting API owner result return only; explicit Delivery hold; no source/failure/rerun assignment'}
(C/'final-preservation.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['newFilesReviewerOwnedOnly','authorizedChangedReferences']},indent=2))
