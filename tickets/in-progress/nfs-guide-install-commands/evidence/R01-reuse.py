# R01: exact current input/evidence applicability, no product suite rerun. 2026-10-21; local macOS; source2c6b414.
from pathlib import Path
import subprocess,json,datetime,hashlib
N=Path.cwd();T=N/'tickets/in-progress/nfs-guide-install-commands';E=T/'evidence'
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def progress(event,result,note):
 with (T/'api-e2e-test-progress.md').open('a') as f:f.write(f'| {now()} | R01 | {event} | {result} | {note} |\n')
progress('Started','Not Tested','Exact product diff/reusable command outcomes/fixture assertions')
source='2c6b41462a5a2caaaa52ad3b1da71586fdc45fcb';head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
diff=subprocess.check_output(['git','diff','--name-only',source,'HEAD','--',':!tickets'],text=True);assert not diff
assert not subprocess.check_output(['git','diff','--name-only','--',':!tickets'],text=True)
unit=(E/'IMP-03-unit-current.log').read_text();assert 'Test Files  5 passed (5)' in unit and 'Tests  53 passed (53)' in unit
boundary=(E/'IMP-04-boundaries-current.log').read_text();assert boundary.count('exit=0')==3
assert '; exit0' in (E/'IMP-04-typecheck.log').read_text()
base='33171e13855b4bcbcb8a9d650f2403cacb03d965'
unchanged=['autobyteus-web/components/settings/NodeManager.vue','autobyteus-web/components/settings/DockerNodeStartGuideCard.vue','autobyteus-web/utils/dockerNodeLauncherCommands.ts']
assert not subprocess.check_output(['git','diff','--name-only',base,'HEAD','--',*unchanged],text=True)
installer=(E/'autobyteus-nfs-install.sh.txt').read_bytes();assert hashlib.sha256(installer).hexdigest()=='65769690ada27db304d2e0e4bcd6716e6403f86650ca8f1905e26ebde86d25fa'
out={'case':'R01','step':'Read Checks Run first; inspect assertions + exact source/evidence applicability','date':now(),'commit':head,'environment':'macOS local; no runtime setup','implementationSource':source,'sourceDiff':diff,'reused':['IMP-03:5files/53tests incl6 inert shell controls','IMP-04:utility tsc +3guards','IMP-05:actual-component fallback/denial/self-render, not actual page','IMP-06:retained public script checksum/scope'],'invalidPartialFallbacks':'Explicit and still valid; unit and component fixtures, not actual production null','baselineDockerAndParentUnchanged':unchanged,'pass':True,'noProductTestsRepeated':True}
(E/'R01-reuse.json').write_text(json.dumps(out,indent=2)+'\n')
(E/'R01-reused-excerpts.log').write_text('# R01; excerpts from attributed IMP03/04, source2c6b414; macOS/privateHOME;'+now()+'\n'+ '\n'.join(l for l in unit.splitlines() if 'passed (' in l or 'displayed install shell' in l)+'\n'+ '\n'.join(l for l in boundary.splitlines() if 'Passed' in l or 'exit=' in l)+'\n')
p=T/'api-e2e-execution-coverage-report.md';s=p.read_text().replace('| R01 |Not Tested|Planned unchanged implementation evidence reuse|','| R01 |Pass — Reused|R01-reuse.json and excerpts; IMP03 53tests/5files incl6inert shells; IMP04typecheck/3guards; same source; no repeat|');s += '\nPost-repository scores: AC90/direct85/integration75/environment95/failure90/renderer75/durable95; mean605/7=86.43%. Broader Required: actual page and browser clipboard close composition gap.\n';p.write_text(s)
progress('Completed','Pass','Same current source; reusable53tests/5files +typecheck/guards; actual page still pending')
print('R01 PASS reused exact evidence')
