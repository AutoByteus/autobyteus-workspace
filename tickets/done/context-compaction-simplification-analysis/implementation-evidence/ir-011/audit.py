from pathlib import Path
import os,json,hashlib,subprocess,sys,shutil
R=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis')
T=R/'tickets/in-progress/context-compaction-simplification-analysis'
E=T/'implementation-evidence/ir-011'
env=dict(os.environ,GIT_OPTIONAL_LOCKS='0')
def git(*a): return subprocess.check_output(['git','-C',str(R),*a],env=env)
def pin(p):
 p=Path(p)
 return {'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} if p.is_file() else None
def state():
 ip=Path(git('rev-parse','--git-path','index').decode().strip());ip=ip if ip.is_absolute() else R/ip
 return {'HEAD':git('rev-parse','HEAD').decode().strip(),'MERGE_HEAD':git('rev-parse','MERGE_HEAD').decode().strip(),'branch':git('branch','--show-current').decode().strip(),'raw_index':pin(ip),'logical_index_sha256':hashlib.sha256(git('ls-files','--stage','-z')).hexdigest(),'stash':git('stash','list','--format=%H').decode(),'unmerged':git('ls-files','-u').decode()}
if sys.argv[1]=='entry':
 E.mkdir(exist_ok=False)
 refs=json.loads((T/'architecture-review-evidence/arch-rev-006/reference-index.json').read_text())['paths']
 source=[str(R/p) for p in git('ls-files','--cached','--others','--exclude-standard').decode().splitlines() if p.startswith(('autobyteus-ts/','autobyteus-server-ts/','autobyteus-web/','autobyteus-agent-presentation-contracts/','autobyteus-team-stream-contracts/','autobyteus-collaboration-stream-contracts/','test-support/'))]
 supplement=['autobyteus-ts/src/memory/turn-tracker.ts','autobyteus-ts/src/agent/factory/agent-factory.ts','autobyteus-server-ts/src/agent-memory/services/raw-trace-record-normalizer.ts','autobyteus-server-ts/src/run-history/projection/run-projection-dedupe.ts','autobyteus-server-ts/src/run-history/projection/historical-replay-event-identity.js']
 paths=sorted(set(refs+source+[str(R/p) for p in supplement if (R/p).is_file()]))
 (E/'entry-pins.json').write_text(json.dumps({p:pin(p) for p in paths},indent=2)+'\n')
 (E/'entry-git.json').write_text(json.dumps(state(),indent=2)+'\n')
 (E/'entry-status.txt').write_bytes(git('status','--porcelain=v1'))
 (E/'entry-index.txt').write_bytes(git('ls-files','--stage'))
 for name in ['requirements-doc.md','design-spec.md','implementation-handoff.md','implementation-revision-record.md','code-review-report.md','api-e2e-execution-coverage-report.md']:
  shutil.copy2(T/name,E/f'entry-{name}')
 (E/'incoming-reference-index.json').write_text(json.dumps({'paths':refs},indent=2)+'\n')
 print(json.dumps({'pins':len(paths),'incoming':len(refs),'missing':[p for p in paths if not Path(p).is_file()],'git':state()}))
else:
 pins=json.loads((E/'entry-pins.json').read_text());changes={p:{'before':v,'after':pin(p)} for p,v in pins.items() if v!=pin(p)}
 expected=[str(T/'implementation-handoff.md'),str(T/'implementation-revision-record.md')] + [str(R/x['path']) for x in json.loads((E/'source-inventory.json').read_text())] + [str(R/x['path']) for x in json.loads((E/'derived-delta.json').read_text())['changes']]
 result={'pin_count':len(pins),'changes':changes,'unexpected_changes':[p for p in changes if p not in expected],'git_before':json.loads((E/'entry-git.json').read_text()),'git_after':state()}
 result['git_unchanged']=result['git_before']==result['git_after']
 (E/'final-preservation.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'pins':len(pins),'changed':list(changes),'unexpected':result['unexpected_changes'],'git_unchanged':result['git_unchanged']}))
