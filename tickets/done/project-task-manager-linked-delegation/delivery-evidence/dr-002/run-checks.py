import pathlib,json,datetime,subprocess,os,shlex
w=pathlib.Path(__file__).resolve().parents[5]
e=pathlib.Path(__file__).resolve().parent
env=os.environ.copy(); env['GIT_OPTIONAL_LOCKS']='0'
assert not any(v=='1' for k,v in env.items() if k.startswith('RUN_') and 'E2E' in k), 'Unexpected inherited live E2E opt-in'
for name,cmd in json.loads((e/'check-commands.json').read_text()):
 started=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with (e/(name+'.log')).open('w') as f:
  p=subprocess.run(cmd,cwd=w,env=env,stdout=f,stderr=subprocess.STDOUT)
 row={'name':name,'cwd':str(w),'command':cmd,'commandText':shlex.join(cmd),'startedAt':started,'completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exitCode':p.returncode,'log':str(e/(name+'.log')),'envOverrides':{'GIT_OPTIONAL_LOCKS':'0'},'liveProviderOptIn':False}
 with (e/'check-results.jsonl').open('a') as f:f.write(json.dumps(row)+'\n')
 print(json.dumps(row),flush=True)
 if p.returncode:break
