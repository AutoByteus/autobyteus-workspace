import hashlib,json,os,subprocess
from pathlib import Path
r=Path(__file__).resolve().parents[5];t=r/'tickets/in-progress/context-compaction-simplification-analysis';e=t/'code-review-evidence/crr-017'
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for c in iter(lambda:f.read(1048576),b''):h.update(c)
 return h.hexdigest()
def git(*args):
 return subprocess.check_output(['git',*args],env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'},text=True)
pins=json.loads((e/'entry-pins.json').read_text());old=json.loads((e/'entry-git.json').read_text())
allowed={str(t/'code-review-report.md'),str(t/'code-review-revision-record.md')}
changed=[];missing=[]
for p,h in pins.items():
 if not Path(p).is_file():missing.append(p)
 elif sha(p)!=h:changed.append(p)
logical=git('ls-files','--stage')
now={'HEAD':git('rev-parse','HEAD').strip(),'MERGE_HEAD':git('rev-parse','MERGE_HEAD').strip(),'index_sha256':sha(Path(git('rev-parse','--git-path','index').strip())),'logical_index_sha256':hashlib.sha256(logical.encode()).hexdigest(),'stash':git('stash','list'),'staged_count':len(git('diff','--cached','--name-only').splitlines()),'unmerged':git('ls-files','-u')}
g={k:now[k]==old[k] for k in now};unexpected=[p for p in changed if p not in allowed]
protected=json.loads((e/'protected-owner-check.json').read_text())
pc=[{'path':x['path'],'matches':sha(x['path'])==x['api010_sha256']} for x in protected]
result={'pins':len(pins),'unchanged':len(pins)-len(changed)-len(missing),'changed':changed,'missing':missing,'unexpected':unexpected,'git_matches':g,'HEAD':now['HEAD'],'MERGE_HEAD':now['MERGE_HEAD'],'staged_count':now['staged_count'],'unmerged_count':len(now['unmerged'].splitlines()),'protected':pc,'scope':'Pre-handoff audit; reviewer evidence created separately. No downstream freeze claim.'}
result['Pass']=not missing and not unexpected and all(g.values()) and all(x['matches'] for x in pc)
(e/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='protected'},indent=2))
assert result['Pass']
