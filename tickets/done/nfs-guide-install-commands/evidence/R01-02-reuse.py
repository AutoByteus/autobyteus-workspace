# R01/API002, 2026-10-24. python3 <this path> from assigned worktree.
# Audit current attributed results, not new product tests. Environment: local macOS/Python.
from pathlib import Path
from datetime import datetime, timezone
import subprocess,json,re,hashlib
N=Path.cwd();T=N/'tickets/in-progress/nfs-guide-install-commands';E=T/'evidence'
now=lambda:datetime.now(timezone.utc).isoformat()
def progress(event,status,note):
 with (T/'api-e2e-test-progress.md').open('a') as f:f.write(f'| {now()} | R01 | {event} | {status} | {note} |\n')
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
progress('Started','Not Tested','API002: audit current IMP10/11 and source identity; no suite repeat')
source='3d95a5c4a16759060983489735e77820661cff53';head=git('rev-parse','HEAD')
diff=git('diff','--name-only',source,head,'--',':!tickets');working=git('diff','--name-only','--',':!tickets');assert not diff and not working
entries=json.loads((E/'IMP-10-checks.json').read_text());excerpts=[]
for entry in entries:
 assert entry['commit']==source and entry['exit']==0
 text=(E/entry['log']).read_text();assert source in text and 'exit=0' in text
 excerpts += [f'## {entry["log"]}',*text.splitlines()[:2],*[l for l in text.splitlines() if re.search(r'Test Files|Tests  |Passed|exit=',l)]]
assert 'Tests  54 passed (54)' in (E/'IMP-10-unit.log').read_text()
browser=json.loads((E/'IMP-11-verified/result.json').read_text());assert browser['commit']==source and browser['result']=='Pass' and not browser['events']
driver=(E/'IMP-11-verified/driver.mjs').read_text();assert "'partial version preserved'" in driver and "'unavailable version hidden'" in driver
original=git('diff','--name-only','2c6b41462a5a2caaaa52ad3b1da71586fdc45fcb',head).splitlines()
changes=git('diff','--name-only','1103c5f9f7c6986a77ef34620b02d790e2297621',head,'--',':!tickets').splitlines();assert len(changes)==5
preserved=['autobyteus-web/utils/nfsLauncherCommands.ts','autobyteus-web/components/settings/NodeManager.vue','autobyteus-web/components/settings/DockerNodeStartGuideCard.vue','autobyteus-web/utils/dockerNodeLauncherCommands.ts']
for p in preserved:assert not git('diff','1103c5f9',head,'--',p)
result={'case':'R01','round':'API-REV-002','date':now(),'command':'python3 tickets/in-progress/nfs-guide-install-commands/evidence/R01-02-reuse.py','environment':'macOS arm64, metadata/source inspection only','head':head,'testedImplementationCommit':source,'productDiffSinceTest':diff,'workingProductDiff':working,'changedPaths':changes,'oldToCurrentChangedPathCount':len(original),'oldSharedFoundationChanged':any(x.startswith(('autobyteus-ts/','autobyteus-agent-presentation-contracts/','autobyteus-team-stream-contracts/')) for x in original),'preservedPaths':preserved,'reused':entries,'componentPreview':'IMP-11-verified/result.json; current driver asserts partial version and null hidden, Pass/zero events','historicalOldAPI001Reused':False,'newProductTestsExecuted':0,'result':'Pass'}
(E/'R01-02-reuse.json').write_text(json.dumps(result,indent=2)+'\n')
(E/'R01-02-reused-excerpts.log').write_text(f'# R01/API002 attributed IMP10 excerpts; source {source}; {now()}; macOS/privateHOME implementation logs; metadata-only audit\n'+'\n'.join(excerpts)+'\n')
report=T/'api-e2e-execution-coverage-report.md';s=report.read_text().replace('| R01 |Not Tested|Current IMP10/11 evidence audit pending|','| R01 |Pass — Reused|IMP10 current54/5files + helper typecheck/3guards; IMP11-verified partial/null. R01-02-reuse.json/excerpts: source diff empty; no repeated suite.|')
s=s.replace('Post-repository pending R01. Final not scored; every AC remains Not Proven until its current evidence is assessed.','Post-repository scores [90,85,75,95,95,75,95], mean610/7=87.14%. Current component/negative evidence strong; actual page composition and rendering not yet proven. Final not scored; AC001–006 current integration proof pending.')
report.write_text(s);progress('Completed','Pass','Current IMP10 54/5files+typecheck/3guards and IMP11 negatives reusable; all exercised inputs identical. Broad actual-page R02/R03 required.')
print(json.dumps({'result':'Pass','reusedTests':54,'newTests':0,'oldToCurrentPaths':len(original),'changedPaths':changes},indent=2))
