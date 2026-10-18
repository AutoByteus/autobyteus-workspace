# Usage: python3 -I rules.py <dump.json> [<dump.json> ...]
# Evaluates candidate relevance rules over full per-query score lists (FO-001).
# Metrics per backlog: para = share of paraphrases whose target is shown within the first 5 matches;
# unrel = share of unrelated queries (24) that show no meaning match.
import json, sys, statistics, itertools

def load(p):
    d = json.load(open(p)); out = {}
    for name, s in d["sets"].items():
        qs = []
        for q in s["queries"]:
            sc = q["scores"]; mean = statistics.fmean(sc); sd = statistics.pstdev(sc) or 1e-9
            qs.append(dict(kind=q["kind"], targets=set(q["targets"]), ids=q["ids"], scores=sc, mean=mean, sd=sd))
        out[name] = qs
    return d["model"], d["calibration"], out

def evaluate(qs, select):
    para = [q for q in qs if q["kind"] == "para"]; unrel = [q for q in qs if q["kind"] == "unrel"]
    hit = 0
    for q in para:
        shown = select(q)
        if any(q["ids"][i] in q["targets"] for i in shown[:5]): hit += 1
    nomatch = sum(1 for q in unrel if not select(q))
    return hit / len(para), nomatch / len(unrel)

def rule_floor(floor, margin, cap=20):
    def sel(q):
        sc = q["scores"]; top = sc[0]
        if top < floor: return []
        return [i for i, s in enumerate(sc[:cap]) if s >= top - margin]
    return sel

def rule_z(zgate, margin, cap=20):
    # gate: how far the best score stands above this query's score distribution over the whole collection
    def sel(q):
        sc = q["scores"]; top = sc[0]
        if (top - q["mean"]) / q["sd"] < zgate: return []
        return [i for i, s in enumerate(sc[:cap]) if s >= top - margin]
    return sel

def rule_zitem(zgate, zitem, cap=20):
    # gate as above; members: items whose own z-score clears zitem (scale-free margin)
    def sel(q):
        sc = q["scores"]; top = sc[0]; m, sd = q["mean"], q["sd"]
        if (top - m) / sd < zgate: return []
        return [i for i, s in enumerate(sc[:cap]) if (s - m) / sd >= zitem]
    return sel

def report(model, cal, sets):
    print(f"\n===== {model}  (shipped calibration {cal})")
    names = list(sets)
    def row(label, sel):
        cells = []; ok = True
        for n in names:
            p, u = evaluate(sets[n], sel); cells.append(f"{n}: para {p:.3f} unrel {u:.3f}")
            ok &= p >= 0.90 and u >= 0.90
        print(("PASS " if ok else "     ") + f"{label:38s} | " + " | ".join(cells))
        return ok
    row(f"current floor {cal['clearMatchFloor']} margin {cal['nearBestMargin']}", rule_floor(cal["clearMatchFloor"], cal["nearBestMargin"]))
    print("  -- absolute floor sweep (margin = shipped and 0.02) --")
    base = cal["clearMatchFloor"]
    for m in (cal["nearBestMargin"], 0.02):
        for f in [round(base + d, 3) for d in (0, 0.03, 0.06, 0.08, 0.10, 0.12)]:
            row(f"floor {f} margin {m}", rule_floor(f, m))
    print("  -- z-score gate (best score vs this query's whole-collection distribution) --")
    passes = []
    for zg, m in itertools.product((3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0), (0.02, 0.03, cal["nearBestMargin"])):
        if row(f"zgate {zg} margin {m}", rule_z(zg, m)): passes.append((zg, m))
    print("  -- z gate + z item membership --")
    for zg, zi in itertools.product((4.0, 4.5, 5.0, 5.5), (3.5, 4.0, 4.5, 5.0)):
        if zi > zg: continue
        row(f"zgate {zg} zitem {zi}", rule_zitem(zg, zi))
    # distribution summaries
    for n in names:
        para = [q for q in sets[n] if q["kind"] == "para"]; unrel = [q for q in sets[n] if q["kind"] == "unrel"]
        zp = sorted((q["scores"][0] - q["mean"]) / q["sd"] for q in para); zu = sorted((q["scores"][0] - q["mean"]) / q["sd"] for q in unrel)
        print(f"  z(best) {n}: para min {zp[0]:.2f} p05 {zp[int(.05*len(zp))]:.2f} p10 {zp[int(.1*len(zp))]:.2f} median {zp[len(zp)//2]:.2f} | unrel median {zu[len(zu)//2]:.2f} p90 {zu[int(.9*len(zu))]:.2f} max {zu[-1]:.2f}")

for p in sys.argv[1:]:
    report(*load(p))
