from pathlib import Path
import subprocess as sp,json,time,hashlib,os
E=Path(__file__).resolve().parent;R=Path.cwd();S=Path((E/'scratch-path.txt').read_text().strip());cfg=json.loads((E/'scope-change-cleanup-correction.json').read_text())['guest'];r={'result':'Preparing','guest':cfg,'commands':[]}
def save():(E/'linux-resume.json').write_text(json.dumps(r,indent=2)+'\n')
def c(args,t=60):
 p=sp.run(args,env=(os.environ if args[0]=='/usr/local/bin/docker' else cfg['env']),capture_output=True,text=True,timeout=t);q={'argv':args,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q);save();return q
assert S.is_dir();q=c([cfg['tart'],'list','--format','json']);entries=json.loads(q['stdout']);vm=next(x for x in entries if x.get('Name')==cfg['name']);assert vm['State']=='stopped',vm;r['priorState']=vm
q=c(['/usr/local/bin/docker','image','inspect','ab-nfs-api007-server:current']);assert q['rc']==0;im=json.loads(q['stdout'])[0];assert im['Id']=='sha256:a790be37c80041d93f510dff82552b4272965aaa570bd7937f225d0bfa3d91d2';r['serverImage']=im['Id']
f=(E/'linux-resume-boot.log').open('w');p=sp.Popen(cfg['runArgv'],env=cfg['env'],stdout=f,stderr=sp.STDOUT,start_new_session=True);r['pid']=p.pid;save()
for i in range(90):
 assert p.poll() is None,'VM exited'
 try:
  q=c([cfg['tart'],'exec',cfg['name'],'/bin/sh','-c','id; cat /etc/os-release; uname -a; cat /proc/sys/kernel/random/boot_id; findmnt -no SOURCE,FSTYPE /; sha256sum /home/admin/api007-nfs; sudo -n test ! -e /etc/autobyteus-nfs/attachment.json; ! findmnt -t nfs,nfs4'],5)
  if q['rc']==0:break
 except sp.TimeoutExpired:pass
 time.sleep(2)
else:raise RuntimeError('guest not ready')
assert cfg['binary']['sha256'] in q['stdout'];r['preflight']=q;r['result']='Ready';save();print(json.dumps({'result':r['result'],'pid':p.pid}))
