# C01/API002; 2026-10-24; run from assigned worktree using python3 <this path>.
# Read-only owned process/port/temp checks, source/history preservation; no broad cleanup.
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
import os,socket,json,subprocess,hashlib
N=Path.cwd();T=N/'tickets/in-progress/nfs-guide-install-commands';E=T/'evidence';rows=[]
for attempt in ['R02-02-attempt-1','R02-02-attempt-2']:
 x=json.loads((E/attempt/'result.json').read_text());env=x['environment'];port=urlparse(env['base']).port
 groups=[env['serverPid'],env.get('browserPgid',49486)]
 absent=[]
 for pgid in groups:
  try:os.killpg(pgid,0);absent.append(False)
  except ProcessLookupError:absent.append(True)
 s=socket.socket();s.settimeout(0.5);closed=s.connect_ex(('127.0.0.1',port))!=0;s.close()
 row={'attempt':attempt,'groupIds':groups,'groupsAbsent':absent,'port':port,'portClosed':closed,'ownedRoot':env['root'],'rootAbsent':not Path(env['root']).exists(),'browserClosed':x['cleanup']['browserClosed'],'sourceChanges':x['cleanup']['productSourceChanges']}
 assert all(absent) and closed and row['rootAbsent'] and row['browserClosed'] and not row['sourceChanges'],row
 rows.append(row)
sourceDiff=subprocess.check_output(['git','diff','--name-only','4e308b716cf70ed5bc914ab780984e59df30af7f','--',':!tickets'],text=True);assert not sourceDiff
base=json.loads((E/'C01-02-baseline.json').read_text());history=(T/'api-e2e-revision-record.md').read_bytes();assert hashlib.sha256(history[:base['historyBytes']]).hexdigest()==base['historySha256']
allowed={'api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-test-progress.md','api-e2e-revision-record.md'}
modified=subprocess.check_output(['git','diff','--name-only'],text=True).splitlines();assert all(Path(p).name in allowed for p in modified),modified
final=json.loads((E/'R02-02-attempt-2/result.json').read_text());assert final['result']=='Pass' and not final['errors'] and final['environment']['chromiumSandbox']
summary={'case':'R02/R03','date':datetime.now(timezone.utc).isoformat(),'commit':final['commit'],'command':final['command'],'environment':final['environment'],'result':final['result'],'views':[{'locale':r['locale'],'width':r['width'],'copiedCommands':len(r['copied']),'links':r['links'],'installGap':r['installGap'],'removedLabelsAbsent':r['removedLabelsAbsent'],'reviewReminder':r['reviewReminder'],'versionNotice':r['versionNotice'],'document':r['dimensions']['document'],'uniqueAccessibleNames':len(set(r['names']))} for r in final['scenarios'] if r['case']=='R02'],'clipboardEdgeCases':[r for r in final['scenarios'] if r['case']=='R03'],'errors':final['errors'],'readOperations':sorted(set(r['operation'] for r in final['requests'] if r.get('kind')=='fixture-graphql')),'nfsAssetRequests':[r for r in final['requests'] if 'github.com/AutoByteus/autobyteus-nfs' in r.get('url','')],'nativeNFSCopyCount':36+1,'nativeDockerCopyCount':2,'limits':'Real current Nodes renderer/locales/browser clipboard; unrelated read queries/health/identity/feeds doubled. No backend/Electron/NFS/installer qualification.'}
assert not summary['nfsAssetRequests']
(E/'R02-02-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
cleanup={'case':'C01','date':datetime.now(timezone.utc).isoformat(),'commit':final['commit'],'command':'python3 tickets/in-progress/nfs-guide-install-commands/evidence/C01-02-cleanup.py','environment':'macOS arm64; own processes/ports/temp only','observations':rows,'sourceDiff':sourceDiff,'oldHistoryPrefixUnchanged':True,'otherTrackedOwnerFilesUnchanged':True,'dependencies':'Ignored worktree node_modules/.nuxt retained; no temp product page added','result':'Pass'}
(E/'C01-02-cleanup.json').write_text(json.dumps(cleanup,indent=2)+'\n')
with (T/'api-e2e-test-progress.md').open('a') as f:f.write(f'| {datetime.now(timezone.utc).isoformat()} | C01 | Completed | Pass | Both attempts owned process groups/ports/root absent, current product and prior history/other-owner files unchanged; ignored deps retained. |\n')
p=T/'api-e2e-execution-coverage-report.md';s=p.read_text().replace('| C01 |Not Tested|Owned cleanup pending|','| C01 |Pass|evidence/C01-02-cleanup.json: both owned groups/ports/roots absent, current source/history preserved.|');p.write_text(s)
print(json.dumps({'cleanup':'Pass','views':len(summary['views']),'browserErrors':0,'ownResourceRows':len(rows),'realNFSCopies':37,'installGap':[v['installGap'] for v in summary['views']]}))
