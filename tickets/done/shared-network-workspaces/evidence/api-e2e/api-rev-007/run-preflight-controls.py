from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='preflight-controls-result.json';exec((E/'common.py').read_text())
q=shlex.quote;P='/home/admin/api007-controls'
def inspect():return json.loads(g('sudo -n docker inspect autobyteus-server-0 autobyteus-server-1')['stdout'])
try:
 assert json.loads((E/'managed-nodes-prepare-result.json').read_text())['result']=='Ready'
 cmd(['exec','-i',V,'sh','-c','cat > '+B+'; chmod 755 '+B],data=Path(build['binary']['path']).read_bytes())
 addr=json.loads(g('ip -4 -j addr show dev enp0s1')['stdout']);ip=addr[0]['addr_info'][0]['local'];r['endpoint']=ip
 g('set -e; mkdir -m 755 '+P+'; mkdir -m 755 '+P+'/source '+P+'/target; printf CONTROL_BYTES > '+P+'/target/keep.txt; ln -s '+P+'/source '+P+'/link')
 before=inspect();r['before']=before;save()
 def refused(name,source,root,drain,expected):
  a=B+' create --source '+q(source)+' --backend ganesha-native --endpoint '+ip+' --allow '+ip+' --nodes autobyteus-server-0 --mount-root '+q(root)+' --yes --json'+(' --drained' if drain else '')
  z=nongroups(a,check=False,timeout=60)
  assert z['rc']!=0,z;assert any(x.lower() in (z['stdout']+z['stderr']).lower() for x in expected),z
  g('set -e; sudo -n test ! -e /etc/autobyteus-nfs/attachment.json; sudo -n test ! -e /var/lib/autobyteus-nfs/pending-setup.json; test ! -e '+P+'/source/.autobyteus-nfs/storage.json; test "$(cat '+P+'/target/keep.txt)" = CONTROL_BYTES')
  after=inspect()
  for a,b in zip(before,after):
   assert a['Id']==b['Id'] and a['Config']==b['Config'] and a['HostConfig']==b['HostConfig'] and a['State']['Running']==b['State']['Running']
  return z
 case('L04 private home source refusal/no changes',lambda:refused('private','/home/admin',ROOT,True,['private','home']))
 case('L04 symlink source refusal/no changes',lambda:refused('symlink',P+'/link',ROOT,True,['symlink','canonical']))
 case('L04 nonempty target refusal/preserved bytes',lambda:refused('target',P+'/source',P+'/target',True,['empty','writable','target']))
 case('L04 required drain withheld/no changes',lambda:refused('drain',P+'/source',ROOT,False,['drain']))
 # Public connection JSON is data, not evaluated; malformed input rejected before any attachment.
 z=nongroups(B+' connect --connection '+q('{"endpoint":"$(touch /home/admin/api007-INJECTION)"}')+' --nodes none --yes --json',check=False)
 assert z['rc']!=0;g('test ! -e /home/admin/api007-INJECTION');r['malformedConnect']=z
 r['result']='Pass';save();event('L04 consent/private/symlink/nonempty controls and malformed public connect Pass; no setup applied')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();raise
