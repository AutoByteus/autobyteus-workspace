import pathlib,json,os,stat,hashlib,gzip,subprocess,datetime
C=pathlib.Path('/Users/normy/autobyteus_org/autobyteus-release-checkouts/org-run-config-performance-beta');A=C/'tickets/done/org-run-config-performance';D=A/'evidence/delivery-dr005';U=pathlib.Path(__file__).parent;W=pathlib.Path('/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance');S=pathlib.Path('/Users/normy/autobyteus_org/autobyteus-workspace-superrepo');q=json.loads((D/'cleanup-custody-and-inventory.json').read_text())
def git(*a,cwd=W):return subprocess.check_output(['git',*a],cwd=cwd,text=True).rstrip('\n')
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def cmd(args,log,cwd):
 with open(D/log,'w') as f:r=subprocess.run(args,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
 assert r.returncode==0,(args,r.returncode)
 return {'argv':args,'cwd':str(cwd),'exitCode':r.returncode,'log':str(D/log)}
assert W.resolve()==W and not W.is_symlink()
assert git('rev-parse','HEAD')==q['currentWorktreeHead']
assert git('status','--short')==q['currentWorktreeStatus']
assert git('diff','--name-only')=='SOLUTION_DESIGN_BEST_PRACTICES.md' and not git('diff','--cached','--name-only')
assert sha(W/'SOLUTION_DESIGN_BEST_PRACTICES.md')=='34476762da34b5f06ea84f78e5972880b006e18535c330b5b76a8c5ec3a6089a'
for v in q['guideVersions']:assert sha(v['path'])==v['sha256']
for v in q['generatedOutputCustody']:assert sha(W/v['originalRelativePath'])==v['sha256']==sha(v['custody'])
rows=[]
for rel in q['roots']:
 p=W/rel;files=[]
 if p.is_dir() and not p.is_symlink():
  for root,dirs,names in os.walk(p,followlinks=False):
   for name in dirs+names:files.append(pathlib.Path(root)/name)
 else:files=[p]
 for f in sorted(files):
  st=f.lstat();rows.append([str(f.relative_to(W)),stat.S_IFMT(st.st_mode),st.st_size,st.st_mtime_ns,os.readlink(f) if f.is_symlink() else None])
rows.sort(key=lambda x:x[0]);fingerprint=hashlib.sha256(json.dumps(rows,separators=(',',':')).encode()).hexdigest();assert fingerprint==q['metadataFingerprint'],'Unexpected generated-root metadata/bytes indicator; preserve and stop'
with gzip.open(q['independentInventory'],'rb') as f:assert hashlib.sha256(f.read()).hexdigest()==fingerprint
cmd(['git','fetch','origin','personal'],'shared-reachability-refresh.log',S)
assert subprocess.run(['git','merge-base','--is-ancestor',q['currentWorktreeHead'],'origin/personal'],cwd=S).returncode==0
assert git('rev-parse','codex/org-run-config-performance',cwd=S)==q['currentWorktreeHead']
assert git('rev-parse','HEAD',cwd=S)==q['sharedHeadBefore']
for p,h in q['sharedDirtyTrackedHashesBefore'].items():assert sha(S/p)==h
ps=subprocess.check_output(['ps','-axo','pid,ppid,command'],text=True);suspect=[l for l in ps.splitlines() if str(W) in l and not any(x in l for x in ['guarded-cleanup.py','python3 -','bash -l'])];assert not suspect,suspect
lsof=subprocess.run(['lsof','-a','-d','cwd','-Fpn'],capture_output=True,text=True);active=[l[1:] for l in lsof.stdout.splitlines() if l.startswith('n') and (l[1:]==str(W) or l[1:].startswith(str(W)+'/'))];assert not active,active
# Fresh top-level ignored roots must not acquire another resource class.
ignored=git('status','--short','--ignored');known=[x for x in q['roots'] if x not in q['knownEmptyDataRoots'] and x!='autobyteus-application-sdk-contracts/dist/'];assert sorted(l[3:] for l in ignored.splitlines() if l.startswith('!! '))==sorted(known)
idx=json.loads((A/'evidence/delivery-package-index.json').read_text());assert all(pathlib.Path(p).is_file() for p in idx['references'])
# The only force exception is the exact owner-released guide + identified generated outputs.
pre={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'Fresh guard Pass','guideHash':'34476762da34b5f06ea84f78e5972880b006e18535c330b5b76a8c5ec3a6089a','head':q['currentWorktreeHead'],'status':q['currentWorktreeStatus'],'candidateReachable':True,'metadataRows':len(rows),'metadataFingerprintMatches':True,'all55PreservedGeneratedFilesMatch':True,'ownerDispositionVerified':True,'noProcessCwdOrCommandDependencyUnderOldWorktree':True,'allPrior1019ArchiveReferencesStillExist':True,'forceScope':'Only this exact registered old ticket worktree, with independently preserved owner-released guide and inventoried generated outputs; no blanket unknown removal'};(D/'immediate-pre-removal-guard.json').write_text(json.dumps(pre,indent=2)+'\n')
operations=[];operations.append(cmd(['git','worktree','remove','--force',str(W)],'worktree-removal.log',S))
assert not W.exists();assert ('worktree '+str(W)+'\n') not in git('worktree','list','--porcelain',cwd=S)
assert subprocess.run(['git','merge-base','--is-ancestor','codex/org-run-config-performance','origin/personal'],cwd=S).returncode==0
operations.append(cmd(['git','branch','-D','codex/org-run-config-performance'],'shared-local-branch-removal.log',S))
assert subprocess.run(['git','merge-base','--is-ancestor','codex/org-run-config-performance','personal'],cwd=C).returncode==0
operations.append(cmd(['git','branch','-d','codex/org-run-config-performance'],'clone-local-branch-removal.log',C))
assert not git('branch','--list','codex/org-run-config-performance',cwd=S) and not git('branch','--list','codex/org-run-config-performance',cwd=C)
assert git('rev-parse','HEAD',cwd=S)==q['sharedHeadBefore']
for p,h in q['sharedDirtyTrackedHashesBefore'].items():assert sha(S/p)==h
assert sha(C/'SOLUTION_DESIGN_BEST_PRACTICES.md')=='ff6d2e1ecad2f475f79b9581ade6cbe53c96f3e414323e0266762ac999cc9342'
for p in idx['references']:assert pathlib.Path(p).is_file()
result={'revision':'DR-005','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'Completed','worktreeRemoved':str(W),'ownRegistrationRemoved':True,'broadPrune':'Not required: git worktree remove already removes its registration; no other owner metadata pruned','localTicketBranchesRemovedFromSharedAndClone':True,'remoteTicketBranch':'Not required to delete; finalized2eb8732 branch retained for provenance','forceJustification':pre['forceScope'],'independentGuideAndGeneratedCustodyStillExists':True,'sharedHeadAndDirtyTrackedHashesUnchanged':True,'sharedCheckoutFilesIndexUntouched':True,'durablePublishedCheckoutRetained':str(C),'guideLaterImprovementStillNotInPublishedTag':True,'sourceOrRuntimeChanges':False,'newReleaseAcceptanceOrValidationReplay':False,'commands':operations};(D/'cleanup-result.json').write_text(json.dumps(result,indent=2)+'\n');print('DR005 bounded worktree/registration/local-branch cleanup Completed; all custody/archive preserved; shared dirty bytes/HEAD unchanged; no release/source replay.')
