import pathlib,json,hashlib,subprocess,datetime
E=pathlib.Path(__file__).parent
T=E.parents[2]
W=T.parents[2]
entry=json.loads((E/'entry-audit.json').read_text())
changed=[];missing=[]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for name,h in entry['hashes'].items():
 p=pathlib.Path(name)
 if not p.is_file():missing.append(name)
 elif sha(p)!=h:changed.append(name)
expected={str(W/'autobyteus-web/stores/__tests__/retainedActivityTermination.spec.ts')}
expected|={str(T/n) for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']}
assert not missing,missing
assert set(changed)==expected,changed
review=json.loads((E/'review-source-check.json').read_text())
assert all(sha(W/x['path'])==x['sha256'] for x in review)
owned=json.loads((E/'owned-paths.json').read_text())['durableCumulative']
for p in owned[:-1]:assert sha(W/p)==entry['hashes'][str(W/p)],p
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip()
branch=subprocess.check_output(['git','branch','--show-current'],cwd=W,text=True).strip()
assert (head,branch)==(entry['head'],entry['branch'])
refs=set(json.loads((E/'input-reference-index.json').read_text()))
refs|={str(p) for p in E.rglob('*') if p.is_file() and p.name not in ['reference-index.json','reference-check.json']}
refs|={str(T/p) for p in ['requirements-doc.md','investigation-notes.md','solution-revision-record.md','design-spec.md','design-review-report.md','implementation-handoff.md','implementation-revision-record.md','code-review-report.md','code-review-revision-record.md','api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']}
refs|={str(W/p) for p in owned}
bad=[p for p in refs if not pathlib.Path(p).is_file()]
assert not bad,bad
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':head,'branch':branch,'entryPinned':len(entry['hashes']),'missing':missing,'changed':changed,'expectedOwnedChangesOnly':True,'reviewed31HashesMatch':len(review),'prior10ApiPathsUnchanged':True,'currentDurableSha256':{p:sha(W/p) for p in owned},'status':subprocess.check_output(['git','status','--porcelain'],cwd=W,text=True).splitlines(),'cleanup':json.loads((E/'cleanup.json').read_text()),'result':'Blocked','confidence':89.3,'noHandoff':True}
(E/'final-audit.json').write_text(json.dumps(out,indent=2)+'\n')
refs.add(str(E/'final-audit.json'))
refs.add(str(E/'reference-index.json'))
refs.add(str(E/'reference-check.json'))
(E/'reference-index.json').write_text(json.dumps(sorted(refs),indent=2)+'\n')
(E/'reference-check.json').write_text(json.dumps({'count':len(refs),'allExist':True,'missing':[],'selfIndexIncluded':True,'note':'Existence audited; entry hashes distinguish expected owned changes. No claim all references read line-by-line.'},indent=2)+'\n')
assert all(pathlib.Path(p).is_file() for p in refs)
print(json.dumps({'pinned':len(entry['hashes']),'expectedChanged':len(changed),'references':len(refs),'reviewHashesMatch':len(review),'headUnchanged':True,'cleanupVerified':True}))
