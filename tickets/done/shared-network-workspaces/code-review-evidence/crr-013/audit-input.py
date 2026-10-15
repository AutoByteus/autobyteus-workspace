from pathlib import Path
import hashlib,json,subprocess as sp
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent;I=T/'implementation-evidence/ir-009'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args):return sp.check_output(['git',*args],text=True).strip()
a=json.loads((I/'source-audit.json').read_text()); inp=json.loads((I/'input-audit.json').read_text()); pkg=json.loads((I/'package-index.json').read_text());build=json.loads((I/'build-result.json').read_text())
refs=pkg['reference_files'];assert len(refs)==len(set(refs))==1449
hashes={str(Path(p).relative_to(R)):sha(Path(p)) for p in refs}
for p,h in a['protectedInputFiles'].items(): assert sha(R/p)==h,p
for p,h in inp['preexistingUntrackedFiles'].items(): assert sha(R/p)==h,p
for f in inp['retainedArtifacts']+build['files']:
 p=Path(f['path']);assert sha(p)==f['sha256'] and p.stat().st_size==f['size'],str(p)
paths=git('diff','--name-only','7b2db1b','d3c88f3').splitlines();assert set(paths)=={r['path'] for r in a['delta']}
rows=[]
for p in paths:
 assert sha(R/p)==next(r['sha256'] for r in a['delta'] if r['path']==p)
 before=sp.run(['git','show','7b2db1b:'+p],text=True,capture_output=True).stdout
 base=sp.run(['git','show','f13bdd0eb79aacc63dffa5995b9c86f359001468:'+p],text=True,capture_output=True).stdout
 now=(R/p).read_text();delta=git('diff','--numstat','7b2db1b','d3c88f3','--',p).split()
 rows.append({'path':p,'sha256':sha(R/p),'baseNonempty':sum(bool(x.strip()) for x in base.splitlines()),'priorNonempty':sum(bool(x.strip()) for x in before.splitlines()),'nonempty':sum(bool(x.strip()) for x in now.splitlines()),'added':int(delta[0]),'removed':int(delta[1]),'production':p.endswith('.go') and not p.endswith('_test.go')})
for row in rows:
 if row['production']: assert row['nonempty']<=500 and row['added']+row['removed']<=220,row
(E/'input-audit.json').write_text(json.dumps({'head':git('rev-parse','HEAD'),'source':'d3c88f37c30ee74a89a95a4f6906992667c9b875','references':refs,'files':hashes,'delta':rows,'protectedCount':len(a['protectedInputFiles']),'oldArtifacts':inp['retainedArtifacts'],'newArtifacts':build['files'],'oldDist':inp['preexistingUntrackedFiles']},indent=2)+'\n')
(E/'prior-code-review-report-crr012.md').write_bytes((T/'code-review-report.md').read_bytes())
(E/'prior-history.sha256').write_text(sha(T/'code-review-revision-record.md')+'\n')
(E/'input-history-bytes.txt').write_text(str((T/'code-review-revision-record.md').stat().st_size)+'\n')
print(json.dumps({'refs':len(refs),'protected':len(a['protectedInputFiles']),'oldArtifacts':19,'currentArtifacts':4,'oldDist':len(inp['preexistingUntrackedFiles']),'delta':len(rows),'sourceFiles':sum(r['production'] for r in rows),'maxSourceNonempty':max(r['nonempty'] for r in rows if r['production'])}))
