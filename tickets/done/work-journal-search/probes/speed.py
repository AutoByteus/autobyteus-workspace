import json,sys,time,urllib.request,glob
model=sys.argv[1]; sizes=[int(x) for x in sys.argv[2].split(',')]
docs=sorted(glob.glob('/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/autobyteus-server-ts/docs/**/*.md',recursive=True))
corpus=''.join(open(d).read() for d in docs)
for chars in sizes:
    text=corpus[:chars]
    body={"model":model,"messages":[{"role":"system","content":"You summarize technical documents."},{"role":"user","content":"Summarize in 5 bullet points:\n\n"+text}],"max_tokens":400,"temperature":0.2,"reasoning_effort":"none"}
    req=urllib.request.Request('http://localhost:1234/api/v0/chat/completions',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    t=time.time(); r=json.load(urllib.request.urlopen(req,timeout=1800)); el=time.time()-t
    st=r.get('stats',{}); u=r.get('usage',{})
    out=r['choices'][0]['message']
    print(json.dumps({"chars":chars,"prompt_tokens":u.get('prompt_tokens'),"completion_tokens":u.get('completion_tokens'),"ttft_s":st.get('time_to_first_token'),"gen_tps":st.get('tokens_per_second'),"prefill_tps":round(u.get('prompt_tokens',0)/st['time_to_first_token']) if st.get('time_to_first_token') else None,"wall_s":round(el,1),"has_reasoning":bool(out.get('reasoning_content')),"out_head":out.get('content','')[:80]}),flush=True)
