#!/usr/bin/python3
"""Disposable Ubuntu test, not an installer. Run as desktop user; --baseline needs no sudo."""
import hashlib, json, os, platform, shutil, socket, subprocess, sys, tempfile, time
from pathlib import Path
from subprocess import run

os.umask(0o077)
if os.getuid() == 0 or sys.argv[1:] not in ([], ['--baseline']):
    sys.exit("Run as your normal desktop user. Optional argument: --baseline.")
src = Path.home()/'Downloads/AutoByteus_personal_linux-x64-1.5.13-beta.9.AppImage'
pin = '5bf3637074a4fbf3d5689bc47bda2a75371fab033cd287114d622cb724af36d8'
report = Path(tempfile.mkdtemp(prefix='autobyteus-result-', dir='/tmp'))/'result.json'
print(f'Results: {report}', flush=True)
keys = ['kernel.unprivileged_userns_clone','user.max_user_namespaces','kernel.apparmor_restrict_unprivileged_userns','kernel.apparmor_restrict_unprivileged_unconfined']
def policy():
    return {k: Path('/proc/sys', k.replace('.', '/')).read_text().strip() for k in keys}
data = dict(artifact=src.name, kernel=platform.release(), before=policy(), runs=[])
def save():
    report.write_text(json.dumps(data, indent=2)+'\n')
def field(path):
    try: return path.read_text().strip()
    except OSError: return None
def link(path):
    try: return os.readlink(path)
    except OSError: return None
def snapshot(pid):
    d=Path('/proc',str(pid))
    cmd=(field(d/'cmdline') or '').split('\0')
    fields=dict(x.split(':',1) for x in (field(d/'status') or '').splitlines() if ':' in x)
    return dict(pid=pid, role=next((x for x in cmd if x.startswith('--type=')), 'untyped'),
                bypass='--no-sandbox' in cmd,label=field(d/'attr/current'),
                namespaces={k:link(d/'ns'/k) for k in ('user','pid','net')},
                status={k:fields.get(k,'').strip() for k in ('NSpid','NoNewPrivs','Seccomp','Seccomp_filters','CapEff')})
def launch(stage):
    box=root/stage; box.mkdir()
    for k in ('home','config','cache','data','profile','tmp','state'): (box/k).mkdir()
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
    env={k:os.environ[k] for k in ('DISPLAY','WAYLAND_DISPLAY','XDG_RUNTIME_DIR','DBUS_SESSION_BUS_ADDRESS','XAUTHORITY','LANG','USER','LOGNAME') if k in os.environ}
    env.update(PATH='/usr/bin:/bin',HOME=str(box/'home'),TMPDIR=str(box/'tmp'),XDG_CONFIG_HOME=str(box/'config'),XDG_DATA_HOME=str(box/'data'),XDG_STATE_HOME=str(box/'state'),XDG_CACHE_HOME=str(box/'cache'),AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE='e2e',AUTOBYTEUS_ELECTRON_DATA_ROOT=str(box/'profile'),AUTOBYTEUS_ELECTRON_SERVER_PORT=str(port))
    unit='ab-test-'+root.name+'-'+stage
    log=box/'output'
    obs={}; listening=False
    with log.open('w') as f:
        p=subprocess.Popen(['systemd-run','--user','--unit='+unit,'--pipe','--wait','--collect','--quiet','-p','LimitCORE=0','-p','RuntimeMaxSec=45','-p','TimeoutStopSec=4','--working-directory='+str(box),'/usr/bin/env','-i',*[k+'='+v for k,v in env.items()],str(app)],stdin=subprocess.DEVNULL,stdout=f,stderr=f)
        try:
            end=time.monotonic()+32
            # Ask the user manager for the unit cgroup; never inspect another app's processes.
            while time.monotonic()<end and p.poll() is None:
                raw=run(['systemctl','--user','show',unit,'-p','ControlGroup','--value'],capture_output=True,text=True).stdout.strip()
                if raw.endswith('/'+unit+'.service'):
                    cg=Path('/sys/fs/cgroup')/raw.lstrip('/')
                    for pid in (field(cg/'cgroup.procs') or '').split():
                        obs[pid]=snapshot(pid)
                with socket.socket() as s:
                    s.settimeout(.15); listening |= s.connect_ex(('127.0.0.1',port))==0
                time.sleep(.5)
        finally:
            if p.poll() is None: run(['systemctl','--user','stop',unit],capture_output=True)
            p.wait(timeout=15)
            # A stopped FUSE daemon may leave a disconnected mount. Match the owned
            # directory, filesystem type and mounting UID; never unmount by app name.
            for line in Path('/proc/self/mountinfo').read_text().splitlines():
                left,right=line.split(' - ',1)
                mp=Path(left.split()[4])
                if (mp.parent==box/'tmp' and mp.name.startswith('.mount_')
                    and right.startswith('fuse.AutoByteus.AppImage ')
                    and f'user_id={os.getuid()}' in right.split()[2].split(',')):
                    run(['/usr/bin/fusermount3','-u',str(mp)],check=True)
    msg=log.read_text(errors='replace')
    result=dict(stage=stage, exit=p.returncode, sandbox_fatal='SUID sandbox helper' in msg or 'No usable sandbox' in msg,
                fatal_lines=[l[:600] for l in msg.splitlines() if 'FATAL' in l][:4],listener_seen=listening,
                processes=list(obs.values()), inode=app.stat().st_ino)
    data['runs'].append(result); save()
    print(stage, 'sandbox fatal:', result['sandbox_fatal'], 'renderer observed:', any(v['role']=='--type=renderer' for v in obs.values()), flush=True)
    return result
with tempfile.TemporaryDirectory(prefix='ab-aa-', dir='/tmp') as tmp:
    root=Path(tmp); app=root/'AutoByteus.AppImage'
    def copy(dst):
        shutil.copyfile(src,dst)
        with dst.open('rb') as f:
            if hashlib.file_digest(f,'sha256').hexdigest()!=pin: sys.exit('Unrecognized artifact. Stopping.')
        dst.chmod(0o700)
    copy(app)
    profile=f'abi <abi/4.0>,\n"{app}" flags=(unconfined) {{\n  userns,\n}}\n'
    parser='/usr/sbin/apparmor_parser'
    run([parser,'-K','-Q'],input=profile,text=True,check=True)
    data.update(profile=profile,sha256=pin,parser_preflight=True); save()
    baseline=launch('before')
    if sys.argv[1:]!=['--baseline'] and baseline['sandbox_fatal']:
        print('Testing this temporary profile only:\n'+profile,flush=True)
        run(['sudo',parser,'-K','-a'],input=profile,text=True,check=True)
        try:
            launch('permitted')
            copy(root/'replacement'); os.replace(root/'replacement',app)
            launch('replaced')
        finally:
            removed=run(['sudo',parser,'-K','-R'],input=profile,text=True).returncode==0
            data['removed']=removed; save()
            if not removed: sys.exit('Removal failed. Reboot to clear the nonpersistent profile.')
        launch('removed')
    data['after']=policy(); save()
print('Finished. Result:', report)
