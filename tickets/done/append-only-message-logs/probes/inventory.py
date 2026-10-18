import json,glob,os,collections,sys
root=sys.argv[1]
pats={"hub":"agents/*/collaboration/communication_messages.json","agent_task_agent":"agents/*/communication_messages.json","team_dir":"agent_teams/*/team_communication_messages.json","org":"agent_orgs/*/agent_org_communication_messages.json"}
for kind,p in pats.items():
    c=collections.Counter()
    for f in glob.glob(os.path.join(root,p)):
        k=kind
        if kind=="team_dir":
            try:
                t=json.load(open(os.path.join(os.path.dirname(f),"team_run_execution_tree.json")))
                k="task_agent_team" if "taskAgent" in t else "team_run"
            except FileNotFoundError: k="team_no_tree"
            except Exception: k="team_tree_unreadable"
        try: d=json.load(open(f))
        except Exception as e: c[(k,"UNREADABLE")]+=1; continue
        hk=tuple(sorted(d.keys())); m=d.get("messages",[])
        mk=tuple(sorted(set(tuple(sorted(x.keys())) for x in m)))
        ordered=all(m[i]["createdAt"]<=m[i+1]["createdAt"] for i in range(len(m)-1))
        uniq=len(set(x.get("messageId") for x in m))==len(m)
        size=os.path.getsize(f)
        c[(k,hk,len(mk),"empty" if not m else "nonempty","ordered" if ordered else "UNORDERED","unique" if uniq else "DUP",">4MiB" if size>4*1048576 else "<=4MiB", "sv=%s"%d.get("schemaVersion"))]+=1
    for key,n in sorted(c.items(),key=str): print(n,key)
