from pathlib import Path
import subprocess as sp,json,uuid,time
E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());C=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');image='ghcr.io/cirruslabs/ubuntu@sha256:94dbb9c4b94db827a208fea301cf33eacdcbfb801155b5702b9e2faa52473a2e';name='ab-nfs-api003-linux-'+uuid.uuid4().hex[:8]
env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':str(S/'linux-tart-state'),'TART_NO_AUTO_PRUNE':'1'};r={'image':image,'clone':name,'publicImageSource':'https://github.com/cirruslabs/tart/pkgs/container/ubuntu/','instructionsSource':'https://tart.run/quick-start/','privateTartHome':env['TART_HOME'],'result':'Preparing','started':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'noVMStarted':True}
def save():(E/'linux-resource.json').write_text(json.dumps(r,indent=2)+'\n')
save();cmd=[str(C/'tools/tart.app/Contents/MacOS/tart'),'clone',image,name];r['argv']=cmd;save()
try:
 with (E/'linux-download.log').open('w') as log:p=sp.run(cmd,env=env,stdout=log,stderr=sp.STDOUT,timeout=600)
 r['rc']=p.returncode;r['result']='Ready' if p.returncode==0 else 'Blocked'
except BaseException as ex:r['result']='Blocked';r['error']=repr(ex)
finally:save();print(json.dumps(r),flush=True)
