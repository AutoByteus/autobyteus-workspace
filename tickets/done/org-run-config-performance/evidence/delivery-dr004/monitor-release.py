import json,pathlib,subprocess,time,datetime
O=pathlib.Path(__file__).parent; repo='AutoByteus/autobyteus-workspace';ids=[37176016117,37176016118,37176016120,37176016125];seen={}
for iteration in range(120):
 results=[]
 for i in ids:
  p=subprocess.run(['/opt/homebrew/bin/gh','run','view',str(i),'--repo',repo,'--json','databaseId,name,status,conclusion,headSha,headBranch,url,jobs,createdAt,updatedAt'],capture_output=True,text=True)
  if p.returncode:
   print('API transient',i,p.stderr[:200],flush=True);continue
  o=json.loads(p.stdout);results.append(o);(O/f'workflow-{i}.json').write_text(json.dumps(o,indent=2)+'\n')
  state=(o['status'],o['conclusion'],[(j['name'],j['status'],j['conclusion']) for j in o['jobs']])
  if seen.get(i)!=state:print(datetime.datetime.now(datetime.timezone.utc).isoformat(),o['name'],state,flush=True);seen[i]=state
 (O/'release-workflows-current.json').write_text(json.dumps(results,indent=2)+'\n')
 if len(results)==4 and any(o['status']=='completed' and o['conclusion']!='success' for o in results):
  print('NEEDS_RECOVERY: completed non-success workflow',flush=True);raise SystemExit(2)
 if len(results)==4 and all(o['status']=='completed' and o['conclusion']=='success' for o in results):
  print('ALL_FOUR_SUCCESS',flush=True);raise SystemExit(0)
 time.sleep(120)
print('Monitoring time bound reached; receipt pending, not completed',flush=True);raise SystemExit(3)
