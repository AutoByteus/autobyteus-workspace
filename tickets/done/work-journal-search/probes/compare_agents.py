import json
acc={q['id']:q['accept'] for q in json.load(open('/tmp/wjs-probe/queries.json'))}
S={}
for f in ('e2e-results.jsonl','e2e-gate1.jsonl'):
    for l in open('/tmp/wjs-probe/'+f):
        x=json.loads(l); a=acc[x['id']]; T=x['trace']; srch=[s for s in T if s['tool']=='search_memory']
        found=next((k+1 for k,s in enumerate(srch) if any(any(r.startswith(y) for y in a) for r in s['runs'])),None)
        opened=next((k+1 for k,s in enumerate(T) if s['tool']=='read_file' and any(y in (s['args']['path'] or '') for y in a)),None)
        S[x['id']]={'found_in_round':found,'opened_step':opened,'steps':x['steps'],'s':x['s']}
B={}
for l in open('/tmp/wjs-probe/e2e-bash.jsonl'):
    x=json.loads(l); T=x['trace']; a=acc[x['id']]
    st=x['right_run_in_shell_output_at_step']; rnd=sum(1 for s in T[:st] if s['tool']=='run_bash') if st else None
    opened=next((k+1 for k,s in enumerate(T) if s['tool']=='read_file' and any(y in (s['args']['path'] or '') for y in a)),None)
    B[x['id']]={'found_in_round':rnd,'opened_step':opened,'steps':x['steps'],'s':x['s'],'rg_rounds':sum(1 for s in T if s['tool']=='run_bash'),'shell_s':x['shell_seconds']}
ids=[i for i in S if i in B]
print(f"{'Q':4} | search_memory: found@round opened@step steps sec | rg agent: found@round opened@step rg-rounds steps sec")
for i in ids:
    s,b=S[i],B[i]; print(f"{i:4} | {str(s['found_in_round']):>5} {str(s['opened_step']):>6} {s['steps']:>5} {s['s']:>4} | {str(b['found_in_round']):>5} {str(b['opened_step']):>6} {b['rg_rounds']:>5} {b['steps']:>5} {b['s']:>4}")
def summ(D,name):
    n=len(ids); f=[D[i]['found_in_round'] for i in ids]; o=[D[i]['opened_step'] for i in ids]
    g1=sum(1 for x in f if x and x<=3); first=sum(1 for x in f if x==1)
    print(f"{name}: gate1 (found within 3 searches) {g1}/{n}; found in 1st search {first}/{n}; found at all {sum(1 for x in f if x)}/{n}; opened right journal {sum(1 for x in o if x)}/{n}; median steps {sorted(D[i]['steps'] for i in ids)[n//2]}; median sec {sorted(D[i]['s'] for i in ids)[n//2]}")
summ(S,'search_memory agent'); summ(B,'rg agent          ')
