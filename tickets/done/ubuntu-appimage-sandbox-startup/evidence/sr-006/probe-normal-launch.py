#!/usr/bin/env python3
"""Diagnostic only: exact released AppImage, no sandbox override; private roots,
clean environment, one free loopback port, 15-second process-group cleanup.
Usage: python3 probe-normal-launch.py /absolute/AppImage evidence-output.json
This is failure reproduction, NOT a current-source build or final validation.
"""
import os, sys, socket, subprocess, tempfile, signal, pathlib, json, resource, hashlib, shutil
artifact=pathlib.Path(sys.argv[1]).resolve(); out=pathlib.Path(sys.argv[2]).resolve()
root=pathlib.Path(tempfile.mkdtemp(prefix='autobyteus-sandbox-sr006-'))
for p in ['home','config','cache','data','profile']: (root/p).mkdir(mode=0o700)
with socket.socket() as s:
    s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
env={k:os.environ[k] for k in ['DISPLAY','WAYLAND_DISPLAY','XDG_RUNTIME_DIR','XAUTHORITY','DBUS_SESSION_BUS_ADDRESS','LANG','USER','LOGNAME'] if k in os.environ}
env.update(PATH='/usr/bin:/bin', HOME=str(root/'home'), XDG_CONFIG_HOME=str(root/'config'), XDG_CACHE_HOME=str(root/'cache'), XDG_DATA_HOME=str(root/'data'), AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE='e2e', AUTOBYTEUS_ELECTRON_DATA_ROOT=str(root/'profile'), AUTOBYTEUS_ELECTRON_SERVER_PORT=str(port))
resource.setrlimit(resource.RLIMIT_CORE,(0,0))
p=subprocess.Popen([str(artifact)],env=env,cwd=root,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True,text=True)
timed=False
try: stdout,stderr=p.communicate(timeout=15)
except subprocess.TimeoutExpired:
    timed=True; os.killpg(p.pid,signal.SIGTERM)
    try: stdout,stderr=p.communicate(timeout=5)
    except subprocess.TimeoutExpired:
        os.killpg(p.pid,signal.SIGKILL); stdout,stderr=p.communicate()
finally:
    try: os.killpg(p.pid,signal.SIGTERM)
    except ProcessLookupError: pass
result=dict(artifact=str(artifact), sha256=hashlib.file_digest(artifact.open('rb'),'sha256').hexdigest(), argv=[str(artifact)], isolated_root=str(root), port=port, pid=p.pid, exit_code=p.returncode,timed_out=timed, stdout=stdout,stderr=stderr, created_profile_files=[str(x.relative_to(root)) for x in root.rglob('*') if x.is_file()])
shutil.rmtree(root); result['isolated_root_removed']=not root.exists()
out.write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps(result,indent=2))
