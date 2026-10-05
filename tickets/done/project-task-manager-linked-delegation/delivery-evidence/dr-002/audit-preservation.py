import pathlib,json,hashlib,os,subprocess,datetime,shutil
w=pathlib.Path(__file__).resolve().parents[5];t=w/'tickets/in-progress/project-task-manager-linked-delegation';e=pathlib.Path(__file__).resolve().parent; b=w.parent/'.task-safety-backups/project-task-manager-linked-delegation/dr-002-latest-base'
env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'}
def git(*args):return subprocess.check_output(['git',*args],cwd=w,env=env)
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
pre=json.loads((b/'preservation.json').read_text()); docs=json.loads((e/'docs-change-provenance.json').read_text())
canonicals={str(t/n) for n in ['docs-sync-report.md','handoff-summary.md','release-deployment-report.md','delivery-revision-record.md']}
basepaths={str(w/pathlib.Path(p)) for p in git('diff','--name-only','4dee901d6163ca7053916fa1edc295afbfd7a6da','10fb69504f99a615e0728ffdd6c1fcab0104ff05').decode().splitlines()}
known=canonicals|{str(w/p) for p in docs}|basepaths
changed=[];missing=[];unexpected=[]
for p,h in pre['referenceHashes'].items():
 if not pathlib.Path(p).is_file():missing.append(p);continue
 current=sha(p)
 if current!=h:
  row={'path':p,'inputSha256':h,'currentSha256':current,'classification':'Delivery canonical update' if p in canonicals else 'Delivery docs sync' if p in {str(w/r) for r in docs} else 'Latest remote base integration' if p in basepaths else 'UNEXPECTED'}
  changed.append(row)
  if p not in known:unexpected.append(row)
package=[]
for p,h in pre['packageHashes'].items():
 if sha(p)!=h:package.append({'path':p,'beforeSha256':h,'afterSha256':sha(p),'expected':p in known})
durable=json.loads((t/'code-review-evidence/crr-023/durable-scope.json').read_text())
for d in durable:
 assert sha(d['current'])==d['currentHash'],d['current']
 assert sha(d['acceptedSnapshot'])==d['acceptedHash'],d['acceptedSnapshot']
for n in ['code-review-report.md','code-review-revision-record.md','api-e2e-test-review-report.md','api-e2e-execution-coverage-report.md','api-e2e-coverage-investigation.md','api-e2e-test-case-ledger.md','api-e2e-revision-record.md']:
 assert sha(t/n)==pre['referenceHashes'][str(t/n)],n
assert not missing and not unexpected and all(x['expected'] for x in package),(missing,unexpected,package)
assert git('rev-parse','HEAD').decode().strip()=='ccb5fbe3ca63b3542fa6538e035a4b1428c80788'
assert not git('ls-files','-u')
assert not git('diff','--cached','--name-only')
actual=set(git('diff','--name-only').decode().splitlines());assert actual==set(docs),(actual,set(docs))
assert git('stash','list','--format=%H %gs').decode().strip()==pre['stash'].strip()
index=pathlib.Path(git('rev-parse','--git-path','index').decode().strip()); index=index if index.is_absolute() else w/index
shutil.copy2(index,e/'post-integration-index')
for name,args in [('post-integration-stages.z',['ls-files','--stage','-z']),('post-integration-status.z',['status','--porcelain=v1','-z','--untracked-files=all']),('post-integration-staged.patch',['diff','--cached','--binary']),('post-integration-unstaged.patch',['diff','--binary'])]:
 (e/name).write_bytes(git(*args))
res={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'incomingReferences':len(pre['referenceHashes']),'allIncomingPresent':not missing,'missing':missing,'changes':changed,'unexpectedChanges':unexpected,'inputPackageFiles':len(pre['packageHashes']),'packageChanges':package,'all20CurrentDurablesExact':True,'all20OriginalAcceptedSnapshotsExact':True,'allSevenSourceTestAPIReportsExact':True,'DR001BodyExact':(t/'delivery-revision-record.md').read_text().split('### DR-001',1)[1].split('\n### DR-002',1)[0]==(e/'prior-delivery-revision-record.md').read_text().split('### DR-001',1)[1],'head':git('rev-parse','HEAD').decode().strip(),'branch':git('branch','--show-current').decode().strip(),'latestBase':git('rev-parse','origin/personal').decode().strip(),'pendingMerge':(index.parent/'MERGE_HEAD').exists(),'zeroUnmerged':True,'zeroStagedEdits':True,'unstagedDocsOnly':sorted(actual),'stashExact':True,'inputIndexSha256':pre['indexHash'],'currentIndexSha256':sha(index),'indexChangeExplanation':'Expected authorized local resolved/latest-base merge commits; input disclosed API17 stat-cache derivative archived, not restored or relabelled original-byte-exact. Optional Git locks disabled for read-only checks.','userAppPaidCredentialActions':False,'testDBScope':'Only preflighted disposable worktree Vitest database, not application/user DB; inherited bytes archived.'}
(e/'final-preservation.json').write_text(json.dumps(res,indent=2)+'\n')
print(json.dumps({k:res[k] for k in ['incomingReferences','allIncomingPresent','unexpectedChanges','inputPackageFiles','all20CurrentDurablesExact','allSevenSourceTestAPIReportsExact','DR001BodyExact','zeroUnmerged','zeroStagedEdits','pendingMerge']}));print('Expected incoming reference changes',len(changed),'package changes',len(package))
