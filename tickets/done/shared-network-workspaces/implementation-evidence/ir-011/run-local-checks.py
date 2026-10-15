from pathlib import Path
import os,subprocess,json,time,sys
E=Path(__file__).resolve().parent
S=Path((E/'scratch-path.txt').read_text().strip()); R=S/'repo'
env={'PATH':os.environ['PATH'],'HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'CI':'1','NO_COLOR':'1'}
checks=[]
def run(name,args):
    started=time.time()
    with (E/(name+'.log')).open('w') as f:
        p=subprocess.run(args,cwd=R,env=env,stdout=f,stderr=subprocess.STDOUT)
    item={'name':name,'command':args,'exitCode':p.returncode,'seconds':round(time.time()-started,3),'log':name+'.log'}
    checks.append(item); (E/'checks-result.json').write_text(json.dumps({'scope':'implementation-local repository integration; not API/E2E or product sign-off','scratch':str(S),'checks':checks},indent=2)+'\n'); print(json.dumps(item),flush=True)
    if p.returncode: sys.exit(p.returncode)
run('install',['pnpm','--filter','@autobyteus-example/brief-studio-authoring...','install','--frozen-lockfile'])
run('integration-prepare',['pnpm','-C','autobyteus-server-ts','test:integration:prepare'])
run('server-typecheck',['pnpm','-C','autobyteus-server-ts','typecheck'])
run('workspace-rest',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts','--no-watch'])
run('workspace-unit',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/unit/workspaces','--no-watch'])
