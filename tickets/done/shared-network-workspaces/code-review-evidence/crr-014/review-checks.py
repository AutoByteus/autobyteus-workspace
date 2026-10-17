from pathlib import Path
import hashlib,json,os,shutil,subprocess,tempfile,time
R=Path(__file__).resolve().parents[5]
T=R/'tickets/in-progress/shared-network-workspaces'
E=T/'code-review-evidence/crr-014'
def git(*args): return subprocess.check_output(['git',*args],cwd=R).decode().strip()
def sha(b): return hashlib.sha256(b).hexdigest()
def write(name,data): (E/name).write_text(json.dumps(data,indent=2)+'\n')
base=git('rev-parse','f13bdd0')
source_paths=[
'autobyteus-web/components/fileExplorer/FileExplorerTabs.vue',
'autobyteus-web/components/fileExplorer/FileViewer.vue',
'autobyteus-web/components/fileExplorer/MonacoEditor.vue',
'autobyteus-web/stores/fileExplorer.ts',
'autobyteus-web/stores/fileExplorerState.ts',
'autobyteus-web/stores/fileExplorerContentActions.ts',
'autobyteus-web/stores/fileExplorerTreeActions.ts',
'autobyteus-web/stores/workspace.ts',
'autobyteus-web/stores/workspaceFileExplorerLiveActions.ts',
'autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts',
'autobyteus-web/utils/fileExplorer/fileUtils.ts',
]
canonical=['requirements-doc.md','approval-record-sr025.md','investigation-notes.md','solution-revision-record.md','design-spec.md','solution-design-handoff.md','design-review-report.md','architecture-review-revision-record.md','implementation-handoff.md','implementation-revision-record.md','code-review-report.md','code-review-revision-record.md','api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-test-case-ledger.md','api-e2e-revision-record.md']
e7=['ui-unsaved-peer-reproduction.json','ui-unsaved-save-control.json','unsaved-source-trace.md','unsaved-regression-result.json','unsaved-regression.log','LN-files-result.json','LD-files-v2-result.json','LN-mounted-api-result.json','LD-mounted-api-result.json','LN-lifecycle-resume-result.json','LD-lifecycle-v2-result.json','LD-lifecycle-upgrade-result.json','LN-source-detach-resume-result.json','LD-source-detach-result.json','cleanup.json','final-audit.json']
inputs=[R/p for p in source_paths]+[T/p for p in canonical]+[T/'evidence/api-e2e/api-rev-007'/p for p in e7]+[R/p for p in ['AGENTS.md','DESIGN.md','TESTING.md','autobyteus-web/AGENTS.md','autobyteus-web/vitest.config.mts','autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts','autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.spec.ts']]
rows=[{'path':str(p.relative_to(R)),'bytes':len(p.read_bytes()),'sha256':sha(p.read_bytes())} for p in inputs]
blobs=[]
for path in source_paths:
 old=subprocess.check_output(['git','show',base+':'+path],cwd=R)
 now=(R/path).read_bytes()
 blobs.append({'path':path,'baseSha256':sha(old),'currentSha256':sha(now),'identical':old==now})
audit={'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'statusBefore':git('status','--short'),'base':base,'baseIsAncestor':subprocess.run(['git','merge-base','--is-ancestor',base,'HEAD'],cwd=R).returncode==0,'initialAttempt':'Runner root was one parent short; FileNotFoundError before any test, scratch or audit write. Corrected to parents[5]. Not a product result.','basis':'Bounded failure-origin; equality proves pre-existing implementation, not a separate baseline runtime execution. No full cumulative evidence audit.','inputs':rows,'baselineProductionPath':blobs,'priorHistoryBytes':len((T/'code-review-revision-record.md').read_bytes()),'priorHistorySha256':sha((T/'code-review-revision-record.md').read_bytes())}
write('input-audit.json',audit)
assert all(x['identical'] for x in blobs)
cmd=['pnpm','-C','autobyteus-web','test:nuxt','components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts','components/fileExplorer/__tests__/FileExplorerTabs.spec.ts','--run','--maxWorkers=2']
scratch=Path(tempfile.mkdtemp(prefix='ab-nfs-crr014-'))
(scratch/'home').mkdir(); (scratch/'tmp').mkdir()
env={'PATH':os.environ['PATH'],'HOME':str(scratch/'home'),'TMPDIR':str(scratch/'tmp'),'LANG':'en_US.UTF-8','CI':'1','NO_COLOR':'1'}
start=time.time()
result={'argv':cmd,'cwd':str(R),'environmentKeys':sorted(env),'isolatedHome':str(scratch/'home'),'timeoutSeconds':180}
try:
 with (E/'unsaved-regression.log').open('w') as log:
  p=subprocess.run(cmd,cwd=R,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=180)
 result['exitCode']=p.returncode
except Exception as exc: result['exception']=repr(exc)
finally:
 result['seconds']=round(time.time()-start,3)
 shutil.rmtree(scratch)
 result['ownedScratchRemoved']=not scratch.exists()
 result['inputsUnchangedAfterExecution']=all(sha((R/x['path']).read_bytes())==x['sha256'] for x in rows)
 result['trackedDiffAfterExecution']=git('diff','--name-only')
 write('checks-result.json',result)
print(json.dumps({'baselineFilesIdentical':len(blobs),'inputs':len(rows),**result},indent=2))
