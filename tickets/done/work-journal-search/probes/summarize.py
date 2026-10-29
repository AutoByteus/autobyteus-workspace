# Probe: hierarchical summary of one run's journal with a local model (LM Studio). Output stays in /tmp.
import json,os,re,sys,time,glob,urllib.request
MODEL=os.environ.get('MODEL','qwen/qwen3.6-35b-a3b'); WIN=int(os.environ.get('WIN','60000'))
ROOT='/tmp/wjs-copy/memory'; MODE=os.environ.get('MODE','full'); OUTR='/tmp/wjs-probe/summaries/'+MODEL.replace('/','_')+('' if MODE=='full' else '-'+MODE)
sys.path.insert(0,'/tmp/wjs-probe'); from skeleton import parts
SYS=("You write retrieval summaries of an AI agent's work log so that the work can be found later by a vague question. "
     "Never copy secrets: no passwords, API keys, tokens, private keys, cookies or credentials, even partially; write [secret] instead. "
     "Be factual; do not invent.")
MAP=("Here is part {i} of {n} of a work log (a run of agent '{agent}'). Write notes, at most 180 words:\n"
     "GOAL: what the user wanted\nDONE: what was actually done and the outcome\n"
     "WHERE: important files, folders, services, hosts, repositories, commands (paths ok, no secrets)\n"
     "TERMS: 8-15 search keywords and synonyms a person might use for this work (English, and Chinese if relevant)\n\n---\n{text}")
RED=("Below are notes from consecutive parts of one {what} of agent '{agent}'. Merge them into one summary, at most 220 words, same headings "
     "GOAL / DONE / WHERE / TERMS. Keep concrete names and paths that identify where the work lives; drop repetition.\n\n{text}")
def call(user,max_tokens=450):
    body={"model":MODEL,"messages":[{"role":"system","content":SYS},{"role":"user","content":user}],"max_tokens":max_tokens,"temperature":0.2,"reasoning_effort":"none"}
    t=time.time(); r=json.load(urllib.request.urlopen(urllib.request.Request('http://localhost:1234/v1/chat/completions',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'}),timeout=3600))
    return r['choices'][0]['message'].get('content') or '', r['usage'], time.time()-t
def windows(text):
    entries=re.split(r'(?m)^(?=\[\d\d:\d\d:\d\d\])',text); out=[]; cur=''
    for e in entries:
        if len(cur)+len(e)>WIN and cur: out.append(cur); cur=''
        while len(e)>WIN: out.append(e[:WIN]); e=e[WIN:]
        cur+=e
    if cur.strip(): out.append(cur)
    return out
def reduce(notes,what,agent,stats):
    while len(notes)>1:
        groups=[]; cur=[]
        for n in notes:
            if sum(len(x) for x in cur)+len(n)>WIN and cur: groups.append(cur); cur=[]
            cur.append(n)
        groups.append(cur)
        notes=[]
        for g in groups:
            if len(g)==1: notes.append(g[0]); continue
            s,u,el=call(RED.format(what=what,agent=agent,text='\n\n'.join(g))); stats.append((u,el)); notes.append(s)
        if len(groups)==1 and len(notes)==1: break
    return notes[0]
run=sys.argv[1]; agent=os.path.basename(run).rsplit('_',1)[0]
out=os.path.join(OUTR,run.replace('/','__')); os.makedirs(out,exist_ok=True)
stats=[]; file_sums=[]; t0=time.time()
for jf in sorted(glob.glob(os.path.join(ROOT,run,'work_journal','work_journal_*.md'))):
    text=open(jf,errors='replace').read()
    if MODE=='skeleton': text=''.join(l for k,l in parts(text) if k!='detail')
    ws=windows(text); notes=[]
    for i,w in enumerate(ws):
        s,u,el=call(MAP.format(i=i+1,n=len(ws),agent=agent,text=w)); stats.append((u,el)); notes.append(s)
    fs=reduce(notes,'journal file',agent,stats); file_sums.append(fs)
    open(os.path.join(out,os.path.basename(jf)+'.summary.md'),'w').write(fs)
if not file_sums: sys.exit(0)
rs=reduce(file_sums,'agent run',agent,stats) if len(file_sums)>1 else file_sums[0]
open(os.path.join(out,'run.summary.md'),'w').write(rs)
pt=sum(u['prompt_tokens'] for u,_ in stats); ct=sum(u['completion_tokens'] for u,_ in stats)
jb=sum(os.path.getsize(f) for f in glob.glob(os.path.join(ROOT,run,'work_journal','work_journal_*.md')))
print(json.dumps({"run":run,"journal_bytes":jb,"calls":len(stats),"prompt_tokens":pt,"completion_tokens":ct,"mode":MODE,"wall_s":round(time.time()-t0,1)}),flush=True)
