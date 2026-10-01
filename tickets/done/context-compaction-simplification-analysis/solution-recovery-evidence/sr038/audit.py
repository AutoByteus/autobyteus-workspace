from pathlib import Path
import json, hashlib, subprocess, datetime, difflib
W=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis')
P=W/'tickets/in-progress/context-compaction-simplification-analysis'; E=P/'solution-recovery-evidence/sr038'
def sha(p):
 return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def git(*args):
 return subprocess.check_output(['git','--no-optional-locks',*args],cwd=W,text=True)
base=json.loads((E/'entry-preservation.json').read_text())
changed=[{'path':k,'before':v,'after':sha(W/k)} for k,v in base['pins'].items() if sha(W/k)!=v]
allowed={str((P/n).relative_to(W)) for n in ['design-spec.md','investigation-notes.md','solution-revision-record.md','solution-progress-result.md']}
indexPath=Path(git('rev-parse','--git-path','index').strip())
if not indexPath.is_absolute():indexPath=W/indexPath
current={'head':git('rev-parse','HEAD'),'merge':git('rev-parse','MERGE_HEAD'),'branch':git('branch','--show-current'),'index':git('ls-files','--stage'),'stash':git('stash','list'),'indexSha256':sha(indexPath)}
gitcheck={k:current[k]==v for k,v in base['git'].items()}
assets={k:sha(Path(k))==v for k,v in base['buildAssets'].items()}
sourcecheck=[x['path'] for x in json.loads((E/'source-evidence.json').read_text()) if sha(Path(x['path']))!=x['sha256']]
result={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pinCount':len(base['pins']),'unchangedCount':len(base['pins'])-len(changed),'changed':changed,'allowedOwnedCanonicalPaths':sorted(allowed),'unexpectedChanged':[x for x in changed if x['path'] not in allowed],'gitUnchanged':gitcheck,'buildAssetsUnchanged':assets,'sourceEvidenceChanged':sourcecheck,'mergeInProgress':True,'stagedPaths':len(git('diff','--cached','--name-only').splitlines()),'unmergedEntries':len(git('ls-files','-u').splitlines()),'scope':'11,378 selected source/test/dist pins plus13 canonical artifacts; not a new test run or historical-evidence private-data census'}
(E/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n')
(E/'design-delta.diff').write_text(''.join(difflib.unified_diff((P/'history/design-spec.md.before-sr038.md').read_text().splitlines(True),(P/'design-spec.md').read_text().splitlines(True),fromfile='design-spec.md.before-sr038',tofile='design-spec.md.SR038')))
refs=set(json.loads((P/'implementation-evidence/ir-010/reference-index.json').read_text())['paths'])
refs.update(x['path'] for x in json.loads((E/'source-evidence.json').read_text()))
for n in ['architecture-identity-handoff.sr038.md','fresh-reproduction-request.sr036.md','diagnostic-reproduction.sr037.md','solution-progress-result.md','history/design-spec.md.unhanded-sr036-candidate.md']:
 refs.add(str(P/n))
for root in [P/'solution-recovery-evidence/sr036',E]:
 refs.update(str(x) for x in root.rglob('*') if x.is_file())
refs.update(str(x) for x in (P/'history').glob('*before-sr03[678].md'))
# Self-navigating index/check are created here; receipt added by rerun after actual send.
refs.update([str(E/'reference-index.json'),str(E/'reference-check.json')])
(E/'reference-index.json').write_text(json.dumps({'paths':sorted(refs)},indent=2)+'\n')
missing=[x for x in sorted(refs) if not Path(x).is_file() and x!=str(E/'reference-check.json')]
(E/'reference-check.json').write_text(json.dumps({'count':len(refs),'missing':missing},indent=2)+'\n')
print(json.dumps({'pins':result['pinCount'],'unchanged':result['unchangedCount'],'ownedChanged':[x['path'] for x in changed],'unexpected':result['unexpectedChanged'],'git':gitcheck,'build':all(assets.values()),'sourceEvidenceChanged':sourcecheck,'staged':result['stagedPaths'],'unmerged':result['unmergedEntries'],'references':len(refs),'missing':missing},indent=2))
assert not result['unexpectedChanged'] and all(gitcheck.values()) and all(assets.values()) and not sourcecheck and not missing
