#!/usr/bin/env python3
"""Build a reviewable identity/trace/artifact/UI join from the isolated API-REV-004 run."""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import sqlite3
from pathlib import Path

WORKTREE = Path("/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability")
EVIDENCE = WORKTREE / "tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-004"
DATA = WORKTREE / ".autobyteus/api-e2e-004"
TEAM_RUN = "brief_studio_team_3fcc38699ad44130b20eb4149a19cdff"
RESEARCHER_RUN = "brief_studio_researcher_bef570119a744cd9a182403c0887fb7f"
WRITER_RUN = "brief_studio_writer_0985ae6e8c1943e89f3e4d6d4f3b0afc"
BRIEF_ID = "brief-2263879a-640f-4606-8e92-d01e53a18dd5"
TEAM_MEMORY = DATA / "memory/agent_teams" / TEAM_RUN
APP_ROOT = next((DATA / "applications").glob("bundle-app__brief-studio__*/"))
RUNTIME = APP_ROOT / "runtime"


def load_json(path: Path):
    return json.loads(path.read_text())


def load_jsonl(path: Path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def write_json(path: Path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w’'-]+\b", text, flags=re.UNICODE))


def sqlite_dump(path: Path, table_names: list[str]):
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    try:
        return {
            table: [dict(row) for row in connection.execute(f'SELECT * FROM "{table}" ORDER BY rowid')]
            for table in table_names
        }
    finally:
        connection.close()


def extract_native_session(path: Path, run_id: str):
    rows = load_jsonl(path)
    meta = next(row["payload"] for row in rows if row.get("type") == "session_meta")
    patch_call = next(
        row for row in rows
        if row.get("type") == "response_item"
        and row.get("payload", {}).get("type") == "custom_tool_call"
        and "*** Begin Patch" in row.get("payload", {}).get("input", "")
    )
    patch_end = next(
        row for row in rows
        if row.get("type") == "event_msg" and row.get("payload", {}).get("type") == "patch_apply_end"
    )
    return {
        "agentRunId": run_id,
        "platformSession": {
            "id": meta["id"],
            "modelProvider": meta.get("model_provider"),
            "cwd": meta.get("cwd"),
            "cliVersion": meta.get("cli_version"),
            "originator": meta.get("originator"),
        },
        "providerNativePatchInvocation": {
            "timestamp": patch_call["timestamp"],
            "recordType": patch_call["payload"]["type"],
            "operation": "tools.apply_patch",
            "providerCallId": patch_call["payload"]["call_id"],
            "input": patch_call["payload"]["input"],
        },
        "providerNativePatchResult": {
            "timestamp": patch_end["timestamp"],
            **patch_end["payload"],
        },
    }


EVIDENCE.mkdir(parents=True, exist_ok=True)

tree_path = TEAM_MEMORY / "team_run_execution_tree.json"
comm_path = TEAM_MEMORY / "team_communication_messages.json"
research_trace_path = TEAM_MEMORY / RESEARCHER_RUN / "raw_traces_active.jsonl"
writer_trace_path = TEAM_MEMORY / WRITER_RUN / "raw_traces_active.jsonl"
research_path = RUNTIME / "brief-studio/research.md"
final_path = RUNTIME / "brief-studio/final-brief.md"

for source, target in [
    (tree_path, EVIDENCE / "team-run-execution-tree.json"),
    (comm_path, EVIDENCE / "team-communication-messages.json"),
    (research_trace_path, EVIDENCE / "researcher-raw-trace.jsonl"),
    (writer_trace_path, EVIDENCE / "writer-raw-trace.jsonl"),
    (research_path, EVIDENCE / "research.md"),
    (final_path, EVIDENCE / "final-brief.md"),
    (TEAM_MEMORY / RESEARCHER_RUN / "published_artifacts.json", EVIDENCE / "researcher-published-artifacts.json"),
    (TEAM_MEMORY / WRITER_RUN / "published_artifacts.json", EVIDENCE / "writer-published-artifacts.json"),
]:
    shutil.copy2(source, target)

researcher_native = extract_native_session(
    Path("/root/.codex/sessions/2026/08/27/rollout-2026-08-27T21-32-38-01a04523-a49a-7120-818b-6f8fb03f24b2.jsonl"),
    RESEARCHER_RUN,
)
writer_native = extract_native_session(
    Path("/root/.codex/sessions/2026/08/27/rollout-2026-08-27T21-33-20-01a04524-4851-7db2-9a4d-2dbbf43a1fac.jsonl"),
    WRITER_RUN,
)
write_json(EVIDENCE / "researcher-codex-native-session-events.json", researcher_native)
write_json(EVIDENCE / "writer-codex-native-session-events.json", writer_native)

app_db = APP_ROOT / "db/app.sqlite"
platform_db = APP_ROOT / "db/platform.sqlite"
final_db = {
    "appDatabase": sqlite_dump(
        app_db,
        ["briefs", "brief_bindings", "brief_artifacts", "brief_artifact_revisions", "pending_launch_requests", "processed_events"],
    ),
    "platformDatabase": sqlite_dump(
        platform_db,
        ["__autobyteus_run_bindings", "__autobyteus_run_binding_members", "__autobyteus_execution_event_journal"],
    ),
}
write_json(EVIDENCE / "final-db.json", final_db)

tree = load_json(tree_path)
communication = load_json(comm_path)
research_trace = load_jsonl(research_trace_path)
writer_trace = load_jsonl(writer_trace_path)
browser = load_json(EVIDENCE / "final-browser-observation.json")
transitions = load_jsonl(EVIDENCE / "db-state-transitions.jsonl")
research_text = research_path.read_text()
final_text = final_path.read_text()
research_marker, research_body = research_text.split("\n\n", 1)
final_marker, final_body = final_text.split("\n\n", 1)
handoff = communication["messages"][0]

role_sources = {
    "researcherAgent": WORKTREE / "applications/brief-studio/agent-teams/brief-studio-team/agents/researcher/agent.md",
    "researcherConfig": WORKTREE / "applications/brief-studio/agent-teams/brief-studio-team/agents/researcher/agent-config.json",
    "writerAgent": WORKTREE / "applications/brief-studio/agent-teams/brief-studio-team/agents/writer/agent.md",
    "writerConfig": WORKTREE / "applications/brief-studio/agent-teams/brief-studio-team/agents/writer/agent-config.json",
    "team": WORKTREE / "applications/brief-studio/agent-teams/brief-studio-team/team.md",
    "launch": WORKTREE / "applications/brief-studio/backend-src/services/brief-run-launch-service.ts",
}
role_snapshot = {
    key: {"path": str(path), "sha256": sha256(path), "content": path.read_text()}
    for key, path in role_sources.items()
}
write_json(EVIDENCE / "shipped-instruction-and-config-snapshot.json", role_snapshot)


def tool_calls(trace):
    return [row for row in trace if row.get("trace_type") == "tool_call"]


def tool_results(trace):
    return [row for row in trace if row.get("trace_type") == "tool_result"]


def calls_named(trace, name):
    return [row for row in tool_calls(trace) if row.get("tool_name") == name]


def results_named(trace, name):
    return [row for row in tool_results(trace) if row.get("tool_name") == name]


research_calls = tool_calls(research_trace)
writer_calls = tool_calls(writer_trace)
research_context = results_named(research_trace, "get_brief_context")[0]
writer_context = results_named(writer_trace, "get_brief_context")[0]
research_edit = calls_named(research_trace, "edit_file")[0]
writer_edit = calls_named(writer_trace, "edit_file")[0]
research_publish = calls_named(research_trace, "publish_artifacts")[0]
writer_publish = calls_named(writer_trace, "publish_artifacts")[0]
research_publish_result = results_named(research_trace, "publish_artifacts")[0]
writer_publish_result = results_named(writer_trace, "publish_artifacts")[0]

members = {member["address"]: member for member in tree["rootTeam"]["members"]}
app_brief = final_db["appDatabase"]["briefs"][0]
app_revisions = final_db["appDatabase"]["brief_artifact_revisions"]
binding = final_db["appDatabase"]["brief_bindings"][0]
platform_members = final_db["platformDatabase"]["__autobyteus_run_binding_members"]
forbidden_runtime_calls = {"run_bash", "read_file", "write_file"}
configured_expected = ["get_brief_context", "publish_artifacts", "send_message_to"]
research_config = json.loads(role_sources["researcherConfig"].read_text())
writer_config = json.loads(role_sources["writerConfig"].read_text())
model_facing_text = "\n".join(
    role_sources[key].read_text() for key in ["researcherAgent", "writerAgent", "team", "launch"]
)

research_first_bullet = next(
    line for line in research_body.splitlines() if line.startswith("- ")
)
handoff_body = handoff["content"].split("Canonical artifact path: brief-studio/research.md\n\n", 1)[1]
stable_before_research_publication = next(
    row for row in transitions if row.get("observedAt") == "2026-08-27T21:32:40.013944Z"
)
research_publication_state = next(
    row for row in transitions if row.get("observedAt") == "2026-08-27T21:33:09.968676Z"
)
final_publication_state = next(
    row for row in transitions if row.get("observedAt") == "2026-08-27T21:33:47.494846Z"
)

assertions = {
    "AC-032_actual_shipped_team_model_and_tools": (
        tree["rootTeam"]["defaultLaunchConfiguration"]["runtimeKind"] == "codex_app_server"
        and tree["rootTeam"]["defaultLaunchConfiguration"]["llmModelIdentifier"] == "gpt-5.6-luna"
        and all(member["launchConfiguration"]["runtimeKind"] == "codex_app_server" for member in members.values())
        and all(member["launchConfiguration"]["llmModelIdentifier"] == "gpt-5.6-luna" for member in members.values())
        and research_config["toolNames"] == configured_expected
        and writer_config["toolNames"] == configured_expected
        and all(name not in research_config["toolNames"] + writer_config["toolNames"] for name in ["read_file", "write_file", "apply_patch", "edit_file", "run_bash"])
    ),
    "AC-033_exactly_once_first_context_per_member": (
        research_calls[0]["tool_name"] == "get_brief_context"
        and writer_calls[0]["tool_name"] == "get_brief_context"
        and len(calls_named(research_trace, "get_brief_context")) == 1
        and len(calls_named(writer_trace, "get_brief_context")) == 1
        and research_context["source_event"] == "TOOL_EXECUTION_SUCCEEDED"
        and writer_context["source_event"] == "TOOL_EXECUTION_SUCCEEDED"
    ),
    "AC-034_exact_brief_binding_member_agentRun_toolCall_join": (
        research_context["tool_result"]["briefId"] == BRIEF_ID
        and writer_context["tool_result"]["briefId"] == BRIEF_ID
        and app_brief["brief_id"] == BRIEF_ID
        and binding["binding_id"] == tree["applicationBinding"]["bindingId"]
        and binding["run_id"] == TEAM_RUN
        and members["/researcher"]["agentRunId"] == RESEARCHER_RUN
        and members["/writer"]["agentRunId"] == WRITER_RUN
        and {row["agent_run_id"] for row in platform_members} == {RESEARCHER_RUN, WRITER_RUN}
        and research_context["tool_call_id"] == "exec-828d4468-c376-4877-9bbe-9deab42cca9e"
        and writer_context["tool_call_id"] == "exec-d18e28ec-0e2f-44e5-a528-5f24fe3ffe43"
    ),
    "AC-035_context_read_alone_does_not_mutate_business_or_ui_state": (
        stable_before_research_publication["state"]["briefs"][0]["status"] == "researching"
        and research_publication_state["state"]["briefs"][0]["status"] == "researching"
        and research_context["ts"] < research_publish_result["ts"]
        and writer_context["ts"] < writer_publish_result["ts"]
        and research_publication_state["state"]["briefs"][0]["status"] == "researching"
        and final_publication_state["state"]["briefs"][0]["status"] == "in_review"
    ),
    "AC-036_native_patch_normalized_edit_and_provider_success": (
        "Luna's built-in `apply_patch`" in model_facing_text
        and "`edit_file`" not in model_facing_text
        and researcher_native["providerNativePatchResult"]["type"] == "patch_apply_end"
        and researcher_native["providerNativePatchResult"]["success"] is True
        and researcher_native["providerNativePatchResult"]["call_id"] == research_edit["tool_call_id"]
        and writer_native["providerNativePatchResult"]["type"] == "patch_apply_end"
        and writer_native["providerNativePatchResult"]["success"] is True
        and writer_native["providerNativePatchResult"]["call_id"] == writer_edit["tool_call_id"]
        and results_named(research_trace, "edit_file")[0]["source_event"] == "TOOL_EXECUTION_SUCCEEDED"
        and results_named(writer_trace, "edit_file")[0]["source_event"] == "TOOL_EXECUTION_SUCCEEDED"
        and research_edit["tool_args"]["patch"] == research_text
        and writer_edit["tool_args"]["patch"] == final_text
    ),
    "AC-037_zero_shell_or_ordinary_file_calls_and_no_trace_feedback": (
        not any(call["tool_name"] in forbidden_runtime_calls for call in research_calls + writer_calls)
        and not any("trace" in call["tool_name"] or "protocol" in call["tool_name"] for call in research_calls + writer_calls)
        and all(results_named(trace, "edit_file")[0]["tool_result"] == {"success": True} for trace in [research_trace, writer_trace])
    ),
    "AC-038_complete_verbatim_handoff_and_relative_publication": (
        handoff["senderAgentRunId"] == RESEARCHER_RUN
        and handoff["receiverAgentRunId"] == WRITER_RUN
        and research_marker in handoff["content"]
        and "Canonical artifact path: brief-studio/research.md" in handoff["content"]
        # Team message serialization omits only the file's terminal newline; every
        # marker/body character is otherwise preserved.
        and handoff_body.rstrip("\n") == research_body.rstrip("\n")
        and 200 <= word_count(research_body) <= 500
        and 250 <= word_count(final_body) <= 600
        and research_first_bullet in final_body
        and research_publish["tool_args"] == {"artifacts": [{"path": "brief-studio/research.md"}]}
        and writer_publish["tool_args"] == {"artifacts": [{"path": "brief-studio/final-brief.md"}]}
        and research_publish_result["tool_result"]["success"] is True
        and writer_publish_result["tool_result"]["success"] is True
        and research_publish_result["tool_result"]["artifacts"][0]["runId"] == RESEARCHER_RUN
        and writer_publish_result["tool_result"]["artifacts"][0]["runId"] == WRITER_RUN
    ),
    "AC-039_publication_reconciliation_and_same_brief_browser_outcome": (
        len(app_revisions) == 2
        and {row["run_id"] for row in app_revisions} == {RESEARCHER_RUN, WRITER_RUN}
        and {row["producer_member_address"] for row in app_revisions} == {"/researcher", "/writer"}
        and app_brief["status"] == "in_review"
        and browser["briefId"] == BRIEF_ID
        and all(browser["assertions"].values())
        and research_text in browser["bodyText"]
        and final_text in browser["bodyText"]
    ),
}

join = {
    "schemaVersion": 1,
    "result": "PASS" if all(assertions.values()) else "FAIL",
    "brief": {
        "briefId": BRIEF_ID,
        "title": app_brief["title"],
        "finalStatus": app_brief["status"],
        "bindingId": binding["binding_id"],
        "teamRunId": TEAM_RUN,
    },
    "runtime": {
        "runtimeKind": tree["rootTeam"]["defaultLaunchConfiguration"]["runtimeKind"],
        "model": tree["rootTeam"]["defaultLaunchConfiguration"]["llmModelIdentifier"],
        "workspaceRootPath": tree["rootTeam"]["defaultLaunchConfiguration"]["workspaceRootPath"],
        "configuredToolNames": configured_expected,
    },
    "members": {
        "researcher": {
            "agentRunId": RESEARCHER_RUN,
            "platformAgentRunId": members["/researcher"]["platformAgentRunId"],
            "contextToolCallId": research_context["tool_call_id"],
            "nativePatchCallId": researcher_native["providerNativePatchResult"]["call_id"],
            "normalizedEditToolCallId": research_edit["tool_call_id"],
            "publishToolCallId": research_publish["tool_call_id"],
            "publicationRevisionId": research_publish_result["tool_result"]["artifacts"][0]["revisionId"],
            "publishedRelativePath": research_publish["tool_args"]["artifacts"][0]["path"],
            "resolvedAbsolutePath": research_publish_result["tool_result"]["artifacts"][0]["path"],
            "bodyWordCount": word_count(research_body),
        },
        "writer": {
            "agentRunId": WRITER_RUN,
            "platformAgentRunId": members["/writer"]["platformAgentRunId"],
            "contextToolCallId": writer_context["tool_call_id"],
            "nativePatchCallId": writer_native["providerNativePatchResult"]["call_id"],
            "normalizedEditToolCallId": writer_edit["tool_call_id"],
            "publishToolCallId": writer_publish["tool_call_id"],
            "publicationRevisionId": writer_publish_result["tool_result"]["artifacts"][0]["revisionId"],
            "publishedRelativePath": writer_publish["tool_args"]["artifacts"][0]["path"],
            "resolvedAbsolutePath": writer_publish_result["tool_result"]["artifacts"][0]["path"],
            "bodyWordCount": word_count(final_body),
        },
    },
    "handoff": {
        "messageId": handoff["messageId"],
        "createdAt": handoff["createdAt"],
        "markerExact": research_marker in handoff["content"],
        "relativePathExact": "Canonical artifact path: brief-studio/research.md" in handoff["content"],
        "completeResearchBodyVerbatimExcludingFileTerminalNewline": handoff_body.rstrip("\n") == research_body.rstrip("\n"),
        "writerContainsCompleteResearchFindingVerbatim": research_first_bullet in final_body,
    },
    "stateTransitionEvidence": {
        "contextReadWindow": {
            "researcherContextSucceededAtEpochSeconds": research_context["ts"],
            "writerContextSucceededAtEpochSeconds": writer_context["ts"],
            "statusBeforeResearchPublication": stable_before_research_publication["state"]["briefs"][0]["status"],
            "statusAfterResearchPublication": research_publication_state["state"]["briefs"][0]["status"],
        },
        "finalPublication": {
            "publishedAt": app_revisions[-1]["published_at"],
            "projectedAt": app_revisions[-1]["projected_at"],
            "statusAfterProjection": final_publication_state["state"]["briefs"][0]["status"],
        },
    },
    "browser": {
        "capturedAt": browser["capturedAt"],
        "hostUrl": browser["hostUrl"],
        "frameUrl": browser["frameUrl"],
        "assertions": browser["assertions"],
    },
    "assertions": assertions,
    "evidenceFiles": [
        "shipped-instruction-and-config-snapshot.json",
        "researcher-codex-native-session-events.json",
        "writer-codex-native-session-events.json",
        "researcher-raw-trace.jsonl",
        "writer-raw-trace.jsonl",
        "team-run-execution-tree.json",
        "team-communication-messages.json",
        "research.md",
        "final-brief.md",
        "final-db.json",
        "db-state-transitions.jsonl",
        "final-browser-observation.json",
        "final-browser-in-review.png",
    ],
}
write_json(EVIDENCE / "identity-trace-artifact-ui-join.json", join)

if not all(assertions.values()):
    failures = [name for name, passed in assertions.items() if not passed]
    raise SystemExit(f"Evidence synthesis failed: {failures}")

print(json.dumps({"result": join["result"], "assertions": assertions, "researchWords": word_count(research_body), "writerWords": word_count(final_body)}, indent=2))
