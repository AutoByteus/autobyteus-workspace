# Reads the isolated instance's backend (iso-61062-6a74) to verify the desktop journey; read-only queries.
import json, sys, urllib.request
URL = "http://127.0.0.1:61063/graphql"
def gql(q, v=None):
    r = urllib.request.urlopen(urllib.request.Request(URL, json.dumps({"query": q, "variables": v or {}}).encode(), {"content-type": "application/json"}))
    b = json.loads(r.read()); assert not b.get("errors"), b["errors"]; return b["data"]
hist = gql("query{listWorkspaceRunHistory(limitPerAgent:6){agentDefinitions{agentDefinitionId agentName runs{runId isActive hasCollaboration}}}}")
pm_runs = [(d["agentDefinitionId"], r) for w in hist["listWorkspaceRunHistory"] for d in w["agentDefinitions"] if d["agentName"] == "Project Task Manager" for r in d["runs"]]
print("PM runs:", pm_runs)
pm_def, pm = pm_runs[0]; host = pm["runId"]
view = gql("query($id:String!){agentRunCollaboration(runId:$id)}", {"id": host})["agentRunCollaboration"]["root_agent"]
tree = view["execution_tree"]
print("host address:", json.dumps(tree.get("host"))[:300])
print("collaborators:", tree.get("collaborators"))
def objs(v):
    if isinstance(v, list): return [o for x in v for o in objs(x)]
    if isinstance(v, dict): return [v] + [o for x in v.values() for o in objs(x)]
    return []
tasks = [o for o in objs(tree) if (o.get("startedAt") or o.get("started_at")) and (o.get("teamRunId") or o.get("agentRunId"))]
print("task nodes:", [(o.get("teamRunId") or o.get("agentRunId"), o.get("address")) for o in tasks])
members = [m for t in tasks for m in t.get("members", [])]
cr = next(m for m in members if m["address"].endswith("/code_reviewer"))
print("code reviewer:", cr["address"], cr.get("agentRunId"))
msgs = view["communication_messages"]["messages"]
for m in msgs: print("MSG", m["senderAgentRunId"], "->", m["receiverAgentRunId"], m.get("messageType"), "|", m["content"][:160].replace("\n"," "))
conv = gql("query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}", {"h": host, "a": cr["address"], "r": cr["agentRunId"]})["agentRunCollaborationMemberProjection"]["conversation"]
text = json.dumps(conv)
first_user = next(e for e in conv if e.get("role") == "user")
print("CR first user message:\n", first_user.get("content"))
calls = [o for o in objs(conv) if isinstance(o.get("toolName") or o.get("tool_name") or o.get("name"), str) and ("send_message_to" in json.dumps(o) or "delegate_task" in json.dumps(o))]
print("CR tool entries mentioning send_message_to/delegate_task:", json.dumps(calls)[:1500])
hostconv = json.dumps(gql("query($id:String!){getRunProjection(runId:$id){conversation}}", {"id": host})["getRunProjection"]["conversation"])
print("host conversation has the request:", "recieve" in hostconv and "code_reviewer" in hostconv)
json.dump({"host": host, "pmDefinition": pm_def, "pmRuns": pm_runs, "tree": tree, "messages": msgs, "codeReviewer": cr, "codeReviewerConversation": conv}, open("desktop-journey-backend.json", "w"), indent=1)
