# API/E2E helper (ticket evidence), used as /private/tmp/wjs-api/calls.py: list a test chat's tool calls and search_memory results from its raw traces
import json,sys,os
base='/private/tmp/wjs-api/root/server-data/memory/agents'
R=sys.argv[1] if len(sys.argv)>1 else sorted([d for d in os.listdir(base) if d.startswith('project_task_manager')], key=lambda d: os.path.getmtime(f'{base}/{d}'))[-1]
print('run', R)
for l in open(f'{base}/{R}/raw_traces_active.jsonl'):
    e=json.loads(l)
    if e.get('trace_type')=='tool_call': print(' CALL', e.get('tool_name'), json.dumps(e.get('tool_args'))[:230])
    if e.get('trace_type')=='tool_result' and e.get('tool_name')=='search_memory':
        res=e.get('tool_result')
        try:
            r=json.loads(res) if isinstance(res,str) else res
            if isinstance(r,dict) and isinstance(r.get('content'),list): r=json.loads(r['content'][0]['text'])
            print('   ->', 'note' if r.get('note') else '', [(i+1, x['runId'][:22], ','.join(m['matchedBy'][0]+m['strength'][0] for m in x['matches'])) for i,x in enumerate(r['results'])])
        except Exception as ex: print('   -> ?', str(res)[:120])
