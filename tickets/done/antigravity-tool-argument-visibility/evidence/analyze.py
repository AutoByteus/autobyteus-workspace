import pathlib,json,collections,hashlib,datetime,shutil
root=pathlib.Path(__file__).resolve().parent
run=pathlib.Path('/Users/normy/.autobyteus/server-data/memory/agents/agent_package_creator_0cc60bc5ef864c279c03f388349720fa')
brain=pathlib.Path('/Users/normy/.gemini/antigravity-cli/brain/738a76ed-5cb0-4705-b131-aaaad04573c3/.system_generated/logs')
raw_path=run/'raw_traces_active.jsonl'; full_path=brain/'transcript_full.jsonl'
raw_bytes=raw_path.read_bytes();full_bytes=full_path.read_bytes()
raw=[json.loads(l) for l in raw_bytes.splitlines() if l];full=[json.loads(l) for l in full_bytes.splitlines() if l]
by_step={x['step_index']:x for x in full};calls=[x for x in raw if x.get('trace_type')=='tool_call']
coverage=collections.defaultdict(lambda:{'count':0,'recordedKeys':collections.Counter(),'nativeOnlyKeys':collections.Counter(),'matched':0})
unmatched=[]
for x in calls:
 name=x['tool_name'];c=coverage[name];c['count']+=1;c['recordedKeys'].update((x.get('tool_args') or {}).keys())
 idx=int(x['tool_call_id'].rsplit('-',1)[-1]);prev=by_step.get(idx-1,{})
 native=prev.get('tool_calls',[])
 if len(native)!=1:unmatched.append(idx);continue
 native=native[0]
 if native['name']!=name and not (native['name']=='call_mcp_tool' and native['args'].get('ToolName')==name):unmatched.append(idx);continue
 args=native['args'].get('Arguments',{}) if native['name']=='call_mcp_tool' else native['args']
 c['matched']+=1;c['nativeOnlyKeys'].update(set(args)-set(x.get('tool_args',{})))
report={'capturedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runId':run.name,
 'providerConversation':'738a76ed-5cb0-4705-b131-aaaad04573c3','rawTraceRows':len(raw),'toolCalls':len(calls),
 'sources':[{'path':str(p),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()} for p,data in [(raw_path,raw_bytes),(full_path,full_bytes)]],
 'plannerToolCallCounts':dict(collections.Counter(len(x['tool_calls']) for x in full if x.get('tool_calls'))),
 'mappingNote':'For this evidence set only, each tool row maps to exactly one same-name planner call at index-1. No claim of a general provider correlation contract.',
 'unmatchedSteps':unmatched,'coverage':dict(coverage)}
(root/'production-coverage.json').write_text(json.dumps(report,indent=2))
steps=[987,1346]
samples={'sources':[str(raw_path),str(full_path)],'note':'Selected path-matching examples, not a claim of unique screenshot identity.',
 'examples':[{'step':idx,'nativePlanner':by_step[idx-1],'nativeToolResult':by_step[idx],
 'canonicalTraces':[x for x in raw if x.get('tool_call_id','').endswith('-'+str(idx))]} for idx in steps]}
# Do not copy unrelated conversation text or internal reasoning.
for ex in samples['examples']:
 ex['nativePlanner']={k:v for k,v in ex['nativePlanner'].items() if k in ['step_index','type','status','created_at','tool_calls']}
(root/'production-selected-calls.json').write_text(json.dumps(samples,indent=2))
probe=root/'native-probe';summary=json.loads((probe/'summary.json').read_text());conv=summary['conversation']
for name in ['transcript.jsonl','transcript_full.jsonl']:
 src=pathlib.Path('/Users/normy/.gemini/antigravity-cli/brain')/conv/'.system_generated/logs'/name
 shutil.copyfile(src,probe/name)
rows=[json.loads(l) for l in (probe/'stdout.jsonl').read_text().splitlines()]
full=[json.loads(l) for l in (probe/'transcript_full.jsonl').read_text().splitlines()];by_step={x['step_index']:x for x in full}
comparison=[]
for x in rows:
 s=x.get('step_update',{});
 if s.get('step_type')!='tool' or s.get('state')!='DONE':continue
 p=by_step[s['step_index']-1]['tool_calls'][0];params=s['tool_info'].get('parameters',{})
 comparison.append({'step':s['step_index'],'tool':s['tool_name'],'streamParameters':params,'actualInput':p['args'],
 'nativeOnlyKeys':sorted(set(p['args'])-set(params)), 'streamOutput':s['tool_info'].get('output'),
 'nativeOutputAvailable':(pathlib.Path('/Users/normy/.gemini/antigravity-cli/brain')/conv/'.system_generated/steps'/str(s['step_index'])/'output.txt').is_file()})
(root/'native-comparison.json').write_text(json.dumps({'version':'1.2.16','conversation':conv,'comparison':comparison},indent=2))
print('Production',report['toolCalls'],'matched',sum(x['matched'] for x in coverage.values()),'unmatched',unmatched)
for name,c in coverage.items():print(name,c['count'],'missing',dict(c['nativeOnlyKeys']))
print('Native probe',[(x['tool'],x['nativeOnlyKeys']) for x in comparison])
