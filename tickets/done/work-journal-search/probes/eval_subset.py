import json,numpy as np
S=set(json.load(open('/tmp/wjs-probe/summary-subset.json')))
Q=json.load(open('/tmp/wjs-probe/queries.json')); T=json.load(open('/tmp/wjs-probe/text-ranked-nc.json'))
def load(name):
    meta=[json.loads(l) for l in open(f'/tmp/wjs-probe/{name}.jsonl')]
    D=np.fromfile(f'/tmp/wjs-probe/{name}.docs.f32',dtype=np.float32).reshape(len(meta),-1); D/=np.linalg.norm(D,axis=1,keepdims=True)
    Qv=np.fromfile(f'/tmp/wjs-probe/{name}.queries.f32',dtype=np.float32).reshape(-1,D.shape[1]); Qv/=np.linalg.norm(Qv,axis=1,keepdims=True)
    keep=[i for i,m in enumerate(meta) if m['run'] in S]
    return [meta[i] for i in keep],D[keep],Qv
cards=load('cards'); sums=load('summaries')
def mrank(src,i):
    meta,D,Qv=src; s=D@Qv[i]; best={}
    for j in np.argsort(-s): best.setdefault(meta[j]['run'],float(s[j]))
    return [r for r,_ in sorted(best.items(),key=lambda x:-x[1])]
def rank(runs,acc): return next((k+1 for k,r in enumerate(runs) if any(r.split('/')[-1].startswith(a) for a in acc)),None)
def inter(*lists):
    out=[];seen=set()
    for k in range(max(map(len,lists))):
        for l in lists:
            if k<len(l) and l[k] not in seen: seen.add(l[k]); out.append(l[k])
    return out
res={}
for i,x in enumerate(Q):
    if x['id'].startswith('N'): continue
    t=[r[0] for r in T[x['id']] if r[0] in S]; c=mrank(cards,i); s=mrank(sums,i)
    res[x['id']]={'text':rank(t,x['accept']),'cards':rank(c,x['accept']),'summary':rank(s,x['accept']),
      'text+cards':rank(inter(t,c),x['accept']),'text+summary':rank(inter(t,s),x['accept']),'text+cards+summary':rank(inter(t,c,s),x['accept'])}
print(f'corpus: {len(S)} runs (all have summaries); 25 queries')
for k in res['Q01']:
    rs=[v[k] for v in res.values()]
    print(f"{k:20s} hit@1 {sum(r==1 for r in rs):2d}  hit@3 {sum(1 for r in rs if r and r<=3):2d}  hit@5 {sum(1 for r in rs if r and r<=5):2d}  MRR {sum(1/r for r in rs if r)/25:.3f}")
print('per query  text cards summary | t+c t+s t+c+s')
for q,v in res.items(): print(' ',q,v['text'],v['cards'],v['summary'],'|',v['text+cards'],v['text+summary'],v['text+cards+summary'])
