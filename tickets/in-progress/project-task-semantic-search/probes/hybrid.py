# Usage: python3 -I hybrid.py <dataDir> <dump.json>
import json, sys, glob, os, re, math, statistics
root, dumpf = sys.argv[1], sys.argv[2]
docs = {}
for f in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "task.json")):
    try: d = json.load(open(f))
    except Exception: continue
    if d.get("taskKey") and d.get("description"): docs[d["taskKey"]] = d["description"]
keys = list(docs); tok = lambda s: re.findall(r"[a-z0-9]+", s.lower())
toks = {k: tok(docs[k]) for k in keys}; N = len(keys); avg = sum(len(t) for t in toks.values()) / N
df = {}
for t in toks.values():
    for w in set(t): df[w] = df.get(w, 0) + 1
STOP = set("a an the of to and or in on for with is it its be by as at this that from not no do does i my me we our you".split())
def bm25(q, ts, k1=1.2, b=0.75):
    tf = {}
    for w in ts: tf[w] = tf.get(w, 0) + 1
    s = 0
    for w in set(tok(q)) - STOP:
        if w in tf:
            idf = math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5)); s += idf * tf[w] * (k1 + 1) / (tf[w] + k1 * (1 - b + b * len(ts) / avg))
    return s
dump = json.load(open(dumpf))
def metrics(rankings):
    r1 = r5 = r10 = 0; mrr = 0
    for rel, ranked in rankings:
        rank = next((i for i, k in enumerate(ranked) if k in rel), -1)
        r1 += rank == 0; r5 += 0 <= rank < 5; r10 += 0 <= rank < 10; mrr += 1 / (rank + 1) if rank >= 0 else 0
    n = len(rankings); return "r1 %.3f r5 %.3f r10 %.3f mrr %.3f" % (r1/n, r5/n, r10/n, mrr/n)
emb, lex, fused = [], [], {}
for kk in (10, 30, 60): fused[kk] = []
best_rel, top_irrel, gaps = [], [], []
for e in dump:
    q, rel = e["q"], e["rel"]; ranked = [k for k, s in e["ranked"]]; score = dict(e["ranked"])
    emb.append((rel, ranked))
    b = sorted(keys, key=lambda k: -bm25(q, toks[k])); lex.append((rel, b))
    er = {k: i for i, k in enumerate(ranked)}; br = {k: i for i, k in enumerate(b)}
    for kk in fused: fused[kk].append((rel, sorted(keys, key=lambda k: -(1/(kk+er[k]+1) + 1/(kk+br[k]+1)))))
    rs = [score[k] for k in rel if k in score]; best_rel.append(max(rs))
    top_irrel.append(max(s for k, s in e["ranked"] if k not in rel))
    top = e["ranked"][0][1]; gaps.append([round(top - s, 3) for k, s in e["ranked"] if k in rel])
print("embedding only :", metrics(emb)); print("bm25 only      :", metrics(lex))
for kk in fused: print("RRF k=%-3d      :" % kk, metrics(fused[kk]))
print("relevant best score   min %.3f p10 %.3f median %.3f" % (min(best_rel), sorted(best_rel)[len(best_rel)//10], statistics.median(best_rel)))
print("top irrelevant score  min %.3f median %.3f max %.3f" % (min(top_irrel), statistics.median(top_irrel), max(top_irrel)))
print("gap top-score minus relevant (per query):", sorted(min(g) for g in gaps))
for thr_gap in (0.03, 0.05, 0.08, 0.1):
    counts = []; hit = 0
    for e in dump:
        top = e["ranked"][0][1]; sel = [k for k, s in e["ranked"] if s >= top - thr_gap]
        counts.append(len(sel)); hit += any(k in e["rel"] for k in sel[:20])
    print("relative floor top-%.2f: shown median %d p90 %d max %d; relevant shown %d/%d" % (thr_gap, statistics.median(counts), sorted(counts)[int(len(counts)*.9)], max(counts), hit, len(dump)))
for absf in (0.55, 0.6, 0.65, 0.7):
    counts=[]; hit=0
    for e in dump:
        sel=[k for k,s in e["ranked"] if s>=absf]; counts.append(len(sel)); hit+=any(k in e["rel"] for k in sel)
    print("absolute floor %.2f: shown median %d p90 %d max %d; relevant shown %d/%d" % (absf, statistics.median(counts), sorted(counts)[int(len(counts)*.9)], max(counts), hit, len(dump)))
