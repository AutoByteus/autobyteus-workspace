import pathlib,json,hashlib,sqlite3
p=pathlib.Path(__file__).parent;r=pathlib.Path((p/'owned-root.txt').read_text().strip());snapshot=r/'snapshot';ID='20260926_team_context_file_execution_locators_v1';manifest=json.loads((snapshot/'app-data-migration-backups'/ID/'manifest.json').read_text());fixtures=json.loads((p/'benchmark-fixtures.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest();out=[]
plans={str(pathlib.Path(x['source']['filePath']).relative_to('/Users/normy/.autobyteus/server-data/memory')):x for x in manifest['files']}
def lines(b):return [json.loads(x) for x in b.decode().split('\n') if x.strip()]
def compatible(a,b,maps):
 if type(a)!=type(b):return False
 if isinstance(a,dict):return a.keys()==b.keys() and all(compatible(a[k],b[k],maps) for k in a)
 if isinstance(a,list):return len(a)==len(b) and all(compatible(x,y,maps) for x,y in zip(a,b))
 return a==b or isinstance(a,str) and maps.get(a)==b
missing=[x for x in (snapshot/'memory/agent_teams').iterdir() if x.is_dir() and not (x/'team_run_execution_tree.json').exists()]
for spec in fixtures:
 if spec['variant']!='candidate':continue
 root=pathlib.Path(spec['root']);changed=[];errors=[];restored=set(spec['restoredOldFiles']);memoryCount=0;contextCount=0;indexDelta=False
 for f in (snapshot/'memory').rglob('*'):
  if not f.is_file():continue
  rel=str(f.relative_to(snapshot/'memory'));target=root/'memory'/rel;memoryCount+=1;contextCount+=int('context_files' in f.parts)
  if not target.is_file():errors.append({'missing':rel});continue
  source=f.read_bytes()
  if rel in restored:
   plan=plans[rel];source=(snapshot/'app-data-migration-backups'/ID/(sha(plan['source']['filePath'].encode())+'.original')).read_bytes()
  if rel==spec['laterCurrentFile']:source+= (json.dumps({'id':'api-performance-later','trace_type':'user','content':'Preserve later current write; no rollback'})+'\n').encode()
  result=target.read_bytes()
  if source!=result:
   if spec['kind']=='terminal' and rel=='run_history_index.json':
    before=json.loads(source);after=json.loads(result);run=next(x for x in json.loads((p/'benchmark-results.json').read_text()) if x['label']=='candidate-terminal')['newRun']['runId'];added=[x for x in after if x not in before]
    indexDelta=len(after)==len(before)+1 and all(x in after for x in before) and len(added)==1 and added[0]['runId']==run
    if not indexDelta:errors.append({'unexpectedNewRunIndexDelta':True})
    continue
   changed.append(rel)
   plan=plans.get(rel);maps={x['original']:x['target'] for x in plan['mappings']} if plan else {}
   try:ok=plan is not None and compatible(lines(source),lines(result),maps)
   except Exception:ok=False
   if not ok:errors.append({'unexpectedChange':rel})
 residue=root/'app-data-migration-backups'/ID;actual={f.name:sha(f.read_bytes()) for f in residue.iterdir() if f.is_file()} if residue.exists() else {}
 if actual!=spec['releasedResidueHashes']:errors.append({'residueChanged':True})
 db=sqlite3.connect('file:'+str(root/'db/production.db')+'?mode=ro',uri=True);record=db.execute('select status from app_data_migration_records where migration_id=?',(ID,)).fetchall();db.close()
 missingRetained=all((root/'memory/agent_teams'/x.name).is_dir() and not (root/'memory/agent_teams'/x.name/'team_run_execution_tree.json').exists() for x in missing)
 if not missingRetained:errors.append({'missingTreeRootsAltered':True})
 entry={'label':'candidate-'+spec['kind'],'memoryFilesChecked':memoryCount,'contextFilesByteChecked':contextCount,'allowedTypedLocatorOnlyChangedFiles':len(changed),'releasedResidueFilesUntouched':len(actual),'missingTreeRootsRetained':len(missing),'sameIdStatus':record,'newRunIndexDeltaVerified':indexDelta if spec['kind']=='terminal' else None,'laterCurrentWritePreserved':not any(x.get('unexpectedChange')==spec['laterCurrentFile'] for x in errors) if spec['laterCurrentFile'] is not None else None,'errors':errors};out.append(entry);print(json.dumps(entry));(p/'preservation-results.json').write_text(json.dumps(out,indent=2))
assert all(not x['errors'] for x in out)
