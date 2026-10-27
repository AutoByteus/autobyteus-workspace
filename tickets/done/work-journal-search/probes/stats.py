import json,math
R=json.load(open('/tmp/wjs-probe/ranks-all.json')); G=json.load(open('/tmp/wjs-probe/rg-baseline.json'))
for g in G: R[g['id']]['rg (hits)']=g['rank_by_hits']; R[g['id']]['rg (distinct keywords)']=g['rank_by_distinct']
ids=sorted(R); n=len(ids)
def wilson(k,n,z=1.96):
    p=k/n; d=1+z*z/n; c=(p+z*z/(2*n))/d; h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d; return max(0,c-h),min(1,c+h)
def binom2(b,c):  # exact two-sided McNemar
    m=b+c
    if m==0: return 1.0
    k=min(b,c); return min(1.0,2*sum(math.comb(m,i) for i in range(k+1))/2**m)
methods=['text+cards','text+dialogue','text','cards','dialogue','rg (distinct keywords)','rg (hits)']
pas=lambda m,cut: [bool(R[i][m] and R[i][m]<=cut) for i in ids]
print(f'n = {n} answerable questions (one search)\n')
print(f"{'method':24s} {'gate1 top10':>12s} {'95% CI':>14s} {'#1':>4s} {'top3':>5s} {'MRR':>6s}")
for m in methods:
    k=sum(pas(m,10)); lo,hi=wilson(k,n); r=[R[i][m] for i in ids]
    print(f"{m:24s} {k:>5d}/{n} ({100*k/n:3.0f}%) [{100*lo:3.0f}–{100*hi:3.0f}%] {sum(x==1 for x in r):>4d} {sum(1 for x in r if x and x<=3):>5d} {sum(1/x for x in r if x)/n:>6.3f}")
print('\nPaired comparisons, gate 1 (exact McNemar; b = only A passes, c = only B passes):')
for a,b_ in [('text+cards','rg (distinct keywords)'),('text+cards','rg (hits)'),('text+cards','text'),('text+cards','cards'),('text+cards','text+dialogue'),('text','rg (distinct keywords)')]:
    A=pas(a,10);B=pas(b_,10); b=sum(1 for x,y in zip(A,B) if x and not y); c=sum(1 for x,y in zip(A,B) if y and not x)
    print(f'  {a} vs {b_}: b={b}, c={c}, p={binom2(b,c):.4f}')
print('\nPaired comparisons, #1 (exact McNemar):')
for a,b_ in [('text+cards','rg (distinct keywords)'),('text+cards','text'),('text+cards','cards')]:
    A=pas(a,1);B=pas(b_,1); b=sum(1 for x,y in zip(A,B) if x and not y); c=sum(1 for x,y in zip(A,B) if y and not x)
    print(f'  {a} vs {b_}: b={b}, c={c}, p={binom2(b,c):.4f}')
