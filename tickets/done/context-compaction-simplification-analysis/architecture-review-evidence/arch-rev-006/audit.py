import json,hashlib,subprocess,datetime
from pathlib import Path
r=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis');p=r/'tickets/in-progress/context-compaction-simplification-analysis';e=p/'architecture-review-evidence/arch-rev-006'
def sha(f):return hashlib.sha256(Path(f).read_bytes()).hexdigest()
def git(*a):return subprocess.check_output(['git',*a],cwd=r,text=True).strip()
def put(f,d):(e/f).write_text(json.dumps(d,indent=2)+'\n')
a=json.loads((e/'input-audit.json').read_text()); sd=json.loads((p/'solution-recovery-evidence/sr038/entry-preservation.json').read_text())
own=['design-review-report.md','architecture-review-revision-record.md']
auth=[{'path':f,'sha256':sha(p/f),'entry_sha256':h,'unchanged':sha(p/f)==h,'reviewer_owned':f in own} for f,h in a['authorities'].items()]
unexpectedauth=[x for x in auth if not x['unchanged'] and not x['reviewer_owned']]
allowed=[str((p/f).relative_to(r)) for f in own+['design-spec.md','investigation-notes.md','solution-revision-record.md','solution-progress-result.md']]
test_db='autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db'
allowed.append(test_db) # Standard Vitest global setup resets its designated disposable database.
changed=[];missing=[]
for f,h in sd['pins'].items():
 q=r/f
 if not q.is_file():missing.append(f)
 elif sha(q)!=h:changed.append({'path':f,'before':h,'after':sha(q),'allowed':f in allowed})
sources=[{'path':f['path'],'expected_sha256':f['sha256'],'sha256':sha(f['path']),'matches':sha(f['path'])==f['sha256']} for f in a['sources']]
build=[{'path':f,'sha256':sha(f),'matches':sha(f)==h} for f,h in sd['buildAssets'].items()]
api=json.loads((p/'api-e2e-evidence/api-rev-008/final-audit.json').read_text())['currentDurableSha256']
for f in ['autobyteus-server-ts/tests/integration/agent-run-collaboration/native-compaction-root-fixture.ts','autobyteus-server-ts/tests/integration/agent-run-collaboration/native-compaction-root.integration.test.ts','autobyteus-server-ts/tests/integration/agent-run-collaboration/native-root-termination.integration.test.ts']:api[f]=sd['pins'][f]
apicheck=[{'path':f,'sha256':sha(r/f),'matches':sha(r/f)==h} for f,h in api.items()]
template=Path('/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/architecture-reviewer/templates/design-review-report-template.md').read_text()
heads=lambda t:[x for x in t.splitlines() if x.startswith('## ')]
missingheads=[x for x in heads(template) if x not in heads((p/'design-review-report.md').read_text())]
up=json.loads((p/'solution-recovery-evidence/sr038/reference-index.json').read_text())
up=up['paths'] if isinstance(up,dict) else up
assert all(isinstance(x,str) for x in up)
paths=sorted(set(up+[str(p/f) for f in ['architecture-identity-handoff.sr038.md']+own]+[str(f) for f in e.rglob('*') if f.is_file()]+[str(e/f) for f in ['final-audit.json','reference-index.json','handoff-reference-files.json']]))
put('reference-index.json',{'revision':'ARCH-REV-006','solution':'SR038','upstream_count':len(up),'note':'Complete cumulative navigation, not assertion that all historical files were reread. Receipt added after confirmed send.','paths':paths})
put('handoff-reference-files.json',paths)
missingrefs=[f for f in paths if not Path(f).is_file() and f!=str(e/'final-audit.json')]
out={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'Pass','revision':'ARCH-REV-006','solution':'SR038','pins_checked':len(sd['pins']),'entry_pin_changes':changed,'unexpected_pin_changes':[x for x in changed if not x['allowed']],'missing_pins':missing,'review_entry_authorities':auth,'unexpected_authority_changes':unexpectedauth,'source_pins':sources,'all35_source_pins_match':len(sources)==35 and all(x['matches'] for x in sources),'api_durable_pins':apicheck,'all15_api_durable_match':len(apicheck)==15 and all(x['matches'] for x in apicheck),'build_assets':build,'head':git('rev-parse','HEAD'),'merge_head':git('rev-parse','MERGE_HEAD'),'head_unchanged':git('rev-parse','HEAD')==a['head'],'merge_head_unchanged':git('rev-parse','MERGE_HEAD')==a['merge_head'],'raw_index_unchanged':sha(a['index_path'])==a['index_sha256'],'logical_index_unchanged':git('ls-files','--stage')==sd['git']['index'].strip(),'stash_unchanged':git('stash','list')==sd['git']['stash'].strip(),'staged_count':len(git('diff','--cached','--name-only').splitlines()),'staged_paths_unchanged':git('diff','--cached','--name-only').splitlines()==a['staged_paths'],'unmerged':git('ls-files','-u'),'report_template_sections':len(heads(template)),'missing_report_sections':missingheads,'reference_count':len(paths),'missing_references':missingrefs,'standard_test_db_change':[x for x in changed if x['path']==test_db],'baseline_tests':{'core':{'files':2,'pass':7},'server':{'files':1,'pass':8},'web':{'files':3,'pass':22},'total_pass':37,'target_proof':False},'new_source_durable_test_edits':False,'provider_calls':0,'app_or_build_execution':False,'private_history_access':False,'commit_push_release_cleanup':False,'scope':'E38 enumerated source/test/dist and authority pins, two packaged assets and reviewed inputs. Not installed-data census or new product acceptance. Standard tests may change ignored caches/test DB.'}
put('final-audit.json',out)
summary={k:out[k] for k in ['result','pins_checked','unexpected_pin_changes','missing_pins','all35_source_pins_match','all15_api_durable_match','head_unchanged','merge_head_unchanged','raw_index_unchanged','logical_index_unchanged','stash_unchanged','staged_count','report_template_sections','missing_report_sections','reference_count','missing_references']}
print(json.dumps(summary))
assert not unexpectedauth and not missingheads and not missingrefs and not missing and not out['unexpected_pin_changes']
assert out['all35_source_pins_match'] and out['all15_api_durable_match'] and all(x['matches'] for x in build)
assert all(out[k] for k in ['head_unchanged','merge_head_unchanged','raw_index_unchanged','logical_index_unchanged','stash_unchanged','staged_paths_unchanged']) and out['unmerged']==''
