from pathlib import Path
import hashlib,json,subprocess
r=Path.cwd();t=r/'tickets/in-progress/context-compaction-simplification-analysis';e=t/'code-review-evidence/crr-014'
a=json.loads((e/'entry-audit.json').read_text())
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
allowed={str(t/'code-review-report.md'):'canonical source result',str(t/'code-review-revision-record.md'):'cumulative CRR014 entry',str(t/'implementation-evidence/ir-009/server-overlap-final.log'):'disclosed reviewer-owned provenance loss / CRR014 replacement',str(t/'implementation-evidence/ir-009/web-overlap-final.log'):'disclosed reviewer-owned provenance loss / CRR014 replacement'}
changes=[]; missing=[]
for name,before in a['pins'].items():
 after=sha(Path(name))
 if after is None:missing.append(name)
 if after!=before:changes.append({'path':name,'entrySha256':before,'currentSha256':after,'disposition':allowed.get(name,'UNEXPECTED')})
git=lambda *args: subprocess.check_output(['git',*args],text=True)
checks={k:git(*args).removesuffix('\n')==a['git'][k] for k,args in {'head':['rev-parse','HEAD'],'merge_head':['rev-parse','MERGE_HEAD'],'index':['ls-files','-s'],'unmerged':['ls-files','-u'],'stash':['stash','list']}.items()}
api=[{'path':x['path'],'matchesIR009Pin':sha(r/x['path'])==x['after']} for x in json.loads((t/'implementation-evidence/ir-009/api-owner-preservation.json').read_text())]
source=[{'path':x['path'],'matchesIR009Pin':sha(r/x['path'])==x['sha256']} for x in json.loads((t/'implementation-evidence/ir-009/source-inventory.json').read_text())]
paths=[x['path'] for x in source]
dc=subprocess.run(['git','diff','--check','--',*paths],text=True,capture_output=True)
(e/'owned-diff-check.log').write_text(dc.stdout+dc.stderr);(e/'owned-diff-check.exit').write_text(str(dc.returncode)+'\n')
result={'inputPinCount':len(a['pins']),'changed':changes,'missing':missing,'unexpectedChanges':[x for x in changes if x['disposition']=='UNEXPECTED'],'gitUnchanged':checks,'stagedPathCount':len(git('diff','--cached','--name-only').splitlines()),'unmergedCount':len(git('ls-files','-u').splitlines()),'source31':source,'api12':api,'testReportUnchanged':sha(t/'api-e2e-test-review-report.md')==a['pins'][str(t/'api-e2e-test-review-report.md')],'ownedDiffCheckExit':dc.returncode,'claimLimit':'Two original IR009 raw logs lost; replacements are CRR014 reviewer reruns. All other entry-pinned artifacts unchanged except canonical review report/revision record. No blanket evidence-preservation claim.'}
(e/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n');(e/'final-status.txt').write_text(git('status','--porcelain=v1'))
print(json.dumps({k:v for k,v in result.items() if k not in ['source31','api12','changed']}));print(json.dumps(changes,indent=2));print('API',len(api),all(x['matchesIR009Pin'] for x in api),'source',len(source),all(x['matchesIR009Pin'] for x in source))
assert not missing and not result['unexpectedChanges'] and all(checks.values()) and all(x['matchesIR009Pin'] for x in source+api) and result['testReportUnchanged'] and dc.returncode==0
