# R01 API003; 2026-10-26; current ccc0c56d / product1f2b346; read-only identity/evidence audit, no repeated product suite.
from pathlib import Path
import subprocess,json,datetime
N=Path.cwd();T=N/'tickets/in-progress/nfs-guide-install-commands';E=T/'evidence';now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
def git(*a):return subprocess.check_output(['git',*a],text=True).strip()
def progress(e,r,n):
 with (T/'api-e2e-test-progress.md').open('a') as f:f.write(f'| {now()} | R01 | {e} | {r} | {n} |\n')
progress('Started','Not Tested','Audit current IMP16/17 raw results and exact source; no suite repeat')
source='1f2b346cfb164d0b0a7fe2534d1fec8d81fbc708';diff=git('diff','--name-only',source,'HEAD','--',':!tickets');assert not diff
checks={'IMP-16-focused.log':['Test Files  5 passed (5)','Tests  56 passed (56)'],'IMP-16-static.log':['guard:web-boundary_exit=0','guard:localization-boundary_exit=0','audit:localization-literals_exit=0'],'IMP-16-typecheck.log':['exit=0'],'IMP-15-red.log':['Tests  4 failed | 11 skipped (15)']}
excerpts=[]
for name,needles in checks.items():
 s=(E/name).read_text()
 for needle in needles:assert needle in s,(name,needle)
 excerpts.append({'file':name,'lookFor':needles,'header':s.splitlines()[:3]})
preview=json.loads((E/'IMP-17-preview-final/result.json').read_text());assert preview['commit']==source and preview['result']=='Pass' and preview['events']==[]
assert any('partial' in s and 'unavailable' in s and 'invalid' in s for s in preview['scenarios'])
struct=json.loads((E/'IMP-18-self-review.json').read_text());assert struct['commit']==source and struct['commandHelperAndPinUnchanged'] and struct['componentCardsAndEntireScriptUnchanged']
result={'case':'R01','date':now(),'command':'python3 '+str(Path(__file__).relative_to(N)),'commit':git('rev-parse','HEAD'),'environment':'macOS read-only current repository/evidence audit','result':'Pass','attribution':'Implementation executed IMP16/17, API inspected raw evidence/current test assertions; no suite repeated','testedSource':source,'productDiffSinceTested':diff,'checks':excerpts,'counts':{'files':5,'tests':56,'component':15,'helper':24,'parent':10,'docker':7,'inertShellIncluded':6},'componentPreviewReused':'IMP17-final null/invalid/partial availability and current footer/lifecycle observations; not Nodes navigation','limits':['No whole-project typecheck; scoped Nuxt-alias check only','Initial tsc exit2 and preview overflow remain failed harness attempts with cause recorded by implementation','No installer/CLI/NFS/Electron/backend proof','Old API002 foundation changed; current replaced evidence, never promoted']}
(E/'R01-03-reuse.json').write_text(json.dumps(result,indent=2)+'\n')
p=T/'api-e2e-execution-coverage-report.md';s=p.read_text().replace('| R01 |Not Tested|Current implementation results pending identity/raw evidence inspection|','| R01 |Pass — Reused|IMP16:56tests/5files+scopedtsc+3guards; IMP17-final descriptor states; exact current source unchanged. Evidence R01-03-reuse.json, implementation Checks Run gives raw commands/logs/environment.|')
s=s.replace('Pending R01; no new confidence assigned yet. No critical criterion declared proven yet. All AC001–007 planned.','Post-repository confidence: [90,85,75,95,95,75,95], 610/7 = **87.14%**. R01 proves current durable contracts but actual Nodes composition/responsive/nativeclipboard remains. **Broader Required — Browser**, R02/R03 planned, expected gain closes rendering/integration gap. Current component preview is not Nodes acceptance. AC001/004 repository portions proven; full AC001–007 proof awaits journeys/cleanup.')
p.write_text(s);progress('Completed','Pass','Current IMP16 56/5files+scopedtsc/3guards and IMP17 negatives reusable; product diff empty. Actual Nodes R02/R03 still required.')
print(json.dumps({'result':'Pass','testsReused':56,'sourceDiff':diff}))
