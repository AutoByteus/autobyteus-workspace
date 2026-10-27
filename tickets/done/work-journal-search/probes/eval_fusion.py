import json,numpy as np
meta=[json.loads(l) for l in open('/tmp/wjs-probe/cards.jsonl')]
D=np.fromfile('/tmp/wjs-probe/cards.docs.f32',dtype=np.float32).reshape(len(meta),-1); D/=np.linalg.norm(D,axis=1,keepdims=True)
Qv=np.fromfile('/tmp/wjs-probe/cards.queries.f32',dtype=np.float32).reshape(-1,D.shape[1]); Qv/=np.linalg.norm(Qv,axis=1,keepdims=True)
Q=json.load(open('/tmp/wjs-probe/queries.json')); T=json.load(open('/tmp/wjs-probe/text-ranked-nc.json'))
def meaning(i):
    s=D@Qv[i]; best={}
    for j in np.argsort(-s):
        r=meta[j]['run']
        if r.split('/')[-1].startswith('memory_compactor'): continue
        best.setdefault(r,float(s[j]))
        if len(best)>=400: break
    return [r for r,_ in sorted(best.items(),key=lambda x:-x[1])]
def rank(runs,acc): return next((k+1 for k,r in enumerate(runs) if any(r.split('/')[-1].startswith(a) for a in acc)),None)
out={}
for i,x in enumerate(Q):
    if x['id'].startswith('N'): continue
    t=[r[0] for r in T[x['id']]]; m=meaning(i)
    rrf={}
    for lst in (t,m):
        for k,r in enumerate(lst): rrf[r]=rrf.get(r,0)+1/(60+k+1)
    fused=sorted(rrf,key=lambda r:-rrf[r])
    inter=[];seen=set()
    for a,b in zip(t+[None]*400,m+[None]*400):
        for r in (a,b):
            if r and r not in seen: seen.add(r); inter.append(r)
    out[x['id']]=dict(text=rank(t,x['accept']),meaning=rank(m,x['accept']),rrf=rank(fused,x['accept']),interleave=rank(inter,x['accept']))
for k in ('text','meaning','rrf','interleave'):
    rs=[v[k] for v in out.values()]
    print(f"{k:10s} hit@1 {sum(r==1 for r in rs):2d}/25  hit@3 {sum(1 for r in rs if r and r<=3):2d}  hit@5 {sum(1 for r in rs if r and r<=5):2d}  hit@10 {sum(1 for r in rs if r and r<=10):2d}  MRR {sum(1/r for r in rs if r)/25:.3f}")
print('per query (text, meaning, rrf, interleave):')
for q,v in out.items(): print(' ',q,v['text'],v['meaning'],v['rrf'],v['interleave'])
