import json,re,sqlite3,sys,time,numpy as np
STOP=set('a an the and or of to in on for with we our my me you your i is are was were be been it its this that these those do did does done have has had where what when who which how why remember earlier set up there here from at by as into about can could would should will just make made please find out whether not no yes look looked'.split())
CJKR=re.compile(r'[㐀-鿿]')
def terms(q):
    out=[]
    for w in re.findall(r'[㐀-鿿]+|[a-z0-9_\-\.]+',q.lower()):
        if CJKR.match(w): out+=[w[j]+' '+w[j+1] for j in range(len(w)-1)] or [w]
        elif w not in STOP and len(w)>1: out.append(w)
    return out
Q=[q for q in json.load(open('/tmp/wjs-probe/queries.json')) if not q['id'].startswith('N') and q['id']!='Q30']
allQ=json.load(open('/tmp/wjs-probe/queries.json')); idx={q['id']:i for i,q in enumerate(allQ)}
meta=[json.loads(l) for l in open('/tmp/wjs-probe/cards.jsonl')]
D=np.fromfile('/tmp/wjs-probe/cards.docs.f32',dtype=np.float32).reshape(len(meta),-1); D/=np.linalg.norm(D,axis=1,keepdims=True)
Qv=np.fromfile('/tmp/wjs-probe/cards.queries.f32',dtype=np.float32).reshape(-1,D.shape[1]); Qv/=np.linalg.norm(Qv,axis=1,keepdims=True)
def meaning(i):
    s=D@Qv[i]; best={}
    for j in np.argsort(-s):
        r=meta[j]['run']
        if r.split('/')[-1].startswith('memory_compactor'): continue
        best.setdefault(r,1)
        if len(best)>=400: break
    return list(best)
def rank(runs,acc): return next((k+1 for k,r in enumerate(runs) if any(r.split('/')[-1].startswith(a) for a in acc)),None)
def inter(a,b):
    out=[];seen=set()
    for x,y in zip(a+[None]*400,b+[None]*400):
        for r in (x,y):
            if r and r not in seen: seen.add(r); out.append(r)
    return out
for size in sys.argv[1:]:
    db=sqlite3.connect(f'/tmp/wjs-probe/fts-plain-{size}.sqlite'); res=[]; ms=[]
    for q in Q:
        m=' OR '.join('"%s"'%w for w in terms(q['q'])); t0=time.time()
        rows=db.execute('select run from c where c match ? order by bm25(c) limit 4000',(m,)).fetchall(); ms.append(time.time()-t0)
        runs=[];seen=set()
        for (r,) in rows:
            if r not in seen and not r.split('/')[-1].startswith('memory_compactor'): seen.add(r); runs.append(r)
        res.append((rank(runs,q['accept']),rank(inter(runs,meaning(idx[q['id']])),q['accept'])))
    n=len(Q); ms.sort()
    for k,name in ((0,'text'),(1,'text+cards')):
        rs=[r[k] for r in res]
        print(f"chunk {size:>4} {name:10s} #1 {sum(r==1 for r in rs):2d}/{n} top3 {sum(1 for r in rs if r and r<=3):2d} top5 {sum(1 for r in rs if r and r<=5):2d} MRR {sum(1/r for r in rs if r)/n:.3f}" + (f"  query p50 {ms[n//2]*1000:.0f} ms p90 {ms[int(.9*n)]*1000:.0f} ms" if k==0 else ''))
