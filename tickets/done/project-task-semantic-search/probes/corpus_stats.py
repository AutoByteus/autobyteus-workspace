import json, sys, glob, os, re, statistics
root = sys.argv[1]
rows = []
for f in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "task.json")):
    try:
        d = json.load(open(f))
    except Exception:
        continue
    rows.append(d)
lens = [len(d.get("description","")) for d in rows]
print("tasks", len(rows))
print("chars median", statistics.median(lens), "p90", sorted(lens)[int(len(lens)*0.9)], "max", max(lens), "total", sum(lens))
cjk = sum(1 for d in rows if re.search(r"[一-鿿]", d.get("description","")))
print("tasks with CJK chars", cjk)
st = {}
for d in rows: st[d.get("status")] = st.get(d.get("status"),0)+1
print(st)
