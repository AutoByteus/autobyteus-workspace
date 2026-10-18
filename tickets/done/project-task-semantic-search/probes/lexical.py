import json, sys, glob, os, re, math
root, qf = sys.argv[1], sys.argv[2]
docs = []
for f in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "task.json")):
    try: d = json.load(open(f))
    except Exception: continue
    if d.get("taskKey") and d.get("description"): docs.append((d["taskKey"], d["description"]))
qs = json.load(open(qf))
tok = lambda s: re.findall(r"[a-z0-9]+", s.lower())
# current behaviour: case-insensitive substring of the whole query
sub_hits = sum(1 for q in qs if any(q["q"].lower() in t.lower() and k in q["rel"] for k, t in docs))
sub_any = sum(1 for q in qs if any(q["q"].lower() in t.lower() for k, t in docs))
print("substring: queries with any match", sub_any, "/", len(qs), "; with a relevant match", sub_hits)
# BM25
N = len(docs); toks = [tok(t) for _, t in docs]; avg = sum(map(len, toks)) / N
df = {}
for ts in toks:
    for w in set(ts): df[w] = df.get(w, 0) + 1
def bm25(q, ts, k1=1.2, b=0.75):
    tf = {}
    for w in ts: tf[w] = tf.get(w, 0) + 1
    s = 0
    for w in set(tok(q)):
        if w not in tf: continue
        idf = math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5))
        s += idf * tf[w] * (k1 + 1) / (tf[w] + k1 * (1 - b + b * len(ts) / avg))
    return s
r1 = r5 = r10 = 0; mrr = 0
for q in qs:
    ranked = sorted(range(N), key=lambda i: -bm25(q["q"], toks[i]))
    rank = next((i for i, d in enumerate(ranked) if docs[d][0] in q["rel"]), -1)
    r1 += rank == 0; r5 += 0 <= rank < 5; r10 += 0 <= rank < 10; mrr += 1 / (rank + 1) if rank >= 0 else 0
n = len(qs); print("bm25 recall1 %.3f recall5 %.3f recall10 %.3f mrr %.3f" % (r1/n, r5/n, r10/n, mrr/n))
