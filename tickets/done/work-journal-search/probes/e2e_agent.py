# End-to-end probe: a local agent (Qwen3.6 via LM Studio) answers memory questions with search_memory + read_file. Nothing leaves the machine.
import json,os,sys,time,urllib.request,numpy as np
sys.path.insert(0,'/tmp/wjs-probe'); from memory_backend import Memory
MODEL=os.environ.get('MODEL','qwen/qwen3.6-35b-a3b'); MEAN=os.environ.get('MEANING','cards'); mem=Memory(2000,MEAN)
def qvec(q):
    v=json.load(urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:7531',data=json.dumps({'texts':[q]}).encode()),timeout=120))[0]
    v=np.array(v,dtype=np.float32); return v/np.linalg.norm(v)
TOOLS=[{"type":"function","function":{"name":"search_memory","description":"Search past work of all agents on this machine (their Work Journals) with the user's cues: words, a description, names. Returns up to `limit` runs, best first. Each has who (agent, team), runId, workspace, firstMention/latestMention days, a ready `source` line to cite, and matches: journalFile, lines, day, a short snippet and matchedBy (text: the words occur; meaning: related by meaning). Results are pointers, not facts. How to use: (1) open the best match at its lines with read_file BEFORE searching again; widen the line range if needed; (2) answer from the run you read and cite its `source`; if other runs say something different, say so with their dates; (3) for questions about the current state (now, latest, current name), also search with since set to the last weeks and prefer the latest mention; (4) use since/until (YYYY-MM-DD) for time cues like 'in August'.",
  "parameters":{"type":"object","properties":{"query":{"type":"string"},"since":{"type":"string"},"until":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":10}},"required":["query"]}}},
 {"type":"function","function":{"name":"read_file","description":"Read a file, optionally lines start_line..end_line (1-based, inclusive; at most 200 lines).","parameters":{"type":"object","properties":{"path":{"type":"string"},"start_line":{"type":"integer"},"end_line":{"type":"integer"}},"required":["path"]}}}]
SYS=("You are a helpful assistant working for the user. Today is 2026-10-22. You have no memory of earlier sessions, but you can search the past work of all agents with search_memory and read journals with read_file. "
     "Answer the user's question from what you read. Say which run and day your answer comes from (agent, runId, day). If unsure, say so.")
def read_file(path,start_line=None,end_line=None):
    if not path.startswith('/tmp/wjs-copy/memory/') or not os.path.isfile(path): return 'Error: file not found or not allowed.'
    L=open(path,errors='replace').read().split('\n'); s=max(1,start_line or 1); e=min(len(L),end_line or s+199,s+199)
    return '\n'.join(f'{i}: {L[i-1][:400]}' for i in range(s,e+1))
def chat(msgs):
    body={"model":MODEL,"messages":msgs,"tools":TOOLS,"temperature":0.2,"max_tokens":1200,"reasoning_effort":"none"}
    return json.load(urllib.request.urlopen(urllib.request.Request('http://localhost:1234/v1/chat/completions',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'}),timeout=1800))
def run(question,max_steps=12):
    msgs=[{"role":"system","content":SYS},{"role":"user","content":question}]; trace=[]
    for step in range(max_steps):
        r=chat(msgs); m=r['choices'][0]['message']; msgs.append({k:v for k,v in m.items() if k in('role','content','tool_calls')})
        calls=m.get('tool_calls') or []
        if not calls: return m.get('content') or '',trace
        for c in calls:
            a=json.loads(c['function'].get('arguments') or '{}'); n=c['function']['name']
            if n=='search_memory':
                out=mem.search(a.get('query',''),qvec(a.get('query','')),a.get('since'),a.get('until'),min(10,a.get('limit') or 5))
                trace.append({'tool':n,'args':a,'runs':[x['runId'] for x in out['results']]}); content=json.dumps(out,ensure_ascii=False)
            else:
                content=read_file(a.get('path',''),a.get('start_line'),a.get('end_line')); trace.append({'tool':n,'args':{'path':a.get('path','').replace('/tmp/wjs-copy/memory/',''),'start_line':a.get('start_line'),'end_line':a.get('end_line')}})
            msgs.append({"role":"tool","tool_call_id":c['id'],"content":content})
    return '(no final answer within step limit)',trace
if __name__=='__main__':
    Q=json.load(open(os.environ.get('QFILE','/tmp/wjs-probe/e2e-questions.json'))); out=open(os.environ.get('OUT','/tmp/wjs-probe/e2e-results.jsonl'),'w')
    for x in Q:
        t=time.time(); ans,trace=run(x['q'])
        acc=x['accept']; searched=[r for s in trace if s['tool']=='search_memory' for r in s['runs']]
        rank=next((i+1 for i,r in enumerate(searched) if any(r.startswith(a) for a in acc)),None)
        opened=any(s['tool']=='read_file' and any(a in (s['args']['path'] or '') for a in acc) for s in trace)
        cited=any(a[:20] in ans for a in acc)
        out.write(json.dumps({'id':x['id'],'q':x['q'],'found_rank_first_search':rank,'opened_right_journal':opened,'cited_right_run':cited,'steps':len(trace),'s':round(time.time()-t),'trace':trace,'answer':ans},ensure_ascii=False)+'\n'); out.flush()
        print(x['id'],'rank',rank,'opened',opened,'cited',cited,'steps',len(trace),'s',round(time.time()-t),flush=True)
