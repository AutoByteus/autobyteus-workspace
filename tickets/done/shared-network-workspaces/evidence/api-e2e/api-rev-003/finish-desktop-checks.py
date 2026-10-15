from pathlib import Path
import subprocess as sp,json,hashlib,os,signal,time,shutil
E=Path(__file__).resolve().parent;T=E.parent.parent.parent;d=json.loads((E/'desktop-start-result.json').read_text());i=d['response']['result'];r={'instance':i,'result':'Cleaning','checks':{}}
def save():(E/'desktop-validation-result.json').write_text(json.dumps(r,indent=2)+'\n')
def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for name in ['guide-assert','html-render-assert','image-proof','reload-assert','external-text-assert']:
 q=json.loads((E/('desktop-'+name+'.json')).read_text());v=json.loads(q['stdout']);assert q['rc']==0 and v['ok'] and v['result']['result']['result']=='Pass';r['checks'][name]=v['result']['result']
r['watcher']=json.loads(json.loads((E/'desktop-watcher-observe.json').read_text())['stdout'])['result']['result'];r['limits']=['Current Mac desktop remote-window to current Linux managedDocker NFS client; SSH HTTP forward only, not NFS peer routing','Original storage-side changes, not independent physical peer','No completed-agent artifacts or paid/native-runtime turns','One image/HTML-relative-asset/text scenario, no exhaustive media formats/unsaved-buffer proof','One watcher observation did not update until documented Files visibility refresh']
exe=Path(i['executablePath']);app=exe.parents[2];r['buildIdentities']={str(p.relative_to(app)):h(p) for p in [exe,app/'Contents/Resources/app.asar']};save()
argv=['pnpm','--silent','isolated-app','stop',i['instanceId']];q=sp.run(argv,env=d['environment'],cwd=Path.cwd(),capture_output=True,text=True,timeout=60);r['stop']={'argv':argv,'rc':q.returncode,'stdout':q.stdout,'stderr':q.stderr};save();v=json.loads(q.stdout);assert q.returncode==0 and v['ok'];log=Path(i['logPath']);
if log.exists():shutil.copy2(log,E/'desktop-runtime.log')
t=json.loads((E/'guest-loopback-tunnel-v2-result.json').read_text());pid=t['pid'];identity=sp.run(['ps','-p',str(pid),'-o','command='],capture_output=True,text=True).stdout;assert 'api003-vm-ssh' in identity and str(t['baseUrl'].split(':')[-1]) in identity;os.kill(pid,signal.SIGTERM)
for _ in range(30):
 q=sp.run(['ps','-p',str(pid),'-o','command='],capture_output=True,text=True)
 if q.returncode!=0:break
 time.sleep(.2)
else:raise RuntimeError('Owned SSH tunnel still active')
r['tunnelCleanup']={'pid':pid,'absent':True};r['result']='Pass scoped desktop checks; remaining matrix required';save()
with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round3 V04 partial Pass** — new isolated current-worktree Mac desktop, current Linux Docker NFS client: actual Nodes Guide unavailable/copy-disabled/warnings, registered remote node, Files workspace selection, mounted HTML+relative image decoded (fixture postMessage exact origin/frame), native image preview1x1, source-side external text invisible before refresh but visible/current after Files reopen. No provider turn or completed-agent artifact. Own desktop stopped and SSH tunnel retired; VM/node remain for lifecycle. Evidence desktop-validation-result.json and desktop-* raw actions/screenshots.\n')
print(json.dumps({'result':r['result'],'instanceStopped':i['instanceId'],'tunnelRemoved':pid}),flush=True)
