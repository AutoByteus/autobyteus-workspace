from pathlib import Path
import os,sys,subprocess,json
w=Path(__file__).resolve().parents[5];r=w/'.local/api-history-latency';mode=sys.argv[1];env={k:os.environ[k] for k in ['PATH','TMPDIR','LANG','LC_ALL','SHELL','USER','LOGNAME'] if k in os.environ};env.update(HOME=str(r/'home'),OLLAMA_HOSTS='http://127.0.0.1:51184',LMSTUDIO_HOSTS='http://127.0.0.1:51184')
if mode=='backend':
 env['NODE_OPTIONS']='--import='+str(Path(__file__).parent/'provider-observer.mjs');env['API_PROBE_ROOT']=str(r);env['CLAUDE_AGENT_SDK_AUTH_MODE']='api-key'
 cmd=['node',str(w/'autobyteus-server-ts/dist/app.js'),'--data-dir',str(r/'data'),'--host','127.0.0.1','--port','51181'];cwd=w
elif mode=='proxy':cmd=['node',str(Path(__file__).parent/'proxy.mjs'),str(r)];cwd=w
elif mode=='frontend':
 env['BACKEND_NODE_BASE_URL']='http://127.0.0.1:51182';cmd=['node',str(w/'autobyteus-web/node_modules/nuxt/bin/nuxt.mjs'),'dev',str(w/'autobyteus-web'),'--host','127.0.0.1','--port','51183'];cwd=w/'autobyteus-web'
else:raise Exception('invalid')
with (r/(mode+'.log')).open('wb') as log:
 p=subprocess.Popen(cmd,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT);(r/(mode+'-launch.json')).write_text(json.dumps({'pid':p.pid,'cmd':cmd,'environment_keys':list(env)},indent=2));print(mode,p.pid,flush=True);print('EXIT',p.wait(),flush=True)
