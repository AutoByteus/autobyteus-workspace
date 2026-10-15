"""API-REV002 independent focused revalidation: fresh credential-free native Mac startup.
User suggested/authorized this VM testing path. No host mounts, shared directories,
private credentials, provider calls, guest-source patch, release qualification or node mutation.
Run from worktree root with a source-audited native binary. Owned clone is retired
in finally; public source image/tool cache is retained. Native Mac VM != physical LAN.
"""
from pathlib import Path
import subprocess as sp,json,time,os,hashlib,uuid,sys,shlex
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
import argparse
ap=argparse.ArgumentParser();ap.add_argument('--name',required=True);ap.add_argument('--binary-record',required=True);ap.add_argument('--trace',action='store_true');args=ap.parse_args()
assert args.name.replace('-','').isalnum()
RESULT=E/(args.name+'-result.json');assert not RESULT.exists(),'preserve previous evidence'
TRACE=None
CACHE=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');TART=str(CACHE/'tools/tart.app/Contents/MacOS/tart')
ENV={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(CACHE/'driver-home'),'TART_HOME':str(CACHE/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
VM='ab-nfs-api002-'+uuid.uuid4().hex[:8];IMAGE='ghcr.io/cirruslabs/macos-tahoe-base@sha256:87f3aa5ce21b5c876268f233bdfecf38b4c2a8116fe9bbb718e714cbae187377'
SRC='/Users/admin/'+VM+'-source';BIN='/Users/admin/'+VM+'-binary';ROOT='/Volumes/autobyteus-shared'
report={'vm':VM,'baseImage':IMAGE,'source':SRC,'mountRoot':ROOT,'binary':json.loads(Path(args.binary_record).read_text()),'noHostShares':True,'noCredentials':True,'commands':[],'cases':[],'cleanup':[]}
vm=None;cloned=False;log=None

def save(): RESULT.write_text(json.dumps(report,indent=2)+'\n')
def event(state,msg):
 print(state,msg,flush=True)
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round2 '+args.name+' '+state+'** — '+msg+'\n')
def cmd(*args,timeout=30,check=True,input=None):
 started=time.monotonic();p=sp.run(args,env=ENV,capture_output=True,input=input,timeout=timeout)
 row={'argv':list(args),'rc':p.returncode,'seconds':round(time.monotonic()-started,3),'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')};report['commands'].append(row);save()
 if check and p.returncode:raise RuntimeError(row['stderr'][-2000:]+row['stdout'][-2000:])
 return row

def vt(*args,**kw): return cmd(TART,*args,**kw)
def guest(code,**kw):return vt('exec',VM,'/usr/bin/sudo','-n','-u','admin','/bin/sh','-c',code,**kw)
def case(name,fn):
 row={'name':name};start=time.monotonic()
 try:row['evidence']=fn();row['status']='Pass';print('PASS',name,flush=True)
 except BaseException as ex:row['status']='Fail';row['error']=repr(ex);print('FAIL',name,repr(ex),flush=True);raise
 finally:row['seconds']=round(time.monotonic()-start,3);report['cases'].append(row);save();event('Checkpoint',name+': '+row['status'])
 return row.get('evidence')
try:
 event('Started','Fresh native macOS VM; real worktree CLI/root install/create. No released bootstrap claimed. '+VM)
 vt('clone',IMAGE,VM,timeout=120);cloned=True
 vt('set',VM,'--cpu','2','--memory','4096')
 log=(E/(args.name+'-console.log')).open('w');argv=[TART,'run',VM,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories','--net-host']
 vm=sp.Popen(argv,env=ENV,stdout=log,stderr=sp.STDOUT);report['vmPid']=vm.pid;report['runArgv']=argv;save()
 for i in range(60):
  assert vm.poll() is None,'VM exited'
  try:
   identity=vt('exec',VM,'/usr/bin/sw_vers',timeout=5,check=False)
   if identity['rc']==0:break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('VM command control unavailable')
 ip=guest('/usr/sbin/ipconfig getifaddr en0')['stdout'].strip();report['ip']=ip;save()
 case('fresh platform/source preflight',lambda:guest('set -e; id; sw_vers; test ! -e /etc/exports; test ! -e /Library/AutoByteusNFS; test ! -e /etc/autobyteus-nfs; test ! -e '+ROOT+'; test ! -e '+SRC+'; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API002 > '+SRC+'/project/preexisting.txt; shasum -a 256 '+SRC+'/project/preexisting.txt; /usr/bin/stat -f "%u:%g %Lp %N" /Library /Library/\'Application Support\' /Volumes '+SRC+'; /sbin/mount'))
 source_identity=guest('/usr/bin/stat -f "%d:%i:%u:%g:%Lp" '+SRC)['stdout'].strip();report['sourceIdentityBefore']=source_identity;save()
 data=Path(report['binary']['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==report['binary']['sha256']
 vt('exec','-i',VM,'/usr/bin/sudo','-n','-u','admin','/bin/sh','-c','umask 077; cat > '+BIN+'; chmod 755 '+BIN,input=data)
 q=guest('shasum -a 256 '+BIN+'; '+BIN+' version');assert report['binary']['sha256'] in q['stdout'];report['guestBinary']=q;save()
 if args.trace:
  TRACE='/Users/admin/'+VM+'-startup.pcap'
  capture=guest('sudo -n /bin/sh -c '+shlex.quote('/usr/sbin/tcpdump -i lo0 -s 0 -U -w '+TRACE+' '+shlex.quote('port 111 or port 2049 or port 20048')+' > '+TRACE+'.log 2>&1 < /dev/null & echo $!'))
  report['capturePid']=int(capture['stdout'].strip());save()
 invocation='umask 077; exec '+BIN+' create --source '+SRC+' --endpoint '+ip+' --allow '+ip+','+ip.rsplit('.',1)[0]+'.1 --nodes none --yes --json'
 result=case('normal create under077 with real sudo/root/nonroot probe',lambda:guest(invocation,timeout=180))
 payload=json.loads(result['stdout']);assert payload['status']['hostReady'] is True,payload
 expected=hashlib.sha256(b'ORIGINAL_API002').hexdigest()
 hashes=guest('shasum -a 256 '+ROOT+'/project/preexisting.txt '+SRC+'/project/preexisting.txt')['stdout'].splitlines()
 assert len(hashes)==2 and all(line.split()[0]==expected for line in hashes),hashes
 # Save exact source/mount descriptor and permissions without editing product state.
 proof=guest('cat /etc/autobyteus-nfs/attachment.json; /usr/bin/stat -f "%u:%g %Lp %N" /Library/AutoByteusNFS /Library/AutoByteusNFS/libexec /Library/AutoByteusNFS/libexec/autobyteus-nfs /etc/autobyteus-nfs /etc/autobyteus-nfs/attachment.json; shasum -a 256 '+ROOT+'/project/preexisting.txt '+SRC+'/project/preexisting.txt; /sbin/mount; sudo -n /bin/launchctl print system/com.autobyteus.nfs')
 report['postCreateProof']=proof
 assert '\tstate = running' in proof['stdout'],proof
 identity_after=guest('/usr/bin/stat -f "%d:%i:%u:%g:%Lp" '+SRC)['stdout'].strip();assert identity_after==source_identity,(source_identity,identity_after)
 report['sourceIdentityAfter']=identity_after
 for marker in [SRC,ROOT]:
  value=json.loads(guest('cat '+marker+'/.autobyteus-nfs/storage.json')['stdout']);assert value['storageId']==payload['connection']['storageId'],value
 preserved=guest("set -e; sudo -n test ! -e '/Library/Application Support/AutoByteusNFS/pending-setup.json'; sudo -n stat -f '%u:%g %Lp %N' '/Library/Application Support/AutoByteusNFS' '/Library/Application Support/AutoByteusNFS/attachment.json'; shasum -a 256 /Library/AutoByteusNFS/libexec/autobyteus-nfs; sudo -n cat '/Library/Application Support/AutoByteusNFS/hosted-filesystem.json'")
 private_modes=preserved['stdout'].splitlines()[:2];assert [line.split()[0].split(':')[0] for line in private_modes]==['0','0'];assert [line.split()[1] for line in private_modes]==['700','600'];assert report['binary']['sha256'] in preserved['stdout']
 report['privateAndBinaryProof']=preserved;report['rpcObservation']=guest('sudo -n /usr/sbin/rpcinfo -p; /usr/bin/nfsstat -m; sudo -n /bin/cat /etc/exports; sudo -n /bin/cat /etc/nfs.conf',check=False);report['result']='Pass';save();event('Completed','Pass fresh Mac create. Other mode, reboot/client, published installer and physical/inference claims remain unproven.')
except BaseException as ex:
 report['result']='Fail';report['fatal']=repr(ex);save();event('Completed','Fail/incomplete cold startup: '+repr(ex)+'. Capture diagnostic before clone retirement; not an outage injection.')
 if vm and vm.poll() is None:
  try:report['diagnostics']=guest('sudo -n /usr/sbin/rpcinfo -p; /usr/bin/nfsstat -m; sudo -n /bin/cat /etc/exports; sudo -n /bin/cat /etc/nfs.conf; id; sudo -n /usr/bin/stat -f "%u:%g %Lp %N" /Library /Library/\'Application Support\' /Library/\'Application Support\'/AutoByteusNFS /Library/AutoByteusNFS /Library/AutoByteusNFS/libexec /Library/AutoByteusNFS/libexec/autobyteus-nfs /etc/autobyteus-nfs /Volumes; /sbin/mount; sudo -n /sbin/nfsd status; test ! -f /etc/autobyteus-nfs/attachment.json || cat /etc/autobyteus-nfs/attachment.json; test ! -f '+SRC+'/project/preexisting.txt || shasum -a 256 '+SRC+'/project/preexisting.txt; sudo -n /bin/ls -la /Library/\'Application Support\'/AutoByteusNFS; sudo -n /usr/bin/pgrep -lf autobyteus-nfs',check=False)
  except Exception as dx:report['diagnosticError']=repr(dx)
  save()
finally:
 if vm and vm.poll() is None and TRACE:
  try:
   guest('sudo -n kill -INT '+str(report['capturePid']),check=False)
   trace=guest('sudo -n /usr/sbin/tcpdump -K -tttt -nn -vvv -X -r '+TRACE,check=False)
   (E/(args.name+'-packets.log')).write_text(trace['stdout']+trace['stderr'])
   report['nfsSystemLog']=guest("sudo -n /usr/bin/log show --last 3m --style compact --predicate 'process == \"nfsd\" OR process == \"mount_nfs\"'",timeout=40,check=False)
  except Exception as ex:report['captureError']=repr(ex)
 if vm:
  if vm.poll() is None:
   try:report['cleanup'].append(vt('stop',VM,'--timeout','15',timeout=35,check=False))
   except Exception as ex:report['cleanup'].append({'stopError':repr(ex)})
   try:vm.wait(timeout=20)
   except sp.TimeoutExpired:
    vm.terminate()
    try:vm.wait(timeout=10)
    except sp.TimeoutExpired:vm.kill();vm.wait(timeout=10)
  report['cleanup'].append({'exactVmProcessExited':vm.poll() is not None,'exitCode':vm.returncode})
 if log:log.close()
 if cloned and (not vm or vm.poll() is not None):
  report['cleanup'].append(vt('delete',VM,timeout=60,check=False))
  listing=vt('list');report['cleanup'].append({'cloneAbsent':VM not in listing['stdout'],'cacheRetained':IMAGE in listing['stdout']})
 save();event('Checkpoint','Cleanup recorded in the named result file; no host OS resource or user-node action.')
print(json.dumps({'result':report.get('result'),'fatal':report.get('fatal'),'vm':VM}),flush=True)
sys.exit(0 if report.get('result')=='Pass' else 1)
