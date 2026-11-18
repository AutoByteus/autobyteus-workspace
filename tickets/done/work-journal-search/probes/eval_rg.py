# Non-search baseline: decompose the question into keywords (same rule as the text index), run ONE rg over all journals, rank runs.
import json,re,subprocess,sys,time,collections
sys.argv=['x']; sys.path.insert(0,'/tmp/wjs-probe'); from eval_plain import terms
ROOT='/tmp/wjs-copy/memory'
allQ=json.load(open('/tmp/wjs-probe/queries.json')); Q=[q for q in allQ if not q['id'].startswith('N') and q['id']!='Q30']
def rank(runs,acc): return next((k+1 for k,r in enumerate(runs) if any(r.split('/')[-1].startswith(a) for a in acc)),None)
rows=[]
for q in Q:
    kw=[t.replace(' ','') for t in terms(q['q'])]           # CJK bigrams become 2-character literals
    cmd=['rg','-o','-i','-F','--no-line-number','--with-filename','-g','work_journal_*.md']+sum([['-e',k] for k in kw],[])+['.']
    t0=time.time(); p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True); el=time.time()-t0
    hits=collections.Counter(); distinct=collections.defaultdict(set); out_lines=0
    for line in p.stdout.splitlines():
        path,_,m=line.partition(':'); out_lines+=1
        run=path[2:].split('/work_journal/')[0]
        if run.split('/')[-1].startswith('memory_compactor'): continue
        hits[run]+=1; distinct[run].add(m.lower())
    by_hits=[r for r,_ in hits.most_common()]
    by_distinct=sorted(hits,key=lambda r:(-len(distinct[r]),-hits[r]))
    rows.append({'id':q['id'],'keywords':len(kw),'rg_seconds':round(el,2),'output_lines':out_lines,'runs_matched':len(hits),'rank_by_hits':rank(by_hits,q['accept']),'rank_by_distinct':rank(by_distinct,q['accept'])})
    print(q['id'],rows[-1]['keywords'],'kw |',rows[-1]['rg_seconds'],'s |',out_lines,'lines |',len(hits),'runs | rank hits',rows[-1]['rank_by_hits'],'| rank distinct',rows[-1]['rank_by_distinct'],flush=True)
json.dump(rows,open('/tmp/wjs-probe/rg-baseline.json','w'),indent=1)
n=len(rows); s=sorted(r['rg_seconds'] for r in rows); L=sorted(r['output_lines'] for r in rows); M=sorted(r['runs_matched'] for r in rows)
for k in ('rank_by_hits','rank_by_distinct'):
    rs=[r[k] for r in rows]
    print(f"RG {k:17s} gate1 (top10) {sum(1 for r in rs if r and r<=10):2d}/{n} | #1 {sum(r==1 for r in rs):2d} top3 {sum(1 for r in rs if r and r<=3):2d} MRR {sum(1/r for r in rs if r)/n:.3f}")
print(f"rg time per question: p50 {s[n//2]} s, p90 {s[int(.9*n)]} s, max {s[-1]} s | output lines p50 {L[n//2]} max {L[-1]} | runs matched p50 {M[n//2]} max {M[-1]}")
