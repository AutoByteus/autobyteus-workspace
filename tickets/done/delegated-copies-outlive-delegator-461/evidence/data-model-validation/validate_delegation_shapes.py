"""Read-only check of stored delegation data against the target contract (autobyteus-461).

Usage: python3 -I validate_delegation_shapes.py <server-data dir>
Reads run files, trees and Task records; writes nothing. Prints counts only (no content).
"""
import collections
import glob
import json
import os
import sys

root = sys.argv[1]
mem = os.path.join(root, "memory")
C = collections.Counter()


def load(path):
    try:
        with open(path) as handle:
            return json.load(handle)
    except Exception:
        C["unreadable_files"] += 1
        return None


# 1. Every run and which run each agent belongs to.
agent_runs, team_runs, org_runs = {}, {}, {}
agent_owner = {}  # agentRunId -> (kind, runId) of the run it is a part of
for path in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    meta = load(path)
    if meta:
        agent_runs[meta["runId"]] = meta
        agent_owner[meta["runId"]] = ("agent", meta["runId"])
for path in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    tree = load(path)
    if tree:
        team = tree["rootTeam"]
        team_runs[team["teamRunId"]] = tree
        for member in team.get("members", []):
            if "agentRunId" in member:
                agent_owner[member["agentRunId"]] = ("agent_team", team["teamRunId"])
for path in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    tree = load(path)
    if tree:
        org = tree["rootOrg"]
        org_runs[org["orgRunId"]] = tree
        for member in org.get("members", []):
            if "agentRunId" in member:
                agent_owner[member["agentRunId"]] = ("agent_org", org["orgRunId"])
            for inner in member.get("members", []):
                if "agentRunId" in inner:
                    agent_owner[inner["agentRunId"]] = ("agent_org", org["orgRunId"])

C["runs.agent"], C["runs.team"], C["runs.org"] = len(agent_runs), len(team_runs), len(org_runs)


def run_exists(ref):
    kind, run_id = ref["kind"], ref["runId"]
    return run_id in {"agent": agent_runs, "agent_team": team_runs, "agent_org": org_runs}[kind]


# 2. Every delegated run: today's back-link, and the one-hop delegating run the target contract needs.
delegated = {}  # ("agent"|"team", id) -> section
for run_id, meta in agent_runs.items():
    if "taskAgent" in meta:
        delegated[("agent", run_id)] = meta["taskAgent"]
        C["delegated.agent"] += 1
        for key in ("launchSource", "userLaunchSelection", "pendingRuntimeSwitch"):
            if key in meta["taskAgent"]:
                C["delegated.agent.has_" + key] += 1
        if meta.get("workspaceRootPath") is None:
            C["delegated.agent.workspace_null"] += 1
    if "delegatedFrom" in meta:
        C["peer_started.agent"] += 1
for run_id, tree in team_runs.items():
    if tree.get("taskAgent"):
        delegated[("team", run_id)] = tree["taskAgent"]
        C["delegated.team"] += 1
        for key in ("launchSource", "userLaunchSelection", "pendingRuntimeSwitch"):
            if key in tree["taskAgent"]:
                C["delegated.team.has_" + key] += 1
        if tree["taskAgent"].get("address") == tree["rootTeam"].get("address"):
            C["delegated.team.address_equals_own_rootTeam_address"] += 1
        else:
            C["delegated.team.address_differs_from_own_rootTeam_address"] += 1
    if tree.get("delegatedFrom"):
        C["peer_started.team"] += 1

for (kind, run_id), section in delegated.items():
    top = section["coordinatingRun"]
    C["today.coordinatingRun.kind." + top["kind"]] += 1
    if not run_exists(top):
        C["today.coordinatingRun.missing (detached)"] += 1
    delegator = section.get("delegatorAgentRunId")
    if not delegator:
        C["target.delegator.absent (old record)"] += 1
        continue
    owner = agent_owner.get(delegator)
    if not owner:
        C["target.delegatingRun.unresolvable (delegator's run not stored)"] += 1
        continue
    owner_is_delegated = (owner[0] == "agent" and "taskAgent" in agent_runs[owner[1]]) or \
        (owner[0] == "agent_team" and bool(team_runs[owner[1]].get("taskAgent")))
    same = owner == (top["kind"], top["runId"])
    if same:
        C["target.delegatingRun == today's coordinatingRun"] += 1
    else:
        C["target.delegatingRun != today's coordinatingRun (nested: one hop)"] += 1
        if not owner_is_delegated:
            C["target.nested_but_owner_not_delegated (unexpected)"] += 1
    if owner[0] == "agent" and owner[1] == delegator:
        C["target.delegatingRun.kind=agent (runId == delegatorAgentRunId)"] += 1

# 3. Every link, against the run it points to (the same facts stored on both sides).
def links_of(holder_kind, holder_id, entries, nested=False):
    for entry in entries or []:
        C["links.total"] += 1
        if nested:
            C["links.nested_under_a_team_or_member"] += 1
        if "nodeId" in entry:
            C["links.remote (nodeId)"] += 1
            continue
        key = ("agent", entry["agentRunId"]) if "agentRunId" in entry else ("team", entry["teamRunId"])
        C["links.local." + key[0]] += 1
        extra = set(entry) - {"address", "agentRunId", "teamRunId", "delegatorAgentRunId", "startedAt"}
        if extra:
            C["links.local.with_other_fields:" + ",".join(sorted(extra))] += 1
        section = delegated.get(key)
        if not section:
            C["links.local.target_has_no_own_file_or_section"] += 1
            continue
        top = section["coordinatingRun"]
        C["links.holder_is_target's_coordinatingRun" if (top["kind"], top["runId"]) == (holder_kind, holder_id)
          else "links.holder_differs_from_target's_coordinatingRun"] += 1
        C["links.address_same_both_sides" if entry.get("address") == section.get("address")
          else "links.address_differs_between_sides"] += 1
        C["links.delegator_same_both_sides" if entry.get("delegatorAgentRunId") == section.get("delegatorAgentRunId")
          else "links.delegator_differs_between_sides"] += 1
        links_of(holder_kind, holder_id, entry.get("taskExecutions"), nested=True)


for path in glob.glob(os.path.join(mem, "agents", "*", "collaboration", "collaboration_tree.json")):
    tree = load(path)
    if tree:
        links_of("agent", tree["host"]["agentRunId"], tree.get("taskExecutions"))
for run_id, tree in team_runs.items():
    links_of("agent_team", run_id, tree["rootTeam"].get("taskExecutions"))
for run_id, tree in org_runs.items():
    links_of("agent_org", run_id, tree["rootOrg"].get("taskExecutions"))
    for member in tree["rootOrg"].get("members", []):
        links_of("agent_org", run_id, member.get("taskExecutions"), nested=True)

linked = set()
# (a delegated run no tree links: its own file exists, no holder lists it)
def collect(entries):
    for entry in entries or []:
        if "nodeId" in entry:
            continue
        linked.add(("agent", entry["agentRunId"]) if "agentRunId" in entry else ("team", entry["teamRunId"]))
        collect(entry.get("taskExecutions"))
for path in glob.glob(os.path.join(mem, "agents", "*", "collaboration", "collaboration_tree.json")):
    tree = load(path)
    if tree:
        collect(tree.get("taskExecutions"))
for tree in team_runs.values():
    collect(tree["rootTeam"].get("taskExecutions"))
for tree in org_runs.values():
    collect(tree["rootOrg"].get("taskExecutions"))
    for member in tree["rootOrg"].get("members", []):
        collect(member.get("taskExecutions"))
C["delegated.not_linked_by_any_stored_tree"] = len([key for key in delegated if key not in linked])

# 4. Every Task record of a run: is `hostRoot` derivable from the run's own back-link?
files = glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + \
    glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json"))
C["task_records.files"] = len(files)
for path in files:
    record = load(path)
    for entry in (record or {}).get("agentRunResources", []):
        C["task_records.entries"] += 1
        C["task_records.role." + entry.get("role", "?")] += 1
        run = entry["agentRun"]
        key = ("agent", run["agentRunId"]) if run["kind"] == "agent" else ("team", run["teamRunId"])
        host = entry["hostRoot"]
        section = delegated.get(key)
        if not section:
            if (key[0] == "agent" and key[1] in agent_runs) or (key[0] == "team" and key[1] in team_runs):
                C["task_records.run_is_stored_but_not_a_delegated_run"] += 1
            else:
                C["task_records.run_not_stored_on_this_node (deleted or remote)"] += 1
            continue
        top = section["coordinatingRun"]
        C["task_records.hostRoot == run's coordinatingRun (derivable)" if (top["kind"], top["runId"]) == (host["kind"], host["runId"])
          else "task_records.hostRoot != run's coordinatingRun"] += 1
        if entry.get("role") == "assigned":
            C["task_records.assignedBy == run's delegator" if entry.get("assignedBy") == section.get("delegatorAgentRunId")
              else "task_records.assignedBy != run's delegator (a later assignment by run ID)"] += 1
            if "recipientAddress" in entry:
                C["task_records.recipientAddress == run's address" if entry["recipientAddress"] == section.get("address")
                  else "task_records.recipientAddress != run's address"] += 1

for key in sorted(C):
    print(f"{C[key]:6d}  {key}")
