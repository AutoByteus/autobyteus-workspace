import json,pathlib,subprocess,sqlite3,hashlib,shutil
p=pathlib.Path(__file__).parent;root=pathlib.Path((p/'owned-root.txt').read_text().strip());snapshot=root/'snapshot';ID='20260926_team_context_file_execution_locators_v1';back=snapshot/'app-data-migration-backups'/ID;manifest=json.loads((back/'manifest.json').read_text());plans=manifest['files'];sha=lambda x:hashlib.sha256(x).hexdigest();meta=[]
for kind in ['first','retry','terminal']:
 for variant in ['baseline','candidate']:
  target=root/(variant+'-'+kind);subprocess.run(['cp','-cR',str(snapshot),str(target)],check=True);migrationBack=target/'app-data-migration-backups'/ID;restored=[];rewritten=json.loads(json.dumps(manifest));residue={}
  for i,plan in enumerate(plans):
   rel=pathlib.Path(plan['source']['filePath']).relative_to('/Users/normy/.autobyteus/server-data/memory');name=sha(plan['source']['filePath'].encode())+'.original';newsource=str((target/'memory'/rel).resolve());original=(back/name).read_bytes()
   if kind=='first' or (kind=='retry' and i<len(plans)//2):
    (target/'memory'/rel).write_bytes(original);restored.append(str(rel))
   # Relocate released fixture evidence paths/names to this owned root only.
   oldfile=migrationBack/name;newfile=migrationBack/(sha(newsource.encode())+'.original');oldfile.rename(newfile)
   rewritten['files'][i]['source']['filePath']=newsource
   rewritten['files'][i]['committed']=not(kind=='retry' and i<len(plans)//2)
   for m in rewritten['files'][i]['mappings']:m['field']=m['field'].replace(plan['source']['filePath'],newsource)
  if kind=='first':shutil.rmtree(migrationBack) # This specimen represents before that migration created any residue; immutable snapshot retains all originals.
  else:
   rewritten['complete']=kind=='terminal';(migrationBack/'manifest.json').write_text(json.dumps(rewritten))
  later=None
  if kind=='retry':
   rel=pathlib.Path(plans[-1]['source']['filePath']).relative_to('/Users/normy/.autobyteus/server-data/memory');later=str(rel)
   with (target/'memory'/rel).open('a') as f:f.write(json.dumps({'id':'api-performance-later','trace_type':'user','content':'Preserve later current write; no rollback'})+'\n')
  db=sqlite3.connect(str(target/'db/production.db'))
  if kind=='first':db.execute('delete from app_data_migration_records where migration_id=?',(ID,))
  if kind=='retry':db.execute("update app_data_migration_records set status='FAILED',started_at=0,completed_at=0,error_message='Disposable released partial-attempt fixture' where migration_id=?",(ID,))
  db.commit();db.close()
  if migrationBack.exists():residue={f.name:sha(f.read_bytes()) for f in migrationBack.iterdir() if f.is_file()}
  meta.append({'kind':kind,'variant':variant,'root':str(target),'restoredOldFileCount':len(restored),'restoredOldFiles':restored,'laterCurrentFile':later,'releasedResidueHashes':residue})
(p/'benchmark-fixtures.json').write_text(json.dumps(meta,indent=2));print('Prepared6 equivalent cloned specimens; private live data untouched')
