from pathlib import Path
import json,hashlib,subprocess,os,datetime
E=Path(__file__).resolve().parent;T=E.parents[1];W=E.parents[4]
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'}
def git(*a):return subprocess.check_output(['git',*a],cwd=W,env=env).decode().strip()
pins=json.loads((E/'entry-pins.json').read_text());missing=[];changed=[]
for n,h in pins.items():
 p=Path(n)
 if not p.is_file():missing.append(n)
 elif sha(p)!=h:changed.append({'path':n,'before':h,'after':sha(p)})
allowed=[str(T/n) for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-test-case-ledger.md','api-e2e-revision-record.md']]
derived=[str(W/n)+'/' for n in ['autobyteus-ts/dist','autobyteus-server-ts/dist','autobyteus-agent-presentation-contracts/dist','autobyteus-team-stream-contracts/dist','autobyteus-collaboration-stream-contracts/dist','autobyteus-application-backend-sdk/dist','autobyteus-application-sdk-contracts/dist','autobyteus-web/dist','autobyteus-web/dist-mobile','autobyteus-web/resources/server','autobyteus-web/electron-dist','autobyteus-web/build/dist']]
def known(n):return n in allowed or any(n.startswith(d) for d in derived)
entry=json.loads((E/'entry-git.json').read_text());idx=Path(git('rev-parse','--git-path','index'));idx=idx if idx.is_absolute() else W/idx
checks={'head':git('rev-parse','HEAD')==entry['head'],'mergeHead':git('rev-parse','MERGE_HEAD')==entry['mergeHead'],'branch':git('branch','--show-current')==entry['branch'],'stash':git('stash','list')==entry['stash'],'rawIndex':sha(idx)==entry['rawIndex'],'logicalIndex':hashlib.sha256(git('ls-files','--stage').encode()).hexdigest()==entry['logicalIndex'],'zeroUnmerged':git('ls-files','-u')==''}
protected=json.loads((E.parent/'api-rev-010/protected-owner-check.json').read_text())
protected=[{'path':x['path'],'prior_sha256':x['sha256'],'sha256':sha(Path(x['path'])),'matches':sha(Path(x['path']))==x['sha256']} for x in protected if '/electron-dist/' not in x['path']]
(E/'protected-api15-check.json').write_text(json.dumps(protected,indent=2))
(E/'final-status.txt').write_text(git('status','--short'));(E/'final-index.txt').write_text(git('ls-files','--stage'))
result={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pinCount':len(pins),'unchanged':len(pins)-len(changed)-len(missing),'changed':changed,'missing':missing,'unexpectedChanges':[x for x in changed if not known(x['path'])],'unexpectedMissing':[n for n in missing if not known(n)],'gitChecks':checks,'stagedCount':len(git('diff','--cached','--name-only').splitlines()),'api15Preserved':all(x['matches'] for x in protected),'limitations':'Enumerated entry pins, not machine/private-data census. Documented full build regenerated derived outputs; old packaged/prebuild outputs archived, not substituted. No runtime sources edited.'}
(E/'final-audit.json').write_text(json.dumps(result,indent=2))
print(json.dumps({k:v for k,v in result.items() if k not in ['changed','missing']},indent=2))
print('derivedChanged',len([x for x in changed if x['path'] not in allowed]),'missing',len(missing))
