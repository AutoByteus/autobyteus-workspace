# WDR-6 driver: GraphQL on one isolated instance. Usage: python3 wdr6.py <port> setup | delete <projectId> <logPath> <logStartLine>
import json, sys, urllib.request
port = sys.argv[1]
def gq(q, v=None):
    req = urllib.request.Request(f"http://127.0.0.1:{port}/graphql", data=json.dumps({"query": q, "variables": v or {}}).encode(), headers={"content-type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=120))
if sys.argv[2] == "setup":
    proj = gq("mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", {"i": {"name": "WDR6 Project"}})["data"]["createProject"]["projectId"]
    keys = [gq("mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskKey}}", {"i": {"projectId": proj, "description": d}})["data"]["createProjectTask"]["taskKey"]
            for d in ["Write a one-line motto for a tiny clock app and send it to the Project Manager.", "Not assigned to anyone."]]
    print(json.dumps({"project": proj, "keys": keys}))
else:
    proj, log, start = sys.argv[3], sys.argv[4], int(sys.argv[5])
    tasks = lambda: gq("query($id:String!){projectTasks(projectId:$id){taskId taskKey status}}", {"id": proj})
    before = tasks()["data"]["projectTasks"]
    print("tasks before:", [(t["taskKey"], t["status"]) for t in before])
    for t in sorted(before, key=lambda t: t["taskKey"]):
        r = gq("mutation($i:DeleteProjectTaskInput!){deleteProjectTask(input:$i)}", {"i": {"projectId": proj, "taskId": t["taskId"]}})
        print(f"delete {t['taskKey']} ({t['status']}):", json.dumps(r))
    print("tasks after:", json.dumps(tasks().get("data")))
    print("delete Project:", json.dumps(gq("mutation($id:String!){deleteProject(projectId:$id)}", {"id": proj})))
    print("projects after:", [p["name"] for p in gq("{projects{projectId name}}")["data"]["projects"]])
    lines = open(log, encoding="utf-8", errors="replace").read().splitlines()[start:]
    bad = [l[:250] for l in lines if ("[ERROR]" in l or "[WARN]" in l) and any(k in l.lower() for k in ("project", "task", "search", "adopt", "forget"))]
    print(f"app log since the DONE ({len(lines)} lines): errors/warnings mentioning project, task, search or adoption: {len(bad)}")
    for l in bad[:10]: print("  ", l)
