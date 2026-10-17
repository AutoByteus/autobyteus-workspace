from pathlib import Path
import os,subprocess as sp,json,time
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parents[2];S=Path((E/'scratch-path.txt').read_text().strip());env={'PATH':os.environ['PATH'],'HOME':str(S/'home'),'TMPDIR':str(S/'tmp')+'/', 'LANG':'en_US.UTF-8','CI':'1','NO_COLOR':'1'};r={'cwd':str(R),'environment':env,'checks':[]}
checks=[('original-and-viewer',['pnpm','-C','autobyteus-web','test:nuxt','components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts','components/fileExplorer/__tests__/FileExplorerTabs.draftViewer.spec.ts','components/fileExplorer/__tests__/FileExplorerTabs.spec.ts','--run','--maxWorkers=2']),('adjacent',['pnpm','-C','autobyteus-web','test:nuxt','components/fileExplorer/__tests__','components/fileExplorer/viewers/__tests__','stores/__tests__/fileExplorerStore.spec.ts','stores/__tests__/fileExplorerNodeRouting.spec.ts','utils/fileExplorer/__tests__','--run','--maxWorkers=2']),('web-boundary',['pnpm','-C','autobyteus-web','guard:web-boundary']),('localization-boundary',['pnpm','-C','autobyteus-web','guard:localization-boundary']),('public-http',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts','--no-watch'])]
for name,args in checks:
 st=time.monotonic()
 with (E/(name+'.log')).open('w') as log:p=sp.run(args,cwd=R,env=env,stdout=log,stderr=sp.STDOUT,timeout=300)
 row={'name':name,'argv':args,'rc':p.returncode,'seconds':round(time.monotonic()-st,2),'log':name+'.log'};r['checks'].append(row);(E/'repository-result.json').write_text(json.dumps(r,indent=2)+'\n')
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- R8-L02 '+name+': '+('Pass' if p.returncode==0 else 'Fail')+'; E8/'+name+'.log\n')
 print(row,flush=True)
r['result']='Pass' if all(x['rc']==0 for x in r['checks']) else 'Fail';(E/'repository-result.json').write_text(json.dumps(r,indent=2)+'\n')
