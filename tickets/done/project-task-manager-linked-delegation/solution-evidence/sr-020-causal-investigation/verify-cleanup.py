from pathlib import Path
import json,os,socket,datetime,time,subprocess
E=Path(__file__).parent;i=json.loads((E/'sr-020-instance.json').read_text())['result'];o=json.loads((E/'sr-020-inspector-owner.json').read_text());stop=json.loads((E/'stop.json').read_text());assert stop['ok'] and not stop['result']['forced'] and stop['result']['dataRootRemoved'];assert not Path(i['dataRoot']).exists()
pids={}
for p in [i['pid'],o['backend']['pid']]:
 try:os.kill(p,0);pids[str(p)]='present'
 except ProcessLookupError:pids[str(p)]='absent'
assert all(x=='absent' for x in pids.values());checks=[]
for n in range(46):
 ports={}
 for p in [i['controlPort'],i['serverPort'],9229]:
  try:
   with socket.socket() as s:s.bind(('127.0.0.1',p));ports[str(p)]='free-bind'
  except OSError as error:ports[str(p)]={'bindError':str(error),'listener':subprocess.run(['lsof','-nP','-iTCP:'+str(p),'-sTCP:LISTEN','-Fp'],text=True,capture_output=True).stdout}
 checks.append({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'ports':ports});(E/'cleanup-bind-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
 if all(x=='free-bind' for x in ports.values()):break
 time.sleep(2)
else:raise Exception('Own released ports remain unverified; no process attribution inferred')
b=json.loads((E/'instances-before.json').read_text());a=json.loads((E/'instances-after.json').read_text());assert b==a
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'stop':stop,'profileAbsent':True,'ownAppServerPids':pids,'ports':ports,'foreignInstanceRecordsExact':True,'debuggerDetached': any(json.loads(x)['event']=='detached' for x in (E/'owner-debugger.jsonl').read_text().splitlines()),'meaning':'Environment cleanup only, never repair of failed Task release'};assert out['debuggerDetached'];(E/'cleanup-verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
