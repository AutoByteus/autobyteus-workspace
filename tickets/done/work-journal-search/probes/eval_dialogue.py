# Assemble whole-file dialogue vectors and compare with cards under the two gates (31 answerable questions).
import json,sqlite3,sys,numpy as np
sys.argv=['x']; sys.path.insert(0,'/tmp/wjs-probe'); from eval_plain import terms
parts=[('dlg-part-aa.jsonl','dlg-aa.docs.f32'),('dlg-ab-done.jsonl','dlg-ab.docs.f32'),('dlg-rest-1.jsonl','dlg-rest-1.docs.f32'),('dlg-rest-2.jsonl','dlg-rest-2.docs.f32')]
M=[];V=[]
for j,f in parts:
    m=[json.loads(l) for l in open('/tmp/wjs-probe/'+j) if l.strip()]; v=np.fromfile('/tmp/wjs-probe/'+f,dtype=np.float32).reshape(-1,384)
    assert len(m)==len(v),(j,len(m),len(v)); M+=m; V.append(v)
V=np.vstack(V); V/=np.linalg.norm(V,axis=1,keepdims=True); print('dialogue pieces',len(M))
cm=[json.loads(l) for l in open('/tmp/wjs-probe/cards.jsonl')]; C=np.fromfile('/tmp/wjs-probe/cards.docs.f32',dtype=np.float32).reshape(len(cm),-1); C/=np.linalg.norm(C,axis=1,keepdims=True)
Qv=np.fromfile('/tmp/wjs-probe/cards.queries.f32',dtype=np.float32).reshape(-1,384); Qv/=np.linalg.norm(Qv,axis=1,keepdims=True)
allQ=json.load(open('/tmp/wjs-probe/queries.json')); Q=[q for q in allQ if not q['id'].startswith('N') and q['id']!='Q30']; idx={q['id']:i for i,q in enumerate(allQ)}
db=sqlite3.connect('/tmp/wjs-probe/fts-plain-2000.sqlite')
skip=lambda r: r.split('/')[-1].startswith('memory_compactor')
def text(q):
    m=' OR '.join('"%s"'%w for w in terms(q)) or '""'; out=[];s=set()
    for (r,) in db.execute('select run from c where c match ? order by bm25(c) limit 4000',(m,)):
        if r not in s and not skip(r): s.add(r); out.append(r)
    return out
def mean(meta,D,i):
    sc=D@Qv[i]; out=[];s=set()
    for j in np.argsort(-sc)[:20000]:
        r=meta[j]['run']
        if r in s or skip(r): continue
        s.add(r); out.append(r)
        if len(out)>=400: break
    return out
def inter(*L):
    out=[];s=set()
    for k in range(max(map(len,L))):
        for l in L:
            if k<len(l) and l[k] not in s: s.add(l[k]); out.append(l[k])
    return out
def rank(runs,acc): return next((k+1 for k,r in enumerate(runs) if any(r.split('/')[-1].startswith(a) for a in acc)),None)
R={}
for q in Q:
    i=idx[q['id']]; t=text(q['q']); c=mean(cm,C,i); d=mean(M,V,i)
    R[q['id']]={'text':rank(t,q['accept']),'cards':rank(c,q['accept']),'dialogue':rank(d,q['accept']),'text+cards':rank(inter(t,c),q['accept']),'text+dialogue':rank(inter(t,d),q['accept']),'text+cards+dialogue':rank(inter(t,c,d),q['accept'])}
n=len(Q); print('31 answerable questions; gate 1 = right run in top 10 of ONE search (agent rephrasing not included)')
for k in R[Q[0]['id']]:
    rs=[v[k] for v in R.values()]
    print(f"{k:20s} gate1 {sum(1 for r in rs if r and r<=10):2d}/{n} | gate2: #1 {sum(r==1 for r in rs):2d}  top3 {sum(1 for r in rs if r and r<=3):2d}  MRR {sum(1/r for r in rs if r)/n:.3f}")
json.dump(R,open('/tmp/wjs-probe/ranks-all.json','w'))
