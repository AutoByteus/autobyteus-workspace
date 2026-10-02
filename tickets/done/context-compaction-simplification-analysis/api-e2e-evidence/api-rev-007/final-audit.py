from pathlib import Path
import json,hashlib,subprocess,datetime
e=Path(__file__).parent;t=e.parent.parent;w=t.parent.parent.parent
before=json.loads((e/'entry-audit.json').read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
missing=[p for p in before['hashes'] if not Path(p).is_file()]
changed=[p for p,h in before['hashes'].items() if Path(p).is_file() and sha(p)!=h]
allowed={str(t/n) for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']}
prior=json.loads((t/'api-e2e-evidence/api-rev-006/ir007-resume/final-audit.json').read_text())
api={p:sha(w/p)==h for p,h in prior['currentDurableSha256'].items()}
frozen=json.loads((e/'pre-live-hashes.json').read_text())
guard={p:sha(e/p)==h for p,h in frozen.items()}
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=w,text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=w,text=True).strip(),'pinned':len(before['hashes']),'missing':missing,'changed':changed,'onlyFourOwnedCanonicalChanges':set(changed)<=allowed,'all11ApiDurableUnchanged':all(api.values()),'apiPaths':api,'frozenPlanWrapperUnchanged':all(guard.values()),'frozenHashes':guard,'status':subprocess.check_output(['git','status','--porcelain'],cwd=w,text=True).splitlines()}
(e/'final-audit.json').write_text(json.dumps(out,indent=2)+'\n')
assert not missing,missing
assert set(changed)<=allowed,changed
assert all(api.values()) and all(guard.values())
assert out['head']==before['head'] and out['branch']==before['branch']
print(json.dumps({k:v for k,v in out.items() if k not in ['status','apiPaths','frozenHashes']}))
