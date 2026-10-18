# Usage: python3 -I analyze2.py <dumpsDir>; recomputes metrics + off-topic separation (true off-topic queries only) + near-best rule
import json, glob, os, statistics
OFF = {"recipe for banana bread","asdkjh qwezx plmok","weather in Berlin tomorrow","best hiking trails in the Alps","xyz","football world cup results","how to knit a scarf","stock price of apple"}
rows = []
for f in sorted(glob.glob(os.path.join(os.sys.argv[1], "dump-*.json"))):
    d = json.load(open(f)); name = os.path.basename(f)[5:-5]
    dump = d["dump"]; off = [e for e in d["off"] if e["q"] in OFF]
    n = len(dump); r = [next((i for i, (k, s) in enumerate(e["ranked"]) if k in e["rel"]), 999) for e in dump]
    real = sorted(e["ranked"][0][1] for e in dump); offt = sorted(e["ranked"][0][1] for e in off)
    best = max(((sum(s >= t for s in real) + sum(s < t for s in offt)) / (len(real) + len(offt)), t) for t in real + offt)
    # near-best rule calibrated per model: margin = median gap between top and relevant (95th pct)
    gaps = sorted(e["ranked"][0][1] - max(s for k, s in e["ranked"] if k in e["rel"]) for e in dump)
    margin = gaps[int(len(gaps) * .95)]
    shown = [sum(1 for k, s in e["ranked"] if s >= e["ranked"][0][1] - margin) for e in dump]
    rows.append((name, n, sum(x == 0 for x in r) / n, sum(x < 5 for x in r) / n, sum(x < 10 for x in r) / n, sum(1 / (x + 1) for x in r if x < 999) / n, best[0], best[1], offt[-1] if offt else None, real[0], margin, statistics.median(shown), sorted(shown)[int(len(shown) * .9)]))
print("| model | q | r@1 | r@5 | r@10 | MRR | off-topic separation | cut | off max | real min | near-best margin (p95) | shown median | shown p90 |")
for x in sorted(rows, key=lambda x: -x[5]): print("| %s | %d | %.3f | %.3f | %.3f | %.3f | %.3f | %.3f | %.3f | %.3f | %.3f | %d | %d |" % x)
