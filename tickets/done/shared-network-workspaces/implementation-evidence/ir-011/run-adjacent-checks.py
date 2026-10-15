from pathlib import Path
import subprocess,os,json,time
E=Path(__file__).resolve().parent; S=Path((E/'scratch-path.txt').read_text().strip()); R=S/'repo'
env={'PATH':os.environ['PATH'],'HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'CI':'1','NO_COLOR':'1'}
args=['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/integration/file-explorer/file-explorer.integration.test.ts','tests/e2e/file-explorer/search-content-http.e2e.test.ts','--no-watch']
started=time.time()
with (E/'adjacent-explorer.log').open('w') as f: p=subprocess.run(args,cwd=R,env=env,stdout=f,stderr=subprocess.STDOUT)
d=json.loads((E/'checks-result.json').read_text()); item={'name':'adjacent-explorer','command':args,'exitCode':p.returncode,'seconds':round(time.time()-started,3),'log':'adjacent-explorer.log'};d['checks'].append(item);(E/'checks-result.json').write_text(json.dumps(d,indent=2)+'\n');print(item);raise SystemExit(p.returncode)
