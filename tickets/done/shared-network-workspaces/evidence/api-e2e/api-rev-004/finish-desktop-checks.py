from pathlib import Path
import json,subprocess as sp,os,signal,time
E=Path(__file__).resolve().parent;start=json.loads((E/'desktop-start-result.json').read_text());v=start['response']['result'];r={'result':'Partial Pass','instance':v,'proofFiles':['desktop-image-proof2.json','desktop-video-proof.json','desktop-audio-proof.json','desktop-pdf-proof.json','desktop-markdown-proof.json','desktop-html-proof4.json','preview-http-current-contract-result.json','desktop-unsaved-reload-proof2.json','desktop-changed-notes-proof.json'],'limits':['Actual completed-agent artifact and native runtime turns not tested','Initial external content latency FAIL API-F004, late fresh content does not erase it','Unsaved typing used browser EditContext textupdate, not trusted OS keystrokes','Source actor on same VM, not independent physical peer','No automatic remote watcher event observed; later hide/reopen refresh succeeds'],'commands':[]}
for n in r['proofFiles']:
 d=json.loads((E/n).read_text())
 if 'stdout' in d:
  x=json.loads(d['stdout']);assert x['ok'] and d['rc']==0
 else:assert d['result']=='Pass'
log=Path(v['logPath']);r['appLogPath']=str(log)
if log.exists():(E/'desktop-owned-log-tail.log').write_text(log.read_text(errors='replace')[-50000:])
p=sp.run(['pnpm','--silent','isolated-app','stop',v['instanceId']],env=start['environment'],capture_output=True,text=True,timeout=90);r['stop']={'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};assert p.returncode==0
p=sp.run(['pnpm','--silent','isolated-app','list'],env=start['environment'],capture_output=True,text=True,timeout=30);r['listAfter']={'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};assert v['instanceId'] not in p.stdout
tr=json.loads((E/'guest-loopback-tunnel-result.json').read_text());pid=tr['pid'];q=sp.run(['/bin/ps','-p',str(pid),'-o','command='],capture_output=True,text=True);assert 'api004-vm-ssh' in q.stdout and tr['baseUrl'].split(':')[-1] in q.stdout;os.kill(pid,signal.SIGTERM)
for i in range(30):
 if sp.run(['/bin/ps','-p',str(pid)],capture_output=True).returncode:break
 time.sleep(.1)
r['tunnelCleanup']={'pid':pid,'ownedCommand':q.stdout.strip(),'absent':sp.run(['/bin/ps','-p',str(pid)],capture_output=True).returncode!=0};assert r['tunnelCleanup']['absent'];(E/'desktop-validation-result.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'result':r['result'],'stop':r['stop'],'tunnelCleanup':r['tunnelCleanup']}),flush=True)
