"""L17-L20 both selected nodes. Real ordinary whole-guest boot and public launcher operations."""
from pathlib import Path
import sys,copy
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-lifecycle-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text())
prior=json.loads((E/(MODE+'-both-create-result.json')).read_text());assert prior['result']=='Pass'
setup=json.loads((E/'managed-client-image-result.json').read_text());launcher=setup['launcherRoot']+'/scripts/public/docker/autobyteus-docker.sh';home='/home/admin/api007-launcher-home'
nodes=['autobyteus-server-0','autobyteus-server-1'];UUID=prior['connection']['storageId'];q=shlex.quote
r.update(mode=MODE,connection=prior['connection'],boots=[])
def inspect():return json.loads(g('sudo -n docker inspect '+' '.join(nodes))['stdout'])
def launch(args,timeout=90):return g('sudo -n env -i HOME='+home+' PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin bash '+launcher+' '+args,timeout=timeout)
def private(n):return g('sudo -n docker exec '+n+' sha256sum /root/.codex/api007-sentinel /home/autobyteus/data/api007-sentinel /home/vncuser/.config/chromium/api007-sentinel')['stdout']
def health(names=nodes):
 end=time.monotonic()+240
 while time.monotonic()<end:
  try:
   z=g(' && '.join('sudo -n docker exec '+n+' node -e '+q("fetch('http://127.0.0.1:8000/rest/health').then(r=>{if(!r.ok)process.exit(1);return r.text()}).then(console.log).catch(()=>process.exit(1))") for n in names),check=False,timeout=15)
   if z['rc']==0:
    z=nongroups(B+' status --yes --json',check=False,timeout=20)
    if z['rc']==0:
     v=json.loads(z['stdout'])
     if v['hostReady'] and all(v['nodes'][n].startswith('ready;') for n in names):return z
  except sp.TimeoutExpired:pass
  time.sleep(2)
 raise RuntimeError('Automatic actual readiness not observed in240s; no manual repair; observation bound not SLA')
def roundtrip():
 token='API007_'+MODE+'_'+str(time.monotonic_ns());paths=[]
 for i,n in enumerate(nodes):
  p=ROOT+'/api007-'+MODE+'/lifecycle-'+str(i)
  code="import pathlib,os;p=pathlib.Path("+repr(p)+");f=p.open('wb');f.write("+repr((token+str(i)).encode())+");f.flush();os.fsync(f.fileno());f.close()"
  g('sudo -n docker exec --user 1000:109 '+n+' python3 -c '+q(code))
  code="from pathlib import Path;assert Path("+repr(p)+").read_bytes()=="+repr((token+str(i)).encode())+";print('reciprocal exact committed bytes')"
  paths.append(g('sudo -n docker exec --user 1000:109 '+nodes[1-i]+' python3 -c '+q(code)))
 return paths
def preserved(before):
 after=inspect();r['latestInspect']=after;save()
 for a,b,n in zip(before,after,nodes):
  assert a['Id']==b['Id'] and a['Image']==b['Image'] and a['Config']==b['Config']
  ac=copy.deepcopy(a['HostConfig']);bc=copy.deepcopy(b['HostConfig'])
  for x in [ac,bc]:
   if x.get('Dns') is None:x['Dns']=[]
   if x.get('OomKillDisable') is None:x['OomKillDisable']=False
  assert ac==bc,{'changedHostConfig':[k for k in ac if ac[k]!=bc.get(k)]}
  assert sorted(a['Mounts'],key=lambda x:x['Destination'])==sorted(b['Mounts'],key=lambda x:x['Destination'])
  assert a['NetworkSettings']['Ports']==b['NetworkSettings']['Ports']
  assert set(a['NetworkSettings']['Networks'])==set(b['NetworkSettings']['Networks'])
  for net in a['NetworkSettings']['Networks']:assert a['NetworkSettings']['Networks'][net]['Aliases']==b['NetworkSettings']['Networks'][net]['Aliases']
  if b['State']['Running']:assert private(n)==prior['privateHashes'][n]
 z=json.loads(snapshot()['stdout']);assert z['sourceHash']==z['mountedHash']==hashlib.sha256(b'ORIGINAL_API007').hexdigest();assert z['sourceMarker']==z['mountedMarker']=={'storageId':UUID}
 return {'rawInspect':after,'source':z,'normalizations':['Docker empty DNS null/[]','OomKillDisable null/false']}
def reboot(names=nodes):
 old=g('cat /proc/sys/kernel/random/boot_id')['stdout'].strip();start=time.monotonic()
 try:g('sudo -n systemctl reboot',check=False,timeout=10)
 except sp.TimeoutExpired:pass
 for i in range(90):
  try:
   z=g('cat /proc/sys/kernel/random/boot_id',check=False,timeout=5)
   if z['rc']==0 and z['stdout'].strip()!=old:break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('new kernel boot ID not observed')
 v={'old':old,'new':z['stdout'].strip(),'readiness':health(names),'seconds':time.monotonic()-start};r['boots'].append(v);save();return v
def reconnect():
 # Automatic service can briefly own its startup probe lock after RW is already proved.
 for i in range(20):
  z=nongroups(B+' reconnect --yes --json',check=False,timeout=60)
  if z['rc']==0:
   v=json.loads(z['stdout']);assert v['hostReady'] and v['storageId']==UUID;return z
  assert 'another lifecycle operation' in z['stderr'] or 'lock' in z['stderr'],z
  time.sleep(1)
 raise RuntimeError('administrative lifecycle lock not released')
try:
 before=inspect();r['initialInspect']=before;save()
 case('L17 '+MODE+' repeated actual status and explicit reconnect preserve source UUID',lambda:[nongroups(B+' status --yes --json',timeout=30),reconnect(),reconnect(),preserved(before),roundtrip()])
 case('L18 '+MODE+' ordinary whole-host boot automatic both node readiness before any manual reconnect',reboot)
 case('L18 '+MODE+' automatic same ID image config private/source and reciprocal bytes',lambda:[preserved(before),roundtrip()])
 case('L18 '+MODE+' separate explicit reconnect after automatic proof',lambda:[reconnect(),preserved(before),roundtrip()])
 case('L19 '+MODE+' public launcher normal Stop on healthy node A',lambda:launch('stop --name '+nodes[0]))
 def stopped():
  a,b=inspect();assert not a['State']['Running'] and a['State']['Error']=='';assert a['HostConfig']['RestartPolicy']['Name']=='unless-stopped';assert b['State']['Running']
  z=nongroups(B+' status --yes --json',timeout=30);v=json.loads(z['stdout']);assert v['hostReady'] and v['nodes'][nodes[0]].startswith('stopped:') and v['nodes'][nodes[1]].startswith('ready;')
  return [z,preserved(before)]
 case('L19 '+MODE+' stopped A healthy B immediate',stopped)
 event('L19 '+MODE+' observing two normal30-second supervisor ticks');time.sleep(65)
 case('L19 '+MODE+' normal Stop persists through ticks and explicit reconnect',lambda:[stopped(),reconnect(),stopped()])
 case('L19 '+MODE+' ordinary boot while A intentionally stopped',lambda:reboot([nodes[1]]))
 time.sleep(35)
 case('L19 '+MODE+' stopped A persists after boot while B automatically healthy',stopped)
 case('L20 '+MODE+' explicit operator starts A then ordinary node restart both',lambda:g('sudo -n docker start '+nodes[0]+'; sudo -n docker restart '+' '.join(nodes),timeout=90))
 case('L20 '+MODE+' ordinary restart preserved both selected nodes',lambda:[health(),preserved(before),roundtrip()])
 g('set -e; sudo -n docker start ab-nfs-api007-registry; sudo -n mkdir -p '+home+'/.local/bin; sudo -n cp /usr/libexec/autobyteus-nfs/autobyteus-nfs '+home+'/.local/bin/autobyteus-nfs; sudo -n chmod 755 '+home+'/.local/bin/autobyteus-nfs')
 case('L20 '+MODE+' public launcher upgrade --all immutable current worktree image',lambda:launch('upgrade --all --image '+setup['guestRegistryDigest'],180))
 after=inspect();r['upgradeBefore']=before;r['upgradeAfter']=after;save()
 for a,b,n in zip(before,after,nodes):
  assert a['Id']!=b['Id'] and a['Image']==b['Image'] and b['Config']['Labels']['com.autobyteus.nfs.storageId']==UUID
  assert {m['Destination']:m for m in a['Mounts']}=={m['Destination']:m for m in b['Mounts']}
  assert a['HostConfig']['PortBindings']==b['HostConfig']['PortBindings'];assert a['HostConfig']['RestartPolicy']==b['HostConfig']['RestartPolicy']
  assert private(n)==prior['privateHashes'][n]
 before=after
 case('L20 '+MODE+' current replacement references and actual peer bytes',lambda:[health(),preserved(before),roundtrip()])
 case('L20 '+MODE+' ordinary boot resolves new current references not stale IDs',reboot)
 case('L20 '+MODE+' current reference image private and original source preserved',lambda:[preserved(before),roundtrip()])
 r['result']='Pass';save()
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save()
 try:r['diagnostics']=g('sudo -n docker ps -a; sudo -n journalctl -b -u autobyteus-nfs.service --no-pager -n 140',check=False,timeout=25);save()
 except BaseException:pass
 raise
