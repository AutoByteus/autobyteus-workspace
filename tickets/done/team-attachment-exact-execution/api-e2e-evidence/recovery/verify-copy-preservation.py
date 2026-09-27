import json,pathlib,hashlib,shutil
p=pathlib.Path(__file__).parent;b=pathlib.Path((p/'installed-copy-root.txt').read_text().strip());root=b/'desktop/server-data';memory=root/'memory';backup=root/'app-data-migration-backups/20260926_team_context_file_execution_locators_v1';manifest=json.loads((backup/'manifest.json').read_text());before=json.loads((p/'installed-before-hashes.json').read_text());diff=json.loads((p/'installed-diff.json').read_text());errors=[];count=0
sha=lambda x:hashlib.sha256(x).hexdigest()
def compare(a,z,allowed):
 global count
 if a==z:return
 if type(a)!=type(z):raise ValueError('type changed')
 if isinstance(a,dict):
  if a.keys()!=z.keys():raise ValueError('keys changed')
  for k in a:compare(a[k],z[k],allowed)
 elif isinstance(a,list):
  if len(a)!=len(z):raise ValueError('length changed')
  for x,y in zip(a,z):compare(x,y,allowed)
 elif isinstance(a,str) and (a,z) in allowed:count+=1
 else:raise ValueError('non-locator changed')
for plan in manifest['files']:
 source=pathlib.Path(plan['source']['filePath']);rel=str(source.relative_to(memory.resolve()));old=(b/'snapshot/server-data/memory'/rel).read_bytes();current=source.read_bytes();original=(backup/(sha(str(source).encode())+'.original')).read_bytes()
 try:
  assert sha(old)==plan['originalHash']==sha(original)
  assert sha(current)==plan['targetHash'] and plan['committed']
  allowed={(x['original'],x['target']) for x in plan['mappings']}
  compare([json.loads(x) for x in old.splitlines() if x.strip()],[json.loads(x) for x in current.splitlines() if x.strip()],allowed)
 except Exception as e:errors.append({'file':rel,'error':str(e)})
result={'complete':manifest['complete'],'plans':len(manifest['files']),'changedFiles':len(diff['changed']),'verifiedOriginalAndTargetHashes':len(manifest['files'])-len(errors),'onlyMappedLocatorValuesChanged':not errors,'locatorValuesChanged':count,'errors':errors}
(p/'installed-preservation.json').write_text(json.dumps(result,indent=2));print(result)
shutil.copy2(root/'logs/server.log',p/'desktop-server.log')
ledger=json.loads((p/'desktop-migration-ledger.json').read_text());shutil.copy2(ledger['log_path'],p/'desktop-migration.log')
# Request normal cleanup only of the packaged candidate launched by our owned probe.
(b/'desktop/stop').touch()
