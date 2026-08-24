import hashlib
import json
import os
import pathlib
import urllib.request

BASE_URL = "http://127.0.0.1:29695"
DATA_DIR = pathlib.Path("/Users/normy/.autobyteus/server-data")
MEMORY_ROOT = DATA_DIR / "memory" / "agent_teams"
TARGET_ROOT = "nested_classroom_test_team_83a531dc8def4e82bbc946a02661bb8a"
OUT = pathlib.Path(__file__).resolve().parent


def graphql(query, variables=None):
    request = urllib.request.Request(
        BASE_URL + "/graphql",
        data=json.dumps({"query": query, "variables": variables or {}}).encode(),
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    if payload.get("errors"):
        raise RuntimeError(json.dumps(payload["errors"], indent=2))
    return payload["data"]


RESUME = """
query($teamRunId:String!){
  getTeamRunResumeConfig(teamRunId:$teamRunId){teamRunId isActive executionTree}
}
"""
PROJECTION = """
query($teamRunId:String!,$agentRunId:String!){
  getTeamMemberRunProjection(teamRunId:$teamRunId,agentRunId:$agentRunId){
    agentRunId summary lastActivityAt conversation activities hasEarlierActiveTraceEvents
  }
}
"""
EVENTS = """
query($teamRunId:String!,$agentRunId:String!){
  getTeamMemberEventMonitorActiveTracePage(teamRunId:$teamRunId,agentRunId:$agentRunId){
    beforeCursor hasEarlier loadedEarlierCount activeGeneration cursorStatus
    events {eventId turnGroupId occurredAtMs}
  }
}
"""
MIGRATIONS = """
query {
  getAppDataMigrations {
    migrationId displayName status requiredOnStartup recoveryAction canRetry attempts
    startedAt completedAt summary errorMessage logPath
  }
}
"""


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def file_summary(path):
    if not path.exists():
        return {"exists": False, "path": str(path)}
    result = {
        "exists": True,
        "path": str(path),
        "kind": "directory" if path.is_dir() else "file",
        "size": path.stat().st_size,
        "modifiedAtEpoch": path.stat().st_mtime,
    }
    if path.is_file():
        result["sha256"] = sha256(path)
        if path.name.endswith(".jsonl"):
            with path.open("rb") as stream:
                result["nonEmptyLineCount"] = sum(1 for line in stream if line.strip())
    return result


resume = graphql(RESUME, {"teamRunId": TARGET_ROOT})["getTeamRunResumeConfig"]
tree = resume["executionTree"]
root = tree["root_team"]

agents = []
teams = []


def walk_team(team, ancestor_team_ids, origin):
    current_team_id = team.get("team_run_id")
    teams.append({
        "origin": origin,
        "address": team.get("address", "/"),
        "teamRunId": current_team_id,
        "ancestorTeamRunIds": list(ancestor_team_ids),
        "settledAt": team.get("settled_at"),
    })
    child_ancestors = ancestor_team_ids + ([] if current_team_id == TARGET_ROOT else [current_team_id])
    for member in team.get("members", []):
        if "agent_run_id" in member:
            agents.append({
                "origin": member["kind"],
                "address": member["address"],
                "agentRunId": member["agent_run_id"],
                "ancestorTeamRunIds": list(child_ancestors),
            })
        else:
            walk_team(member, child_ancestors, member["kind"])
    for task in team.get("task_executions", []):
        if task["kind"] == "task_team":
            walk_team(task, child_ancestors, task["kind"])
        else:
            agents.append({
                "origin": task["kind"],
                "address": task["address"],
                "agentRunId": task["agent_run_id"],
                "ancestorTeamRunIds": list(child_ancestors),
            })


walk_team(root, [], "root_team")
root_dir = MEMORY_ROOT / TARGET_ROOT

diagnostics = []
for agent in agents:
    canonical_dir = root_dir.joinpath(*agent["ancestorTeamRunIds"], agent["agentRunId"])
    flat_dir = root_dir / agent["agentRunId"]
    matches = sorted(str(path) for path in root_dir.rglob(agent["agentRunId"]) if path.is_dir())
    projection = graphql(PROJECTION, {
        "teamRunId": TARGET_ROOT,
        "agentRunId": agent["agentRunId"],
    })["getTeamMemberRunProjection"]
    events = graphql(EVENTS, {
        "teamRunId": TARGET_ROOT,
        "agentRunId": agent["agentRunId"],
    })["getTeamMemberEventMonitorActiveTracePage"]
    diagnostics.append({
        **agent,
        "canonicalDirectory": file_summary(canonical_dir),
        "canonicalRawTrace": file_summary(canonical_dir / "raw_traces_active.jsonl"),
        "flatDirectory": file_summary(flat_dir),
        "flatRawTrace": file_summary(flat_dir / "raw_traces_active.jsonl"),
        "allDirectoryMatches": matches,
        "projection": {
            "conversationCount": len(projection["conversation"]),
            "activityCount": len(projection["activities"]),
            "lastActivityAt": projection["lastActivityAt"],
            "summary": projection["summary"],
            "hasEarlierActiveTraceEvents": projection["hasEarlierActiveTraceEvents"],
        },
        "eventMonitor": {
            "eventCount": len(events["events"]),
            "hasEarlier": events["hasEarlier"],
            "cursorStatus": events["cursorStatus"],
        },
    })

migrations = graphql(MIGRATIONS)["getAppDataMigrations"]
layout = next((item for item in migrations if item["migrationId"] == "20260823_repair_team_agent_memory_layout"), None)
layout_log = None
if layout and layout.get("logPath"):
    log_path = pathlib.Path(layout["logPath"])
    layout_log = file_summary(log_path)
    if log_path.exists():
        lines = log_path.read_text(errors="replace").splitlines()
        layout_log["lineCount"] = len(lines)
        layout_log["targetRootMentionCount"] = sum(TARGET_ROOT in line for line in lines)
        layout_log["tail"] = lines[-30:]

result = {
    "capturedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    "server": {"baseUrl": BASE_URL, "dataDir": str(DATA_DIR)},
    "target": {
        "rootTeamRunId": TARGET_ROOT,
        "isActive": resume["isActive"],
        "createdAt": tree["created_at"],
        "rootDirectory": file_summary(root_dir),
    },
    "teams": teams,
    "agents": diagnostics,
    "layoutMigration": layout,
    "layoutMigrationLog": layout_log,
}

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "live-electron-diagnostics.json").write_text(json.dumps(result, indent=2) + "\n")

summary = {
    "capturedAt": result["capturedAt"],
    "target": result["target"],
    "layoutMigration": layout,
    "layoutMigrationLog": layout_log,
    "agents": [{
        "origin": item["origin"],
        "address": item["address"],
        "agentRunId": item["agentRunId"],
        "ancestorTeamRunIds": item["ancestorTeamRunIds"],
        "canonicalDirectoryExists": item["canonicalDirectory"]["exists"],
        "canonicalTraceExists": item["canonicalRawTrace"]["exists"],
        "canonicalTraceSize": item["canonicalRawTrace"].get("size"),
        "canonicalTraceLineCount": item["canonicalRawTrace"].get("nonEmptyLineCount"),
        "flatDirectoryExists": item["flatDirectory"]["exists"],
        "flatTraceExists": item["flatRawTrace"]["exists"],
        "flatTraceSize": item["flatRawTrace"].get("size"),
        "flatTraceLineCount": item["flatRawTrace"].get("nonEmptyLineCount"),
        "directoryMatches": item["allDirectoryMatches"],
        "projection": item["projection"],
        "eventMonitor": item["eventMonitor"],
    } for item in diagnostics],
}
(OUT / "live-electron-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
