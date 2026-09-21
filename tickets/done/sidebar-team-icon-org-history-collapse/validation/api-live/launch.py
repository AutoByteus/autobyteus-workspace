from pathlib import Path
import os,sys,subprocess,json
w=Path(__file__).resolve().parents[5];r=w/'.local/api-sidebar';mode=sys.argv[1];env={k:os.environ[k] for k in ['PATH','TMPDIR','LANG','LC_ALL','SHELL','USER','LOGNAME'] if k in os.environ};env['HOME']=str(r/'home')
if mode=='backend':cmd=['node',str(w/'autobyteus-server-ts/dist/app.js'),'--data-dir',str(r/'data'),'--host','127.0.0.1','--port','50581']
elif mode=='proxy':cmd=['node',str(Path(__file__).parent/'proxy.mjs'),str(r)]
elif mode=='frontend':
 env['BACKEND_NODE_BASE_URL']='http://127.0.0.1:50582';cmd=['node',str(w/'autobyteus-web/node_modules/nuxt/bin/nuxt.mjs'),'dev',str(w/'autobyteus-web'),'--host','127.0.0.1','--port','50583']
else:raise Exception('unknown mode')
with (r/(mode+'.log')).open('wb') as log:
 p=subprocess.Popen(cmd,cwd=(w/'autobyteus-web' if mode=='frontend' else w),env=env,stdout=log,stderr=subprocess.STDOUT);(r/(mode+'-launch.json')).write_text(json.dumps({'pid':p.pid,'cmd':cmd,'envKeys':list(env)},indent=2));print(mode,p.pid,flush=True);print('EXIT',p.wait(),flush=True)
