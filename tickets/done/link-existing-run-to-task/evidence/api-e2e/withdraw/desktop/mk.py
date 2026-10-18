# Test-data helper for one isolated instance (GraphQL). Usage: python3 mk.py <port> setup|runs <workspace>
import json, subprocess, sys, os
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gq.sh"); PORT, CMD, WS = sys.argv[1], sys.argv[2], sys.argv[3]
def gq(q, v=None):
    out = json.loads(subprocess.check_output([G, PORT, q, json.dumps(v or {})]))
    if out.get("errors"): raise SystemExit(json.dumps(out["errors"])[:1500])
    return out["data"]
c = {"workspaceRootPath": WS, "llmModelIdentifier": "deepseek-v4-flash", "llmConfig": None, "autoExecuteTools": True, "runtimeKind": "autobyteus"}
def writer(): return gq("mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){runId}}", {"i": {"agentDefinitionId": "ado-writer", **c}})["createAgentRun"]["runId"]
def team(): return gq("mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){teamRunId}}", {"i": {"teamDefinitionId": "ado-review-team", "teamConfigs": [{"teamAddress": "/", **c}],
  "memberConfigs": [{"memberAddress": "/lead", "agentDefinitionId": "ado-review-lead", **c}, {"memberAddress": "/mate", "agentDefinitionId": "ado-review-mate", **c}]}})["createAgentTeamRun"]["teamRunId"]
if CMD == "setup":
    def agent(name, desc, instr, tools):
        return gq("mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}", {"i": {"name": name, "role": "assistant", "description": desc, "instructions": instr, "toolNames": tools}})["createAgentDefinition"]["id"]
    pm = agent("ADO Project Manager", "Manages the Project's Tasks.", "You manage the Project's Tasks. When asked to give a Task to a run, call delegate_task with that run id and the Task's id. When asked to change a Task's status, use update_task. Report tool results briefly.",
               ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"])
    agent("ADO Writer", "Writes short notes.", "You write short notes. Keep every answer to one or two sentences.", [])
    lead = agent("ADO Review Lead", "Leads reviews.", "You lead a small review team. Keep every answer to one or two sentences.", [])
    mate = agent("ADO Review Mate", "Helps with reviews.", "You help review. Keep every answer to one or two sentences.", [])
    gq("mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}", {"i": {"name": "ADO Review Team", "description": "Two-member review team.", "instructions": "Review what you are given; keep answers short.", "coordinatorMemberName": "lead",
      "nodes": [{"memberName": "lead", "ref": lead, "refScope": "SHARED"}, {"memberName": "mate", "ref": mate, "refScope": "SHARED"}]}})
    proj = gq("mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", {"i": {"name": "ADO Desktop Project"}})["createProject"]["projectId"]
    tasks = [gq("mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskKey}}", {"i": {"projectId": proj, "description": d}})["createProjectTask"]["taskKey"] for d in [
        "Write a one-sentence tagline for a tiny note app and send it to the Project Manager.",
        "Review the summary 'A tiny note app' and reply to the Project Manager with one improvement.",
        "Write a one-line motto for a tiny calendar app and send it to the Project Manager.",
        "Review the summary 'A tiny calendar app' and reply to the Project Manager with one improvement."]]
    pmr = gq("mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){runId}}", {"i": {"agentDefinitionId": pm, **{**c, "runtimeKind": "claude_agent_sdk", "llmModelIdentifier": "haiku"}}})["createAgentRun"]["runId"]
    print(json.dumps({"project": proj, "tasks": tasks, "pm": pmr, "writerA": writer(), "teamA": team()}))
elif CMD == "runs":
    print(json.dumps({"writerB": writer(), "teamB": team()}))
elif CMD == "writers":
    print(json.dumps({"writers": [writer() for _ in range(int(sys.argv[4]))]}))
