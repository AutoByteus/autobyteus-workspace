import json,re,sqlite3,time,collections
STOP=set('a an the and or of to in on for with we our my me you your i is are was were be been it its this that these those do did does done have has had where what when who which how why remember earlier set up there here from at by as into about can could would should will just make made please find out whether not no yes look looked'.split())
import os
db=sqlite3.connect(os.environ.get('FTS_DB','/tmp/wjs-probe/fts.sqlite'))
Q=json.load(open('/tmp/wjs-probe/queries.json'))
CJKR=re.compile(r'[\u3400-\u9fff]')
def terms(q):
    out=[]
    for w in re.findall(r'[\u3400-\u9fff]+|[a-z0-9_\-\.]+',q.lower()):
        if CJKR.match(w): out+=[w[j]+' '+w[j+1] for j in range(len(w)-1)] or [w]
        elif w not in STOP and len(w)>1: out.append(w)
    return out
def search(q,limit=4000):
    t=terms(q)
    if not t: return [],0
    m=' OR '.join('"%s"'%w.replace('"','') for w in t)
    st=time.time()
    rows=db.execute('select run,file,line,bm25(c) s from c where c match ? order by s limit ?',(m,limit)).fetchall()
    best={}
    for run,f,l,s in rows:
        if run not in best: best[run]=(s,f,l)
    return sorted(best.items(),key=lambda x:x[1][0]),time.time()-st
import sys
EXCL='--no-compactor' in sys.argv
res=[];dump={}
for x in Q:
    ranked,el=search(x['q'])
    if EXCL: ranked=[r for r in ranked if not r[0].split('/')[-1].startswith('memory_compactor')]
    dump[x['id']]=[(r,v[0],v[1],v[2]) for r,v in ranked[:400]]
    runs=[r.split('/')[-1] for r,_ in ranked]
    rank=next((i+1 for i,r in enumerate(runs) if any(r.startswith(a) for a in x['accept'])),None)
    res.append((x['id'],rank,len(runs),round(el,2)))
    print(x['id'],'rank',rank,'of',len(runs),'runs','ms',int(el*1000),'top3',[r[:28] for r in runs[:3]])
pos=[r for r in res if not r[0].startswith('N')]
h1=sum(1 for r in pos if r[1]==1); h5=sum(1 for r in pos if r[1] and r[1]<=5); mrr=sum(1/r[1] for r in pos if r[1])/len(pos)
json.dump(dump,open(os.environ.get('RANK_OUT','/tmp/wjs-probe/text-ranked%s.json'%('-nc' if EXCL else '')),'w'))
print('TEXT TIER'+(' no-compactor' if EXCL else '')+': hit@1',h1,'/',len(pos),'hit@5',h5,'MRR',round(mrr,3))
