import os, pathlib, tempfile, socket, subprocess, json, shutil, hashlib, time, urllib.request
w=pathlib.Path.cwd().resolve(); out=w/'tickets/in-progress/antigravity-runtime-missing/evidence/api-e2e/retest2'
root=pathlib.Path(tempfile.mkdtemp(prefix='agy-browser-retest-',dir='/private/tmp')).resolve(); root.chmod(0o700)
data=root/'data'; data.mkdir(); (root/'tmp').mkdir()
for name in ['db','memory','logs','agents','agent-teams','agent-orgs','skills','temp_workspace','download','media']:(data/name).mkdir()
db=data/'db/validation.db'; key=pathlib.Path(str(db)+'.secret.key')
owned=[root,data,db,key,*[pathlib.Path(str(db)+x) for x in ['-wal','-shm','-journal']],*[data/n for n in ['memory','logs','agents','agent-teams','agent-orgs','skills','temp_workspace','download','media']]]
for p in owned:
 assert p.is_absolute() and (p==root or root in p.parents)
 cur=p
 while cur!=root.parent:
  assert not cur.is_symlink(), f'symlink {cur}'
  if cur.exists():assert cur.stat().st_uid==os.getuid(), f'ownership {cur}'
  cur=cur.parent
 assert p.resolve()==p
assert not db.exists() and not key.exists()
def free_port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
bp=free_port(); fp=free_port(); assert bp!=fp
node=pathlib.Path(shutil.which('node')).resolve(); pnpm=pathlib.Path(shutil.which('pnpm')).parent
# Review allowlist only: no inherited DATABASE_URL, application context, secrets, or runtime paths.
common={'PATH':':'.join(dict.fromkeys([str(node.parent),str(pnpm),'/Users/normy/.local/bin','/usr/bin','/bin','/usr/sbin','/sbin'])), 'HOME':'/Users/normy','TMPDIR':str(root/'tmp'),'LANG':'en_US.UTF-8','NO_COLOR':'1'}
server={**common,'APP_ENV':'test','DB_TYPE':'sqlite','DATABASE_URL':'file:'+str(db),'AUTOBYTEUS_SERVER_HOST':f'http://127.0.0.1:{bp}','AUTOBYTEUS_MEMORY_DIR':str(data/'memory'),'AUTOBYTEUS_LOG_DIR':str(data/'logs'),'AUTOBYTEUS_TEMP_WORKSPACE_DIR':str(data/'temp_workspace'),'ANTIGRAVITY_CLI_COMMAND':'/Users/normy/.local/bin/agy','LOG_LEVEL':'INFO','DISABLE_HTTP_REQUEST_LOGS':'true'}
(data/'.env').write_text('APP_ENV=test\nDB_TYPE=sqlite\n')
frontend={**common,'NODE_ENV':'development','BACKEND_NODE_BASE_URL':f'http://127.0.0.1:{bp}','BACKEND_GRAPHQL_BASE_URL':f'http://127.0.0.1:{bp}/graphql','BACKEND_REST_BASE_URL':f'http://127.0.0.1:{bp}/rest'}
for name,suffix in {'GRAPHQL':'graphql','AGENT':'ws/agent','TEAM':'ws/agent-team','TRANSCRIPTION':'ws/transcribe','TERMINAL':'ws/terminal','FILE_EXPLORER':'ws/file-explorer'}.items():frontend[f'BACKEND_{name}_WS_ENDPOINT']=f'ws://127.0.0.1:{bp}/{suffix}'
sc=[str(node),str(w/'autobyteus-server-ts/dist/app.js'),'--data-dir',str(data),'--host','127.0.0.1','--port',str(bp)]
fc=[str(node),str((w/'autobyteus-web/node_modules/nuxt/bin/nuxt.mjs').resolve()),'dev','--host','127.0.0.1','--port',str(fp)]
files=['autobyteus-server-ts/dist/app.js','autobyteus-server-ts/dist/runtime-management/antigravity-cli-capability.js','autobyteus-server-ts/src/runtime-management/antigravity-cli-capability.ts']
manifest={'preflight':'PASS — before spawn','root':str(root),'data':str(data),'database':str(db),'key':str(key),'ownedPaths':[str(x) for x in owned],'backendPort':bp,'frontendPort':fp,'serverCommand':sc,'frontendCommand':fc,'serverEnv':server,'frontendEnv':frontend,'homePurpose':'existing installed CLI login only; no application SQL/memory inheritance or secret copying','freshDatabaseAndKey':True,'canonicalOwnedPaths':True,'serverDotenv':'APP_ENV=test; DB_TYPE=sqlite only','sourceHashes':{x:hashlib.sha256((w/x).read_bytes()).hexdigest() for x in files}}
(out/'preflight.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Reassert on exact checked env/argv immediately before spawn. No default env inheritance.
assert server['DATABASE_URL']=='file:'+str(db) and sc[3]==str(data)
assert all(str(root) in server[x] for x in ['AUTOBYTEUS_MEMORY_DIR','AUTOBYTEUS_LOG_DIR','AUTOBYTEUS_TEMP_WORKSPACE_DIR'])
sp=subprocess.Popen(sc,cwd=w,env=server,stdout=(out/'backend.log').open('w'),stderr=subprocess.STDOUT,start_new_session=True)
manifest['backendPid']=sp.pid;(out/'processes.json').write_text(json.dumps(manifest,indent=2)+'\n')
for _ in range(90):
 if sp.poll() is not None:raise RuntimeError('backend exited')
 try:
  if urllib.request.urlopen(f'http://127.0.0.1:{bp}/rest/health',timeout=1).status==200:break
 except Exception:time.sleep(1)
else:raise RuntimeError('backend readiness timed out')
log=(out/'backend.log').read_text(); assert f'file:{db}' in log and f'APP DATA DIRECTORY: {data}' in log
assert '/.autobyteus/server-data' not in log
fpobj=subprocess.Popen(fc,cwd=w/'autobyteus-web',env=frontend,stdout=(out/'frontend.log').open('w'),stderr=subprocess.STDOUT,start_new_session=True)
manifest['frontendPid']=fpobj.pid;(out/'processes.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'root':str(root),'backendPort':bp,'frontendPort':fp,'backendPid':sp.pid,'frontendPid':fpobj.pid,'preflight':'PASS','backendReady':True}))
