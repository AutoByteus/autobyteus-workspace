import json,sys,numpy as np,collections
sys.argv+=['cards'] if len(sys.argv)<2 else []
name=sys.argv[1]; meta=[json.loads(l) for l in open(f'/tmp/wjs-probe/{name}.jsonl')]
D=np.fromfile(f'/tmp/wjs-probe/{name}.docs.f32',dtype=np.float32); dim=D.size//len(meta); D=D.reshape(len(meta),dim)
Qv=np.fromfile(f'/tmp/wjs-probe/{name}.queries.f32',dtype=np.float32).reshape(-1,dim)
D/=np.linalg.norm(D,axis=1,keepdims=True); Qv/=np.linalg.norm(Qv,axis=1,keepdims=True)
Q=json.load(open('/tmp/wjs-probe/queries.json'))
EXCL=('memory_compactor',)
excl='--no-compactor' in sys.argv
def text_ranks():
    out={};cur=None
    for l in open('/tmp/wjs-probe/eval-text-full.txt'):
        pass
    return out
res=[];tops=[]
for i,x in enumerate(Q):
    s=D@Qv[i]; best={}
    for j in np.argsort(-s):
        run=meta[j]['run']
        if excl and run.split('/')[-1].startswith(EXCL): continue
        if run not in best: best[run]=float(s[j])
        if len(best)>=400: break
    ranked=sorted(best.items(),key=lambda r:-r[1]); runs=[r.split('/')[-1] for r,_ in ranked]
    rank=next((k+1 for k,r in enumerate(runs) if any(r.startswith(a) for a in x['accept'])),None)
    res.append((x['id'],rank)); tops.append((x['id'],round(ranked[0][1],3),round(ranked[1][1],3)))
    print(x['id'],'rank',rank,'top',round(ranked[0][1],3),'2nd',round(ranked[1][1],3),[r[:26] for r in runs[:3]])
pos=[r for r in res if not r[0].startswith('N')]
print(f'MEANING ({name}{" no-compactor" if excl else ""}): hit@1',sum(r[1]==1 for r in pos),'/',len(pos),'hit@5',sum(1 for r in pos if r[1] and r[1]<=5),'MRR',round(sum(1/r[1] for r in pos if r[1])/len(pos),3))
json.dump({'ranks':res},open(f'/tmp/wjs-probe/{name}-meaning-ranks.json','w'))
