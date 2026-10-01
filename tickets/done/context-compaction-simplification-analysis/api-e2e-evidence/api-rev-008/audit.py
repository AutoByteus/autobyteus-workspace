from pathlib import Path
import datetime, difflib, hashlib, json, re, subprocess
e=Path(__file__).resolve().parent;w=e.parents[4];t=e.parents[1]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
entry=json.loads((e/'entry-audit.json').read_text())
allowed={str(w/p) for p in entry['plannedDurableEdits']}|{str(t/p) for p in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']}
missing=[p for p in entry['sha256'] if not Path(p).is_file()]
changed=[p for p,s in entry['sha256'].items() if Path(p).is_file() and sha(p)!=s]
unexpected=[p for p in changed if p not in allowed]
flag='directSummaryShieldOmissionPressureVerified'
for r,count in [(entry['plannedDurableEdits'][0],2),(entry['plannedDurableEdits'][1],1)]:
 before=(e/'before'/r).read_text();after=(w/r).read_text()
 lines=before.splitlines(True)
 assert sum(flag in l for l in lines)==count
 assert ''.join(l for l in lines if flag not in l)==after
r=entry['plannedDurableEdits'][2]
before=(e/'before'/r).read_text();after=(w/r).read_text()
assert flag not in before and flag in after
insert=after.replace(before[:before.index("  it.each(['deepseek")],'',1)
# Verify every original line remains in original order; only the guard block is added.
diff=list(difflib.ndiff(before.splitlines(),after.splitlines()))
assert not [l for l in diff if l.startswith('- ')]
for case,code in [('API008-TR001-RED',1),('API008-TR001-GREEN',0),('API008-C01',0)]:
 d=json.loads((e/(case+'.json')).read_text());assert d['exitCode']==code and d['cwd']==str(w)
assert '2 failed | 8 skipped (10)' in (e/'API008-TR001-RED.log').read_text()
assert '2 passed | 8 skipped (10)' in (e/'API008-TR001-GREEN.log').read_text()
assert '30 passed (30)' in (e/'API008-C01.log').read_text()
anno=json.loads((e/'historical-claim-annotation.json').read_text())
assert sha(anno['source'])==anno['sourceSha256']==entry['sha256'][anno['source']]
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=w,text=True).strip()
branch=subprocess.check_output(['git','branch','--show-current'],cwd=w,text=True).strip()
paths=json.loads((e/'review-paths.json').read_text());assert len(paths)==len(set(paths))==12
hashes={p:sha(w/p) for p in paths}
unchangedDurable=[p for p in paths if hashes[p]==entry['sha256'].get(str(w/p))]
assert len(unchangedDurable)==9
# Cumulative pending diff against HEAD including files added in previous API rounds.
patch=[]
for p in paths:
 base=subprocess.run(['git','show','HEAD:'+p],cwd=w,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 patch.extend(difflib.unified_diff(base.stdout.splitlines(True) if base.returncode==0 else [],(w/p).read_text().splitlines(True),fromfile='HEAD/'+p,tofile='worktree/'+p))
(e/'cumulative-durable-tests.patch').write_text(''.join(patch))
check=subprocess.run(['git','diff','--check','--',*paths],cwd=w,capture_output=True,text=True)
(e/'owned-diff-check.log').write_text(check.stdout+check.stderr)
(e/'owned-diff-check.exit').write_text(str(check.returncode)+'\n')
# Logs expose owned temp flow workspaces; verify only these roots are now absent.
roots=sorted(set(re.findall(r'Created metadata-only FileSystemWorkspace at (.+?)/workspace\.',(e/'API008-C01.log').read_text())))
cleanup={'ownedFlowTemporaryRoots':[{'path':p,'exists':Path(p).exists()} for p in roots],'newProviderCampaigns':0,'newUiSessions':0,'newServices':0,'databasePolicy':'Standard worktree-designated tests/.tmp/autobyteus-server-test.db retained; normal global setup reset test database. No user data involved.'}
(e/'cleanup.json').write_text(json.dumps(cleanup,indent=2)+'\n')
assert roots and all(not Path(p).exists() for p in roots)
assert not missing and not unexpected and len(changed)==7
assert head==entry['head'] and branch==entry['branch'] and check.returncode==0
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'Pass','inputReferenceCount':entry['inputReferenceCount'],'missing':missing,'allowedChangedPins':changed,'unexpectedChangedPins':unexpected,'head':head,'branch':branch,'productionPromptReviewAndOriginalLogPinsUnchanged':True,'historicalFlowLogSha256':anno['sourceSha256'],'exactProducerConsumerDelta':'Only two producer/type lines and one consumer assertion line removed; generic JSON serializer unchanged','newRegressionDelta':'Only 19 added lines, no original boundary cases/assertions removed','currentDurableSha256':hashes,'cumulativeDurablePaths':12,'unchangedDurablePaths':unchangedDurable,'ownedDiffCheckExit':check.returncode,'cleanup':cleanup,'scope':'No reexecution of real-provider/UI flows; source guard is reporting-contract evidence only'}
(e/'final-audit.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:out[k] for k in ['result','inputReferenceCount','missing','unexpectedChangedPins','head','cumulativeDurablePaths','ownedDiffCheckExit']},indent=2))
print('Changed pins:',len(changed),'Unchanged durable paths:',len(unchangedDurable))
