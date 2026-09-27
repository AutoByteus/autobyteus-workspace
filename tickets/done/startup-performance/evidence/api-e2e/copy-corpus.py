import pathlib,tempfile,subprocess,sqlite3,json,os,time,shutil
p=pathlib.Path(__file__).parent;source=pathlib.Path('/Users/normy/.autobyteus/server-data');root=pathlib.Path(tempfile.mkdtemp(prefix='autobyteus-performance-'));os.chmod(root,0o700);(p/'owned-root.txt').write_text(str(root));target=root/'snapshot';target.mkdir()
def inventory():
 return {str(f.relative_to(source/'memory')):(f.stat().st_size,f.stat().st_mtime_ns) for f in (source/'memory').rglob('*') if f.is_file()}
a=inventory();start=time.monotonic()
for name in ['memory','agents','agent-teams','agent-orgs','app-data-migration-backups']:
 if (source/name).exists():subprocess.run(['cp','-cR',str(source/name),str(target/name)],check=True)
(target/'db').mkdir();src=sqlite3.connect(f'file:{source}/db/production.db?mode=ro',uri=True);dst=sqlite3.connect(str(target/'db/production.db'));src.backup(dst);src.close();dst.close()
shutil.copy2(source/'db/production.db.secret.key',target/'db/production.db.secret.key')
b=inventory();changed=[k for k in set(a)|set(b) if a.get(k)!=b.get(k)];(target/'.env').write_text('APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:3441\n')
r={'source':str(source),'target':str(target),'copySeconds':time.monotonic()-start,'fileCount':len(a),'bytes':sum(x[0] for x in a.values()),'sourceWriterPresent':True,'stoppedWritersDuringOwnedMigration':True,'sourceMetadataStableDuringCopy':not changed,'changedSourcePaths':changed,'method':'APFS file clones plus read-only SQLite backup; key privately copied without exposing values. Representative owned snapshot, not a claimed globally atomic live snapshot.'};(p/'corpus-provenance.json').write_text(json.dumps(r,indent=2));print({k:v for k,v in r.items() if k!='changedSourcePaths'});assert not changed,'Source changed during copy; do not benchmark this snapshot'
