"""Ordinary whole-host events only. No manual Start/reconnect in this case."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent
RESULT='two-reboots-result.json';exec((E/'common-docker.py').read_text())
prior=json.loads((E/'docker-selected-confirm-result.json').read_text());assert prior['result']=='Pass'
prep=json.loads((E/'managed-nodes-prepare-result.json').read_text());node=prep['selected'];before=prior['after'];UUID=prior['connection']['storageId'];r.update(connection=prior['connection'],sourceIdentityBefore=prior['sourceIdentityBefore'],before=before,boots=[])
def inspect(n):return json.loads(g('sudo -n docker inspect '+n)['stdout'])[0]
def ready(window=240):
 end=time.monotonic()+window
 while time.monotonic()<end:
  try:
   q=g('curl --max-time 3 -fsS http://127.0.0.1:8001/rest/health; findmnt -n -o FSTYPE '+ROOT,check=False,timeout=8)
   if q['rc']==0 and 'nfs4' in q['stdout']:
    status=nongroups(B+' status --yes --json',check=False,timeout=15)
    if status['rc']==0:
     v=json.loads(status['stdout'])
     if v['hostReady'] and v['nodes'][node].startswith('ready;'):return {'health':q,'status':status}
  except sp.TimeoutExpired:pass
  time.sleep(3)
 raise RuntimeError('Actual API and selected readiness not obtained in 240s observation; no manual repair performed; not a product SLA')
def hostconfig_equal(a,b):
 aa=copy.deepcopy(a);bb=copy.deepcopy(b)
 # Docker restore normalizes the empty DNS list. Preserve and report raw values.
 for x in [aa,bb]:
  if x.get('Dns') is None:x['Dns']=[]
 assert aa==bb,{'hostConfigChangedKeys':[k for k in aa if aa[k]!=bb.get(k)]}
 return {'rawEqual':a==b,'emptyDnsNormalization':{'before':a.get('Dns'),'after':b.get('Dns')}}
def preserved():
 after=inspect(node);r['lastInspect']=after;save()
 assert after['Id']==before['Id'] and after['Image']==before['Image'];assert after['Config']==before['Config'];hc=hostconfig_equal(before['HostConfig'],after['HostConfig']);assert after['State']['Running']
 assert sorted(after['Mounts'],key=lambda m:m['Destination'])==sorted(before['Mounts'],key=lambda m:m['Destination'])
 assert after['NetworkSettings']['Ports']==before['NetworkSettings']['Ports'];assert set(after['NetworkSettings']['Networks'])==set(before['NetworkSettings']['Networks'])
 for net in before['NetworkSettings']['Networks']:assert after['NetworkSettings']['Networks'][net]['Aliases']==before['NetworkSettings']['Networks'][net]['Aliases']
 hashes=g('sudo -n docker exec '+node+' sha256sum /root/.codex/api005-sentinel /home/autobyteus/data/api005-sentinel /home/vncuser/.config/chromium/api005-sentinel');assert hashes['stdout']==prep['privateHashes']
 other=inspect(prep['unselected']);old=prep['unselectedBefore'];assert other['Id']==old['Id'] and other['Image']==old['Image'] and other['Config']==old['Config'] and not other['State']['Running'];oh=hostconfig_equal(old['HostConfig'],other['HostConfig'])
 q=snapshot();v=json.loads(q['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API005').hexdigest();assert v['sourceMarker']==v['mountedMarker']=={'storageId':UUID};assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore'];assert v['uid']==1000 and v['gid']==109 and v['groups']==[] and v['directoryDelegations']=='Y'
 script="""import assert from 'node:assert/strict';import fs from 'node:fs/promises';const base='http://127.0.0.1:8000';async function gql(query,variables){const r=await fetch(base+'/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});assert.equal(r.status,200);const j=await r.json();assert.equal(j.errors,undefined,JSON.stringify(j));return j.data;}const c=await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}',{input:{rootPath:'/Volumes/autobyteus-shared/project'}});const id=c.createWorkspace.workspaceId;const d=await gql('query($id:String!,$path:String!){fileContent(workspaceId:$id,filePath:$path)}',{id,path:'preexisting.txt'});assert.equal(d.fileContent,'ORIGINAL_API005');const q=await fetch(base+'/rest/workspaces/'+encodeURIComponent(id)+'/content?path=preexisting.txt');assert.equal(q.status,200);assert.equal(await q.text(),'ORIGINAL_API005');const marker=JSON.parse(await fs.readFile('/Volumes/autobyteus-shared/.autobyteus-nfs/storage.json','utf8'));assert.equal(marker.storageId,UUID);console.log(JSON.stringify({workspace:id,content:d.fileContent,marker,result:'Pass'}));""".replace('UUID',json.dumps(UUID))
 api=g('sudo -n docker exec '+node+' node --input-type=module -e '+shlex.quote(script),timeout=30)
 modes=g('sudo -n stat -c "%a:%u:%g:%n" /var/lib/autobyteus-nfs /var/lib/autobyteus-nfs/attachment.json; sudo -n find /var/lib/autobyteus-nfs -maxdepth 1 -name "start-attempt-*" -exec stat -c "%a:%u:%g:%n" {} \\; -exec cat {} \\;');assert modes['stdout'].startswith('700:0:0:') and '\n600:0:0:' in modes['stdout']
 journal=g('sudo -n journalctl -b -u autobyteus-nfs.service -u docker.service --no-pager -n 160',check=False,timeout=20)
 return {'selected':after,'unselected':other,'hostConfig':hc,'otherHostConfig':oh,'privateHashes':hashes,'source':q,'actualMountedAPI':api,'privateModesAttempts':modes,'journal':journal}
def reboot():
 boot=g('cat /proc/sys/kernel/random/boot_id')['stdout'].strip();started=time.monotonic()
 try:g('sudo -n systemctl reboot',check=False,timeout=10)
 except sp.TimeoutExpired:pass
 end=time.monotonic()+150
 while time.monotonic()<end:
  try:
   q=g('cat /proc/sys/kernel/random/boot_id',check=False,timeout=5)
   if q['rc']==0 and q['stdout'].strip()!=boot:break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('Reboot not observed')
 record={'oldBoot':boot,'newBoot':q['stdout'].strip(),'readiness':ready()};record['secondsToObservedReady']=round(time.monotonic()-started,3);r['boots'].append(record);save();return record
try:
 for i in [1,2]:
  case('ordinary whole-host reboot '+str(i)+' automatic actual readiness',reboot)
  case('reboot '+str(i)+' same ID/image/config/private/source/mounted API preservation',preserved)
 r['result']='Pass';save();event('Two fresh ordinary full-host reboots automatic readiness and exact preservation PASS; no manual Start/reconnect. Controls still required.')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('Two-reboot case Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('sudo -n docker inspect '+node+'; sudo -n journalctl -b -u autobyteus-nfs.service -u docker.service --no-pager -n 180; findmnt -t nfs,nfs4',check=False,timeout=25);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
