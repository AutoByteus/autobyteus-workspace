#!/usr/bin/env python3
"""Temporary API/E2E fixture setup (collaboration-member-artifact-hydration).
Creates owned agent/Team/Org definitions and runs (AGY runtime, fake CLI) through public GraphQL, then records the
member run IDs from the public execution trees. Usage: setup.py <state.json> <label>  -> writes <owned>/fixtures-<label>.json"""
import json, sys, urllib.request, uuid
state = json.load(open(sys.argv[1])); label = sys.argv[2]
B, W = state["backendUrl"], state["workspace"]
MODEL = "gemini-3.8-flash-low"
def gql(query, variables=None):
    req = urllib.request.Request(B + "/graphql", data=json.dumps({"query": query, "variables": variables or {}}).encode(),
                                 headers={"content-type": "application/json"})
    body = json.load(urllib.request.urlopen(req))
    if body.get("errors"): raise SystemExit(json.dumps(body["errors"]))
    return body["data"]
def agent(name):
    return gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
               {"input": {"name": f"{name} {label}", "role": "assistant", "description": "member artifact hydration E2E",
                          "instructions": "Use native image generation when requested.", "category": "runtime-e2e", "toolNames": []}})["createAgentDefinition"]["id"]
def walk(node, out):
    if isinstance(node, dict):
        if node.get("kind") == "configured_agent" and isinstance(node.get("agent_run_id"), str):
            out[node["address"]] = node["agent_run_id"]
        for v in node.values(): walk(v, out)
    elif isinstance(node, list):
        for v in node: walk(v, out)
    return out
lead, creator, designer = agent("Lead"), agent("Creator"), agent("Designer")
team_def = gql("mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
    {"input": {"name": f"Content Team {label}", "description": "E2E team", "instructions": "Lead coordinates; creator generates images.",
               "coordinatorMemberName": "lead", "nodes": [{"memberName": "lead", "ref": lead, "refScope": "SHARED"},
                                                          {"memberName": "creator", "ref": creator, "refScope": "SHARED"}]}})["createAgentTeamDefinition"]["id"]
cfg = {"llmModelIdentifier": MODEL, "llmConfig": {}, "autoExecuteTools": True, "runtimeKind": "antigravity_cli", "workspaceRootPath": W}
team_run = gql("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
    {"input": {"teamDefinitionId": team_def, "teamConfigs": [{"teamAddress": "/", **cfg}],
               "memberConfigs": [{"memberAddress": "/lead", "agentDefinitionId": lead, **cfg},
                                 {"memberAddress": "/creator", "agentDefinitionId": creator, **cfg}]}})["createAgentTeamRun"]
assert team_run["success"], team_run
team_tree = gql("query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { executionTree } }", {"id": team_run["teamRunId"]})["getTeamRunResumeConfig"]["executionTree"]
org_def = gql("mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }",
    {"input": {"name": f"Studio Org {label}", "description": "E2E org", "instructions": "Designer leads; the eng team produces images.",
               "members": [{"memberName": "designer", "ref": designer, "refType": "AGENT", "refScope": "SHARED"},
                           {"memberName": "eng", "ref": team_def, "refType": "AGENT_TEAM", "refScope": "SHARED"}], "handoffs": []}})["createAgentOrgDefinition"]["id"]
org_run = gql("mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }",
    {"input": {"agentOrgDefinitionId": org_def, "rootConfiguration": {"runtimeKind": "antigravity_cli", "llmModelIdentifier": MODEL,
               "llmConfig": None, "autoExecuteTools": True, "workspaceRootPath": W}}})["createAgentOrgRun"]
assert org_run["success"], org_run
org_tree = gql("query($id: String!) { getAgentOrgRunConfig(orgRunId: $id) { executionTree } }", {"id": org_run["agentOrgRunId"]})["getAgentOrgRunConfig"]["executionTree"]
standalone = gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success runId } }",
    {"input": {"agentDefinitionId": creator, "workspaceRootPath": W, "llmModelIdentifier": MODEL, "llmConfig": None,
               "autoExecuteTools": True, "runtimeKind": "antigravity_cli"}})["createAgentRun"]
fixtures = {"teamRunId": team_run["teamRunId"], "teamMembers": walk(team_tree, {}),
            "orgRunId": org_run["agentOrgRunId"], "orgMembers": walk(org_tree, {}), "standaloneRunId": standalone["runId"],
            "definitions": {"lead": lead, "creator": creator, "designer": designer, "team": team_def, "org": org_def}}
json.dump(fixtures, open(f"{state['owned']}/fixtures-{label}.json", "w"), indent=2)
print(json.dumps(fixtures, indent=2))
