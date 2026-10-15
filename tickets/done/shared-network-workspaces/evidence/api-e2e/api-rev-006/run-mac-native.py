"""Actual public candidate on disposable macOS/APFS; no identity/helper substitution."""
exec((__import__('pathlib').Path(__file__).resolve().parent/'mac-common.py').read_text())
try:
 case('fresh owned nonempty APFS source',lambda:m('set -e; test ! -e /etc/autobyteus-nfs/attachment.json; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API006_MAC > '+SRC+'/project/preexisting.txt; chmod 644 '+SRC+'/project/preexisting.txt; id; /usr/bin/sw_vers; stat -f "%d:%i:%u:%g:%Lp" '+SRC))
 q=case('public current nativeMac create under077',lambda:m('umask 077; exec '+B+' create --source '+SRC+' --backend apple --endpoint '+mac['ip']+' --allow '+mac['ip']+' --nodes none --yes --json',180));v=json.loads(q['stdout']);assert v['status']['hostReady'] and v['status']['nodes']=={};r['connection']=v['connection'];save()
 r['baseline']=capture('initial');h=json.loads(r['baseline']['bindingBytes']);assert h['sourceIdentity']['volumeUuid']==r['baseline']['volume']['VolumeUUID'].lower() if 'sourceIdentity' in h else h['identity']['volumeUuid']==r['baseline']['volume']['VolumeUUID'].lower();save()
 case('initial real nonroot mounted RW private/job/exports',lambda:mounted_proof('initial'))
 for n in range(1,5):
  case('ordinary automatic whole-host boot '+str(n),lambda:boot('boot'+str(n)))
  if n>=2 and any(v['stat'].split(':')[0]!=r['baseline']['stat'].split(':')[0] for v in r['observations'][1:]):break
 else:raise RuntimeError('no actual raw device reassignment witnessed')
 q=case('separately labelled explicit public reconnect',lambda:m(B+' reconnect --yes --json',90));assert json.loads(q['stdout'])['hostReady'];case('explicit reconnect mounted RW',lambda:mounted_proof('explicit'))
 assert capture('after-explicit')['bindingBytes']==r['baseline']['bindingBytes'];r['result']='Pass';save();event('API-F005 automatic first gate Pass with actual raw device change; replacement controls and broader matrix pending')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('Mac first gate Fail/incomplete '+repr(x))
 try:r['diagnostics']=m('/sbin/mount; sudo -n launchctl print system/com.autobyteus.nfs; sudo -n tail -60 '+Q(STATE+'/service.log'),20,False);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
