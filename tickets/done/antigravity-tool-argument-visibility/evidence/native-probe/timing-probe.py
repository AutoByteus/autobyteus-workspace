import pathlib,subprocess,json,selectors,time,os,signal
root=pathlib.Path(__file__).resolve().parent
file=root/'workspace/timing-marker.txt';file.write_text('TIMING_BEFORE_6042\n')
argv=json.loads((root/'launch.json').read_text())['argv'];argv[-1]=str(root/'timing-cli.log')
prompt=f'Use replace_file_content exactly once on `{file}` to replace TIMING_BEFORE_6042 with TIMING_AFTER_6042. Supply TargetContent, ReplacementContent, StartLine 1, EndLine 1, AllowMultiple false, Description and Instruction. Do not use other tools or files; then respond DONE.'
records=[];snapshots=[];conv=None;result=None
with (root/'timing-stderr.txt').open('w') as err:
 p=subprocess.Popen(argv,cwd=root/'capsule',stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=err,text=True,start_new_session=True)
 sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ);deadline=time.monotonic()+90
 try:
  while time.monotonic()<deadline:
   if not sel.select(1):
    if p.poll() is not None:break
    continue
   line=p.stdout.readline()
   if not line:break
   o=json.loads(line);records.append(o)
   if o.get('event')=='init':
    conv=o['conversation_id'];p.stdin.write(json.dumps({'event':'user','message':{'content':prompt}})+'\n');p.stdin.flush()
   s=o.get('step_update',{})
   if s.get('step_type')=='tool':
    f=pathlib.Path('/Users/normy/.gemini/antigravity-cli/brain')/conv/'.system_generated/logs/transcript_full.jsonl'
    try:rows=[json.loads(l) for l in f.read_text().splitlines()];planner=[r for r in rows if r.get('step_index')==s['step_index']-1]
    except Exception as e:planner=[]
    snap={'state':s['state'],'step':s['step_index'],'transcriptFilePresent':f.is_file(),'planner':planner};snapshots.append(snap)
    print(json.dumps(snap),flush=True)
   if o.get('event')=='result':result=o;break
 finally:
  if p.poll() is None:
   os.killpg(p.pid,signal.SIGTERM)
   try:p.wait(timeout=8)
   except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
(root/'timing-evidence.json').write_text(json.dumps({'argv':argv,'prompt':prompt,'conversation':conv,'pid':p.pid,'snapshots':snapshots,'stdout':records,'result':result,'exitCodeAfterRequestedStop':p.returncode,'fileContent':file.read_text()},indent=2))
print('Timing final',conv, (result or {}).get('result',{}).get('status'), file.read_text(),flush=True)
