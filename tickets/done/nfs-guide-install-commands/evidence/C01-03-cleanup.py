# C01 API003; macOS; 2026-10-26; ccc0c56d / product1f2b346; run from task worktree.
# Validate recorded owned groups gone, remove only leftover owned roots, compare current ticket/input receipts. No application state or other resource cleanup.
from pathlib import Path
import subprocess,json,hashlib,datetime,socket,shutil
N=Path.cwd();T=N/'tickets/in-progress/nfs-guide-install-commands';E=T/'evidence';date=datetime.datetime.now(datetime.timezone.utc).isoformat()
def git(*a):return subprocess.check_output(['git',*a],text=True).strip()
ps=subprocess.check_output(['ps','-axo','pid,ppid,pgid,command'],text=True);rows=[]
for p in sorted(E.glob('R02-03-attempt-*/result.json')):
 d=json.loads(p.read_text());v=d['environment'];groups=[v['serverPid'],v['browserPgid']]
 live=[l for l in ps.splitlines() if len(l.split())>=3 and l.split()[2].isdigit() and int(l.split()[2]) in groups];assert not live,(p,live)
 root=Path(v['root']);assert root.name.startswith('nfs-guide-api003-') and str(root).startswith('/private/var/folders/')
 existed=root.exists()
 if existed:shutil.rmtree(root)
 port=int(v['base'].rsplit(':',1)[1]);s=socket.socket();s.settimeout(1);closed=s.connect_ex(('127.0.0.1',port))!=0;s.close();assert closed
 rows.append({'attempt':p.parent.name,'groups':groups,'groupsAbsent':True,'port':port,'portClosed':closed,'root':str(root),'removedResidualRootNow':existed,'rootAbsent':not root.exists()})
b=json.loads((E/'C01-03-baseline.json').read_text());owned={str(T.relative_to(N)/f) for f in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-test-progress.md','api-e2e-revision-record.md']}
changed=[p for p,h in b['protected'].items() if p not in owned and hashlib.sha256((N/p).read_bytes()).hexdigest()!=h];assert not changed,changed
sourceDiff=git('diff','--name-only','1f2b346cfb164d0b0a7fe2534d1fec8d81fbc708','--',':!tickets');assert not sourceDiff
old= subprocess.check_output(['git','show',b['commit']+':'+str(T.relative_to(N)/'api-e2e-revision-record.md')]);assert (T/'api-e2e-revision-record.md').read_bytes().startswith(old)
assert not Path('/Users/normy/nfs-guide-r3-imp-jvvxmt_r').exists()
docs=(N/'autobyteus-web/docs/nfs_guide.md').read_text();assert all(x in docs for x in ['Windows and Mac Docker','testing remains deferred','nonroot source owner','not an access token','Checksums do not','does not attach or'])
result={'case':'C01','date':date,'command':'python3 '+str(Path(__file__).relative_to(N)),'commit':git('rev-parse','HEAD'),'environment':'Mac current worktree read-only input audit plus owned temporary-root cleanup','result':'Pass','attempts':rows,'sourceDiff':sourceDiff,'protectedCompared':len(b['protected'])-len(owned),'otherOwnerChanged':changed,'oldHistoryPrefixPreserved':True,'implementationScratchAbsent':True,'detailsPreservedInGuideDoc':True,'retained':'Current ignored worktree dependencies and generated Nuxt cache; committed evidence. No task worktree removed.','limits':'No claim of host installer/NFS/backend/Electron/field qualification; no unrelated process control. Old driver cleanup ENOTEMPTY failures remain original; attempt2 residual root was removed only after verified group absence.'}
(E/'C01-03-cleanup.json').write_text(json.dumps(result,indent=2)+'\n')
with (T/'api-e2e-test-progress.md').open('a') as f:f.write(f'| {date} | C01 | Completed | Pass | All3owned groups/ports/roots absent; attempt2 residual compile cache removed; source/other-owner/prior history preserved. |\n')
p=T/'api-e2e-execution-coverage-report.md';s=p.read_text().replace('| C01 |Not Tested|Owned cleanup/input preservation pending|','| C01 |Pass|C01-03-cleanup.json: all3groups/ports/roots absent; exact source unchanged; other-owner inputs/prior history preserved|');p.write_text(s)
print(json.dumps({'result':'Pass','attempts':len(rows),'sourceDiff':sourceDiff,'otherOwnerChanged':changed}))
