import pathlib,json,hashlib,subprocess,os
R=pathlib.Path("/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis");T=pathlib.Path("/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis");E=T/'code-review-evidence/crr-016'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while True:
   chunk=f.read(1024*1024)
   if not chunk:break
   h.update(chunk)
 return h.hexdigest()
env=dict(os.environ,GIT_OPTIONAL_LOCKS='0')
def git(*a):return subprocess.check_output(['git',*a],cwd=R,env=env).decode()
entry=json.loads((E/'entry-git.json').read_text());pins=json.loads((E/'entry-pins.json').read_text())
allowed={str(T/'code-review-report.md'),str(T/'code-review-revision-record.md')}
changes=[];missing=[]
for s,h in pins.items():
 p=pathlib.Path(s)
 if not p.is_file(): missing.append(s)
 elif sha(p)!=h: changes.append(s)
idx=pathlib.Path(git('rev-parse','--git-path','index').strip());idx=idx if idx.is_absolute() else R/idx
state={'HEAD':git('rev-parse','HEAD').strip(),'MERGE_HEAD':git('rev-parse','MERGE_HEAD').strip(),'index_sha256':sha(idx),'logical_index':git('ls-files','--stage'),'stash':git('stash','list'),'staged_count':len(git('diff','--cached','--name-only').splitlines()),'unmerged':git('ls-files','-u')}
result={'checked_pins':len(pins),'changed':changes,'missing':missing,'unexpected':[s for s in changes if s not in allowed],'git_checks':{k:state[k]==entry[k] for k in state},'git_state':state,'note':'Standard server setup used designated disposable tests/.tmp database, no user DB. Final pinned differences limited to reviewer canonical source report and revision record. No original evidence rewritten.'}
(E/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n')
refs=set(json.loads((T/'implementation-evidence/ir-011/reference-index.json').read_text())['paths'])
refs.update(str(p) for p in E.rglob('*') if p.is_file())
refs.update(str(p) for p in [E/'reference-index.json',E/'reference-check.json'])
paths=sorted(refs)
(E/'reference-index.json').write_text(json.dumps({'revision':'CRR-016','paths':paths,'upstream_count':4542,'note':'Cumulative navigation, not a claim to reread every historical artifact.'},indent=2)+'\n')
(E/'reference-check.json').write_text(json.dumps({'count':len(paths),'missing':[s for s in paths if not pathlib.Path(s).is_file() and s!=str(E/'reference-check.json')]},indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='git_state'},indent=2))
print('References',len(paths))
assert not missing and not result['unexpected'] and all(result['git_checks'].values())

