import pathlib,json,subprocess,sqlite3,hashlib,shutil
p=pathlib.Path(__file__).parent;r=pathlib.Path((p/'owned-root.txt').read_text().strip());ID='20260926_team_context_file_execution_locators_v1';snapshot=r/'snapshot';manifest=json.loads((snapshot/'app-data-migration-backups'/ID/'manifest.json').read_text());meta=json.loads((p/'benchmark-fixtures.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
for spec in meta:
 if spec['kind']!='retry':continue
 root=pathlib.Path(spec['root']);assert root.parent==r and root.name in ['candidate-retry','baseline-retry'];shutil.rmtree(root);subprocess.run(['cp','-cR',str(snapshot),str(root)],check=True);back=root/'app-data-migration-backups'/ID;new=json.loads(json.dumps(manifest))
 for i,plan in enumerate(manifest['files']):
  rel=pathlib.Path(plan['source']['filePath']).relative_to('/Users/normy/.autobyteus/server-data/memory');source=str(root/'memory'/rel);oldname=sha(plan['source']['filePath'].encode())+'.original';original=(back/oldname).read_bytes()
  if str(rel) in spec['restoredOldFiles']:(root/'memory'/rel).write_bytes(original)
  (back/oldname).rename(back/(sha(source.encode())+'.original'));new['files'][i]['source']['filePath']=source;new['files'][i]['committed']=str(rel) not in spec['restoredOldFiles']
  for mapping in new['files'][i]['mappings']:mapping['field']=mapping['field'].replace(plan['source']['filePath'],source)
 new['complete']=False;(back/'manifest.json').write_text(json.dumps(new))
 with (root/'memory'/spec['laterCurrentFile']).open('a') as f:f.write(json.dumps({'id':'api-performance-later','trace_type':'user','content':'Preserve later current write; no rollback'})+'\n')
 db=sqlite3.connect(str(root/'db/production.db'));db.execute("update app_data_migration_records set status='FAILED',started_at=0,completed_at=0,error_message='Disposable released partial-attempt fixture' where migration_id=?",(ID,));db.commit();db.close()
 spec['releasedResidueHashes']={f.name:sha(f.read_bytes()) for f in back.iterdir() if f.is_file()};spec['pathAliasCorrection']='Manifest sources use the same lexical /var root as normal discovery, not resolved /private/var.'
(p/'benchmark-fixtures.json').write_text(json.dumps(meta,indent=2))
script=(p/'benchmark.mjs').read_text().replace("['first','retry','terminal']","['retry']").replace("label+'.log'","label+'-corrected.log'").replace("label+'-metrics.json'","label+'-corrected-metrics.json'").replace("benchmark-results.json","retry-results.json")
(p/'benchmark-eligible-retry.mjs').write_text(script)
