from pathlib import Path
import json,hashlib,subprocess,os,datetime
W=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation')
T=W/'tickets/in-progress/project-task-manager-linked-delegation'; E=T/'code-review-evidence/crr-022'; I=T/'implementation-evidence/ir-011'
env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'}
def git(*a): return subprocess.check_output(['git',*a],cwd=W,env=env)
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
b=json.loads((E/'input-preservation.json').read_text())
allowed={str(T/'code-review-report.md'),str(T/'code-review-revision-record.md')}
missing=[]; changed=[]
for r in b['references']:
 p=Path(r['path'])
 if not p.is_file():missing.append(str(p))
 elif sha(p)!=r['sha256']:changed.append(str(p))
assert not missing,missing
assert set(changed)==allowed,changed
f=json.loads((I/'current-package-fingerprints.json').read_text())
for r in f:
 assert sha(r['path'])==r['sha256'],r['path']
 assert sha(r['snapshot'])==r['sha256'],r['snapshot']
a=json.loads((I/'accepted-candidate-fidelity.json').read_text())
for r in a:
 assert sha(r['acceptedSnapshot'])==r['acceptedHash'],r['acceptedSnapshot']
 assert sha(W/r['integratedPath'])==r['currentHash'],r['integratedPath']
d=json.loads((I/'durable-fidelity.json').read_text())
for r in d:
 assert sha(r['acceptedSnapshot'])==r['acceptedHash'],r
 assert sha(r['current'])==r['currentHash'],r
sa=json.loads((E/'full-source-size-audit.json').read_text())
for r in sa['rows']:assert sha(W/r['path'])==r['sha256'],r['path']
assert not sa['over500']
assert git('rev-parse','HEAD').decode().strip()==b['head']
assert git('rev-parse','MERGE_HEAD').decode().strip()==b['mergeHead']
assert git('branch','--show-current').decode().strip()==b['branch']
assert git('stash','list','--format=%H %gd %s').decode()==b['stash']
stages=git('ls-files','--stage','-z')
assert hashlib.sha256(stages).hexdigest()==b['stagesHash']
idx=Path(git('rev-parse','--git-path','index').decode().strip())
if not idx.is_absolute():idx=W/idx
assert sha(idx)==b['indexHash']
assert not git('ls-files','--unmerged')
prior=(E/'prior-code-review-revision-record.md').read_bytes()
assert (T/'code-review-revision-record.md').read_bytes().startswith(prior)
def status_records(data):
 s=data.split(b'\0');out=[];k=0
 while k<len(s):
  if not s[k]:k+=1;continue
  cur=s[k]; paths=[cur[3:]];k+=1
  if cur[:1] in [b'R',b'C'] or cur[1:2] in [b'R',b'C']:
   paths.append(s[k]);k+=1
  out.append((cur,tuple(paths)))
 return out
before=status_records((E/'input-status.z').read_bytes())
now=git('status','--porcelain','-z','--untracked-files=all')
after=status_records(now)
ticket=b'tickets/in-progress/project-task-manager-linked-delegation/'
owned=ticket+b'code-review-evidence/crr-022/'
# All prior statuses preserved; additional untracked files must be this review's evidence.
before_map={tuple(paths):cur for cur,paths in before}
after_map={tuple(paths):cur for cur,paths in after}
for paths,cur in before_map.items(): assert after_map.get(paths)==cur,(cur,paths,after_map.get(paths))
extra=[(cur,paths) for paths,cur in after_map.items() if paths not in before_map]
assert all(cur[:2]==b'??' and all(p.startswith(owned) for p in paths) for cur,paths in extra),extra
assert [(c,p) for c,p in before if not any(x.startswith(ticket) for x in p)]==[(c,p) for c,p in after if not any(x.startswith(ticket) for x in p)]
(E/'final-status.z').write_bytes(now)
cached=(E/'cached-diffcheck.log').read_bytes()
assert cached==(I/'integrated-diffcheck.log').read_bytes()
out={
 'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'incomingReferences':len(b['references']),'incomingExact':len(b['references'])-len(changed),'allowedChangedCanonicals':changed,'missing':missing,
 'currentPackageFingerprintsExact':len(f),'acceptedSnapshotsExact':len(a),'currentRenameAwareCandidateExactAgainstIR011':len(a),'durableSnapshotsAndCurrentIR011HashesExact':len(d),'fullCurrentSourceHashesExact':len(sa['rows']),
 'priorCRR001to021ExactPrefix':True,'priorSourceReportExactArchive':sha(E/'prior-code-review-report.md'),'priorTestReviewArchive':sha(E/'prior-api-e2e-test-review-report.md'),
 'HEAD':b['head'],'MERGE_HEAD':b['mergeHead'],'branch':b['branch'],'headMergeBranchStashExact':True,'indexHash':b['indexHash'],'indexExact':True,'stagesExact':True,'zeroUnmerged':True,'mergeStillPending':True,
 'allPriorStatusRecordsExact':len(before),'allNonTicketStatusRecordsExact':len([1 for c,p in before if not any(x.startswith(ticket) for x in p)]),'additionalFilesOnlyReviewerEvidence':len(extra),
 'unstagedDiffCheck':0,'cachedDiffCheck':2,'cachedWarningsExactIR011Supplied':True,
 'noSourceTestGitAppUserDataCredentialMutation':True,'scope':'Current local source-review checks; no API rerun or paid inference. Pending merge preserved.'
}
(E/'final-preservation.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
