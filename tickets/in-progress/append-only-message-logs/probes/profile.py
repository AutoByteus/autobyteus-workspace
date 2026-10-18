import json,sys,statistics
for f in sys.argv[1:]:
    d=json.load(open(f))
    m=d["messages"]
    L=[len(json.dumps(x,separators=(",",":"))) for x in m]
    print(f.split("/")[-2][:40], len(m),"msgs; keys",sorted(d.keys()),"compact",sum(L),"median",statistics.median(L),"max",max(L),"first",m[0]["createdAt"],"last",m[-1]["createdAt"])
    print("  msg keys",sorted(m[0].keys()),"with refs",sum(1 for x in m if x["referenceFiles"]), "sorted by createdAt", all(m[i]["createdAt"]<=m[i+1]["createdAt"] for i in range(len(m)-1)), "unique ids", len(set(x["messageId"] for x in m))==len(m))
