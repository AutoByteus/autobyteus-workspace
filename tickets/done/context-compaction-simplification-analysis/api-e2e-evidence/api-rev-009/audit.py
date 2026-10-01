from pathlib import Path
import hashlib,json,subprocess,datetime,collections
e=Path(__file__).resolve().parent; w=e.parents[4]
entry=json.loads((e/'entry-audit.json').read_text())
def sha(p):
 h=hashlib.sha256()
 with Path(p).open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def git(*a):return subprocess.check_output(['git',*a],cwd=w).decode()
changed=[]
for s,old in entry['pins'].items():
 p=Path(s); new=sha(p) if p.is_file() else None
 if old!=new:changed.append({'path':s,'before':old,'after':new})
index=Path(git('rev-parse','--git-path','index').strip())
if not index.is_absolute():index=w/index
current={'HEAD':git('rev-parse','HEAD').strip(),'MERGE_HEAD':git('rev-parse','MERGE_HEAD').strip(),'indexSha256':sha(index),'indexEntriesSha256':hashlib.sha256(subprocess.check_output(['git','ls-files','-s'],cwd=w)).hexdigest(),'stagedCount':len(git('diff','--cached','--name-only').splitlines()),'unmerged':git('ls-files','-u'),'stash':git('stash','list')}
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pinsChecked':len(entry['pins']),'git':current,'gitCompared':{k:current[k]==entry[k] for k in current},'changedPins':changed}
(e/'final-audit.json').write_text(json.dumps(report,indent=2)+'\n')
(e/'final-status.txt').write_text(git('status','--short','--untracked-files=all'))
(e/'final-index.txt').write_text(git('ls-files','-s'))
print('git',report['gitCompared'],'changed',len(changed))
for x in changed: print(Path(x['path']).relative_to(w))
