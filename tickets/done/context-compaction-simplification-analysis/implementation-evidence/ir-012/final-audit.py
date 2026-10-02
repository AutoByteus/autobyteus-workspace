import hashlib,json,os,subprocess
from pathlib import Path
r=Path(__file__).resolve().parents[5];t=r/'tickets/in-progress/context-compaction-simplification-analysis';e=t/'implementation-evidence/ir-012'
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for c in iter(lambda:f.read(1048576),b''):h.update(c)
 return h.hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=r,env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'},text=True)
pins=json.loads((e/'entry-pins.json').read_text());old=json.loads((e/'entry-git.json').read_text())
allowed={str(r/'package.json'),str(r/'TESTING.md'),str(t/'implementation-handoff.md'),str(t/'implementation-revision-record.md')}
removed=str(r/'autobyteus-web/services/agentCollaboration/__tests__/nativeAcceptedInputHistory.spec.ts')
changed=[];missing=[]
for p,h in pins.items():
 if not Path(p).is_file():missing.append(p)
 elif sha(p)!=h:changed.append(p)
logical=git('ls-files','--stage')
now={'HEAD':git('rev-parse','HEAD').strip(),'MERGE_HEAD':git('rev-parse','MERGE_HEAD').strip(),'index_sha256':sha(Path(git('rev-parse','--git-path','index').strip())),'logical_index_sha256':hashlib.sha256(logical.encode()).hexdigest(),'stash':git('stash','list'),'staged_count':len(git('diff','--cached','--name-only').splitlines()),'unmerged':git('ls-files','-u')}
followup=json.loads((e/'crr018-owner-update.json').read_text())['paths']
owner_changed=[p for p in changed if p in followup and sha(p)==followup[p]]
g={k:now[k]==old[k] for k in now};unexpected=[p for p in changed if p not in allowed and p not in owner_changed];unexpected_missing=[p for p in missing if p!=removed]
protected=json.loads((e/'protected-owner-entry.json').read_text());pc=[{'path':x['path'],'matches':sha(x['path'])==x['entry_sha256']} for x in protected]
new=['test-support/native-input-history/native-accepted-input-history.integration.test.ts','test-support/native-input-history/vitest.config.mts','test-support/native-input-history/README.md','autobyteus-web/tests/integration/web-boundary-guard.integration.test.ts']
archive=t/'api-e2e-evidence/api-rev-010/cumulative-package.tar.gz'
archive_check={'path':str(archive),'bytes':archive.stat().st_size,'sha256':sha(archive)}
assert archive_check['sha256']=='39306b3acfc958cf811c7ef17a52d24b61a72f11373d1be1be94f6cd54510ab5'
result={'pins':len(pins),'unchanged':len(pins)-len(changed)-len(missing),'changed':changed,'reviewer_owned_crr018_updates':owner_changed,'allowed_removed':missing,'unexpected_changed':unexpected,'unexpected_missing':unexpected_missing,'new_test_paths':[{'path':p,'sha256':sha(r/p)} for p in new],'git_matches':g,'HEAD':now['HEAD'],'MERGE_HEAD':now['MERGE_HEAD'],'staged_count':now['staged_count'],'unmerged_count':len(now['unmerged'].splitlines()),'protected':pc,'guard_stale_link_absent':not os.path.lexists(r/'autobyteus-web/node_modules/autobyteus-ts'),'cumulative_archive':archive_check,'scope':'Pre-handoff entry-pin audit, plus explicitly inventoried new test paths and separately created IR012 evidence. Not a downstream freeze claim or all-files inventory.'}
result['Pass']=not unexpected_missing and not unexpected and all(g.values()) and all(x['matches'] for x in pc) and result['guard_stale_link_absent']
(e/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n');(e/'final-index.txt').write_text(logical);(e/'final-status.txt').write_text(git('status','--porcelain=v1'))
print(json.dumps({k:v for k,v in result.items() if k not in ['protected','new_test_paths']},indent=2));assert result['Pass']
