"""Narrow IR-001 check, not an updater E2E. From repo root after server build."""
import http.client, json, os, secrets, shutil, socket, subprocess, tempfile, time
from pathlib import Path
server = Path('autobyteus-server-ts').resolve()
with tempfile.TemporaryDirectory(prefix='abt15-busy-probe-') as temp:
    own = Path(temp)
    for d in ('home', 'data', 'tmp'): (own/d).mkdir()
    (own/'data'/'.env').write_text('APP_ENV=test\n')
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0)); port=s.getsockname()[1]
    owner='own_' + secrets.token_urlsafe(32)
    env={'PATH':os.environ['PATH'], 'HOME':str(own/'home'), 'TMPDIR':str(own/'tmp'), 'APP_ENV':'test',
         'AUTOBYTEUS_SERVER_HOST':f'http://127.0.0.1:{port}', 'AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL':owner}
    startup = own/'startup.log'
    log = startup.open('wb')
    child=subprocess.Popen([shutil.which('node'),str(server/'dist/app.js'),'--data-dir',str(own/'data'),'--host','127.0.0.1','--port',str(port)],
                           cwd=server,env=env,stdout=log,stderr=subprocess.STDOUT)
    log.close()
    try:
        def read(headers):
            conn = http.client.HTTPConnection('127.0.0.1',port,timeout=5)
            try:
                conn.request('GET','/rest/busy-runs',headers=headers)
                res=conn.getresponse()
                return res.status, res.read()
            finally: conn.close()
        deadline=time.monotonic()+60
        while child.poll() is None and time.monotonic()<deadline:
            try: code,body=read({'Authorization':'Bearer '+owner});break
            except OSError: time.sleep(.25)
        else:
            tail = startup.read_text(errors='replace').replace(owner, '[synthetic credential]').splitlines()[-18:]
            raise RuntimeError(f'Disposable server exit={child.poll()} before route was ready: ' + '\n'.join(tail))
        assert code == 200 and json.loads(body)=={'busy':0,'unknown':0}, code
        denied,_=read({})
        assert denied==401, denied
        print(f'GET /rest/busy-runs with synthetic launch owner: {code} {json.loads(body)}; without credential: {denied}')
    finally:
        child.terminate()
        try: child.wait(20)
        except subprocess.TimeoutExpired: child.kill(); child.wait(); raise
    print('Server exited:',child.returncode)
    assert child.returncode==0,child.returncode
print('Disposable home, data and temp tree removed.')
