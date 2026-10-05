from pathlib import Path
import json,hashlib,subprocess,os,stat,datetime
W=Path.cwd();E=W/'tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence';b=json.loads((E/'api-017-input-preservation.json').read_text())
sha=lambda v:hashlib.sha256(v).hexdigest();g=lambda *a:subprocess.check_output(['git','--no-optional-locks',*a],cwd=W)
idx=Path(b['indexPath']);original=(E/'api-017-input/index').read_bytes();assert sha(original)==b['indexHash']
before=idx.read_bytes();assert sha(before)=='7b88df25613022646974421c128cb3570c6c4bba26ee0efd141540a2fa33baea'
assert sha(g('ls-files','--stage','-z'))==b['stagesHash'];assert g('diff','--cached','--binary')==(E/'api-017-input/staged.patch').read_bytes();assert g('diff','--binary')==(E/'api-017-input/unstaged.patch').read_bytes()
assert g('rev-parse','HEAD').decode().strip()==b['head'] and g('rev-parse','MERGE_HEAD').decode().strip()==b['mergeHead'];assert not g('ls-files','-u')
(E/'api-017-own-stat-refresh-index').write_bytes(before)
lock=Path(str(idx)+'.lock');fd=os.open(lock,os.O_WRONLY|os.O_CREAT|os.O_EXCL,stat.S_IMODE(idx.stat().st_mode))
try:
 assert sha(idx.read_bytes())==sha(before),'Concurrent index edit; do not overwrite'
 assert sha(g('ls-files','--stage','-z'))==b['stagesHash']
 with os.fdopen(fd,'wb') as f:f.write(original);f.flush();os.fsync(f.fileno())
 os.replace(lock,idx)
except:
 try:os.close(fd)
 except OSError:pass
 if lock.exists():lock.unlink()
 raise
assert sha(idx.read_bytes())==b['indexHash'];assert sha(g('ls-files','--stage','-z'))==b['stagesHash']
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cause':'Our first preservation checker used ordinary git status after checking original index SHA. Its optional stat-cache refresh occurred at index mtime 2026-10-05 05:00:58 UTC; next read-only audit caught it. No staged/blob/stage/patch/HEAD/MERGE/status/source change.','preRefreshOriginalHash':b['indexHash'],'ownRefreshedHash':sha(before),'archivedRefresh':str(E/'api-017-own-stat-refresh-index'),'restoredHash':sha(idx.read_bytes()),'guard':'Known exact observed derivative hash, unchanged semantic stages/staged+unstaged binary patches/HEAD/MERGE/no U, exclusive index.lock; no concurrent writer overwritten','action':'Restored only our accidental optional stat-cache binary rewrite from initial exact backup. No staging/reset/merge/commit/stash operation. Final reads use --no-optional-locks.','binaryIndexRestoredExact':True}
(E/'api-017-index-stat-refresh-recovery.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
