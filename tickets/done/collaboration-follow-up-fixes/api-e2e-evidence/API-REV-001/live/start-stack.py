import os,json,socket,subprocess,tempfile,datetime
from pathlib import Path
W=Path('/home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes');E=W/'tickets/in-progress/collaboration-follow-up-fixes/api-e2e-evidence/API-REV-001'
assert not (E/'runtime/environment.json').exists(),'Do not duplicate stack'
assert json.loads((E/'repository/server-build.json').read_text())['exit']==0
for port in [8611,3611,9231]:
 with socket.socket() as s:s.bind(('127.0.0.1',port))
root=Path(tempfile.mkdtemp(prefix='collab-api01-'));data=root/'server-data';data.mkdir();ws=root/'workspace';ws.mkdir();profile=root/'browser-profile'
env=dict(os.environ)
for k in ['DATABASE_URL','APP_ENV','AUTOBYTEUS_SERVER_HOST','APP_DATA_DIR','BACKEND_NODE_BASE_URL','NUXT_TEST','VITEST','NODE_ENV','GEMINI_API_KEY','DEEPSEEK_API_KEY']:env.pop(k,None)
settings={'APP_ENV':'production','DB_TYPE':'sqlite','DATABASE_URL':'file:'+str(data/'db/production.db'),'AUTOBYTEUS_SERVER_HOST':'http://127.0.0.1:8611','LOG_LEVEL':'INFO','PRISMA_LOG_QUERIES':'0','DISABLE_HTTP_REQUEST_LOGS':'true'}
(data/'.env').write_text(''.join(f'{k}={v}\n' for k,v in settings.items()));(data/'.env').chmod(0o600)
records=[]
def start(name,cmd,cwd,extra):
 log=(E/'live'/f'{name}.log').open('w');p=subprocess.Popen(cmd,cwd=cwd,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,start_new_session=True);records.append({'name':name,'pid':p.pid,'processGroup':p.pid,'command':cmd,'cwd':str(cwd),'started':datetime.datetime.now(datetime.timezone.utc).isoformat()});log.close()
start('server',['node','dist/app.js','--data-dir',str(data),'--host','127.0.0.1','--port','8611'],W/'autobyteus-server-ts',settings)
start('renderer',['pnpm','dev','--host','127.0.0.1','--port','3611'],W/'autobyteus-web',{'BACKEND_NODE_BASE_URL':'http://127.0.0.1:8611','NODE_ENV':'development'})
start('browser',['/usr/bin/chromium','--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9231','--user-data-dir='+str(profile),'about:blank'],W,{})
result={'root':str(root),'dataDir':str(data),'workspace':str(ws),'server':'http://127.0.0.1:8611','renderer':'http://127.0.0.1:3611','cdp':'http://127.0.0.1:9231','processes':records,'ownership':'New API01 resources only; other services8000/shared browser9222 untouched.'}
(E/'runtime/environment.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
