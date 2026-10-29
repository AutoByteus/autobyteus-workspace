# C01: finalize actual renderer evidence/own cleanup; source2c6b414; macOS;2026-10-21. No product rerun.
from pathlib import Path
import subprocess,json,datetime,hashlib,os,socket,re
N=Path.cwd();T=N/'tickets/in-progress/nfs-guide-install-commands';E=T/'evidence';head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
results=[]
for i in (1,2):
 p=E/f'R02-attempt-{i}';r=json.loads((p/'result.json').read_text());pid=r['environment']['serverPid']
 try:os.killpg(pid,0);gone=False
 except ProcessLookupError:gone=True
 assert gone,f'owned group still exists {pid}'
 assert not Path(r['environment']['root']).exists()
 from urllib.parse import urlparse
 u=urlparse(r['environment']['base']);sock=socket.socket();sock.settimeout(1);closed=sock.connect_ex((u.hostname,u.port))!=0;sock.close();assert closed
 results.append({'attempt':i,'result':r['result'],'ownedProcessGroup':pid,'processGroupAbsent':gone,'portClosed':closed,'rootAbsent':True,'browserClosed':r['cleanup']['browserClosed']})
r=json.loads((E/'R02-attempt-2/result.json').read_text());assert r['result']=='Pass' and not r['errors'];assert len(r['scenarios'])==5
assert len([s for s in r['scenarios'] if s['case']=='R02'])==4
assert all(len(s['copied'])==9 for s in r['scenarios'] if s['case']=='R02')
assert not subprocess.check_output(['git','diff','--name-only','2c6b41462a5a2caaaa52ad3b1da71586fdc45fcb','HEAD','--',':!tickets'],text=True)
assert not subprocess.check_output(['git','diff','--name-only'],text=True)
sourcePaths=json.loads((E/'IMP-06-self-review.json').read_text())['checks']['approvedChangedPaths']
summary={'case':'R02/R03','date':now(),'commit':head,'command':'R02-browser.mjs R02-attempt-2','environment':r['environment'],'result':'Pass','matrix':[{k:s[k] for k in ['locale','width','names','dimensions']} for s in r['scenarios'] if s['case']=='R02'],'clipboardChecks':36,'independentLiteralExpectations':True,'actualLanguageSettingsAndNodesTabs':True,'dockerBeforeAfterAndActualCopy':True,'clipboardEdgeCases':r['scenarios'][-1],'errors':r['errors'],'unexpectedGraphql':[],'mockedReadOnlyGraphql':sorted(set(x['operation'] for x in r['requests'] if x.get('kind')=='fixture-graphql')),'installerOrReleaseRequests':len([x for x in r['requests'] if 'github.com/AutoByteus/autobyteus-nfs' in x.get('url','')]),'limits':['Actual current browser renderer only, not Electron/backend/server acceptance','Unrelated health/notification/workspace/model/agent/app queries and two feeds doubled','No install or CLI command executed; no live NFS/storage/field/provider action','First attempt incomplete due harness literal/empty response fixtures; not a product failure or passing attempt']}
(E/'R02-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
cleanup={'case':'C01','date':now(),'commit':head,'step':'Check owned process groups/ports/temp roots + exact current source/preservation','environment':'localmacOS','attempts':results,'allTrackedInputsUnchanged':True,'approvedSourcePathsUnchanged':sourcePaths,'durableCoverageChanges':[],'ignoredOutputsRetained':['autobyteus-web/node_modules','autobyteus-web/.nuxt'],'unrelatedResourcesTouched':False,'pass':True}
(E/'C01-cleanup.json').write_text(json.dumps(cleanup,indent=2)+'\n')
(E/'R02-visual-review.md').write_text('# R02 visual review\n\nStep: personally inspect captured actual Nodes page screenshots; source2c6b414/current'+head+'; Chrome155/macOS, en/zh-CN at1280/390; '+now()+'''\n
Reviewed all nine current screenshots in R02-attempt-2. Actual sidebar Nodes selected (not Settings); NFS tab selected and correlated panel. Desktop two-column install/usage cards, narrow one-column with wrapping tabs and local horizontal code scrolling; names/Copy buttons visible and clickable. Literal commands checked independently and copied, not inferred from screenshots. English/Chinese labels, installed-tool prerequisites, create/connect order, trust/outage/deferred warnings readable. Feedback visible/polite and no browser errors. The narrow bottom image is a scrolled reference/warnings view, not the last page pixel; full warning/deferred text is recorded in corresponding text files. Page content scrolls vertically; no document horizontal overflow. Sticky feedback can cover the currently scrolled strip until its two-second reset; no inaccessible command or persistent loss observed, reset and all buttons exercised.

Minor scoped Delivery docs-sync item: autobyteus-web/docs/nfs_guide.md intro still says “Settings → Nodes → NFS Guide”. Current page/sidebar is “Nodes → NFS Guide” (/nodes); Settings is used here only for language. Correct this navigation wording during normal docs sync, no implementation/review loop needed. No product/runtime issue or new follow-up.
''')
with (T/'api-e2e-test-progress.md').open('a') as f:f.write(f'| {now()} | C01 | Completed | Pass | Both owned process groups/ports/temp roots absent; browser closed; all tracked inputs unchanged; ignored dependencies/.nuxt retained. |\n')
print('C01 PASS; 36 actual clipboard comparisons; 4 locale/width states; owned processes absent')
