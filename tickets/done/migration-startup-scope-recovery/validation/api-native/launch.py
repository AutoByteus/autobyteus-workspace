from pathlib import Path
import os,json,subprocess,sys,socket
w=Path(__file__).resolve().parents[5]; mode=sys.argv[1];root=w/'.local'/('api-native-'+mode)
assert not root.exists(),'Fresh isolated launch roots only'
with socket.socket() as s: s.bind(('127.0.0.1',29695))
(root/'home').mkdir(parents=True)
if mode=='fatal':
 d=root/'home/.autobyteus/server-data/db';d.mkdir(parents=True)
 key=d/'production.db.secret.key';key.write_bytes(b'not-a-valid-test-key');key.chmod(0o600)
 (root/'no-hold').write_text('Real invalid owned key failure control')
if mode=='fataldb':
 d=root/'home/.autobyteus/server-data/db';d.mkdir(parents=True)
 (d/'production.db').write_bytes(b'API-owned invalid SQLite fixture')
 (root/'no-hold').write_text('Real invalid owned database failure control')
env={k:os.environ[k] for k in ['PATH','TMPDIR','LANG','LC_ALL','SHELL','USER','LOGNAME'] if k in os.environ}
env.update(HOME=str(root/'home'),API_NATIVE_ROOT=str(root),VITE_DEV_SERVER_URL='http://127.0.0.1:50572',NODE_ENV='development')
exe=w/'autobyteus-web/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
log=(root/'console.log').open('wb');p=subprocess.Popen([str(exe),str(Path(__file__).parent/'bootstrap.cjs')],cwd=w/'autobyteus-web',env=env,stdout=log,stderr=subprocess.STDOUT)
(root/'launch.json').write_text(json.dumps({'pid':p.pid,'root':str(root),'executable':str(exe),'mode':mode,'envKeys':list(env)},indent=2));print(json.dumps({'pid':p.pid,'root':str(root)}),flush=True);print('EXIT',p.wait(),flush=True)
