#!/usr/bin/env python3
"""Re-evaluate immutable API-REV-005 business evidence under SR-010.

This never rewrites the historical API-REV-005 result. Provider operation labels
are retained as diagnostics and deliberately excluded from acceptance.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "api-rev-005"
OUTPUT = HERE / "current-oracle-identity-artifact-ui-join.json"


def load_json(name: str):
    return json.loads((SOURCE / name).read_text())


def load_jsonl(name: str):
    return [json.loads(line) for line in (SOURCE / name).read_text().splitlines() if line.strip()]


def marker(context: dict) -> str:
    payload = {
        "briefId": context["briefId"],
        "title": context["title"],
        "observedStatus": context["status"],
    }
    return "Brief context: " + json.dumps(payload, separators=(",", ":"), ensure_ascii=False)


def paired_success(records: list[dict], call_id: str, tool_name: str) -> bool:
    calls = [r for r in records if r.get("trace_type") == "tool_call" and r.get("tool_call_id") == call_id]
    results = [r for r in records if r.get("trace_type") == "tool_result" and r.get("tool_call_id") == call_id]
    return (
        len(calls) == 1
        and len(results) == 1
        and calls[0].get("tool_name") == tool_name
        and results[0].get("tool_name") == tool_name
        and results[0].get("source_event") == "TOOL_EXECUTION_SUCCEEDED"
        and results[0].get("tool_error") is None
    )


legacy = load_json("clean-identity-trace-artifact-ui-join.json")
tree = load_json("clean-team-run-execution-tree.json")
messages = load_json("clean-team-communication-messages.json")
browser = load_json("clean-final-browser-observation.json")
research_publications = load_json("clean-researcher-published-artifacts.json")
writer_publications = load_json("clean-writer-published-artifacts.json")
research_trace = load_jsonl("clean-researcher-raw-trace.jsonl")
writer_trace = load_jsonl("clean-writer-raw-trace.jsonl")
research = (SOURCE / "clean-research.md").read_text()
final_brief = (SOURCE / "clean-final-brief.md").read_text()
hash_verification = json.loads((HERE / "maintained-input-hash-verification.json").read_text())
no_delta_log = (HERE / "current-state-no-executable-delta.log").read_text()
lifecycle_log = (SOURCE / "current-lifecycle-topology-matrix.log").read_text()

manifest_entries = []
for line in (SOURCE / "sha256sums.txt").read_text().splitlines():
    expected, relative = line.split("  ", 1)
    path = SOURCE / relative.removeprefix("./")
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    manifest_entries.append(actual == expected)

committed_non_ticket = no_delta_log.split(
    "Committed non-ticket files d26ad181e..HEAD (must be empty):\n", 1
)[1].split("\nUncommitted files:\n", 1)[0].strip()
uncommitted_production = no_delta_log.split(
    "Uncommitted production src and maintained Brief inputs (must be empty):\n", 1
)[1].strip()

members = {m["address"]: m for m in tree["rootTeam"]["members"]}
research_member = members["/researcher"]
writer_member = members["/writer"]
workspace_root = Path(research_member["launchConfiguration"]["workspaceRootPath"])

research_context = legacy["members"]["researcher"]["contextResult"]
writer_context = legacy["members"]["writer"]["contextResult"]
research_marker = marker(research_context)
writer_marker = marker(writer_context)

research_calls = [r for r in research_trace if r.get("trace_type") == "tool_call"]
writer_calls = [r for r in writer_trace if r.get("trace_type") == "tool_call"]
research_context_calls = [r for r in research_calls if r.get("tool_name") == "get_brief_context"]
writer_context_calls = [r for r in writer_calls if r.get("tool_name") == "get_brief_context"]
research_publish = next(r for r in research_calls if r.get("tool_name") == "publish_artifacts")
writer_publish = next(r for r in writer_calls if r.get("tool_name") == "publish_artifacts")

handoff = next(m for m in messages["messages"] if m["messageType"] == "research-handoff")
handoff_prefix = research_marker + "\n\nArtifact path: brief-studio/research.md\n\n"
research_body = research[len(research_marker):].lstrip("\n")
handoff_body = handoff["content"][len(handoff_prefix):]

research_publication = research_publications["revisions"][0]
writer_publication = writer_publications["revisions"][0]
research_path = Path(research_publication["path"])
writer_path = Path(writer_publication["path"])

stable_assertions = {
    key: value
    for key, value in legacy["assertions"].items()
    if not key.startswith("AC-039_")
}

acceptance_checks = {
    "apiRev005EvidenceIntegrityVerified": bool(manifest_entries) and all(manifest_entries),
    "noExecutableOrMaintainedInputDelta": not committed_non_ticket and not uncommitted_production,
    "maintainedInputsByteIdentical": hash_verification["allHashesMatch"],
    "maintainedInputsOperationAgnostic": hash_verification["allMaintainedTextOperationAgnostic"],
    "legacyBusinessAssertionsRemainTrue": all(stable_assertions.values()) and len(stable_assertions) == 7,
    "researcherContextFirstExactlyOnce": len(research_context_calls) == 1 and research_calls[0] == research_context_calls[0],
    "writerContextFirstExactlyOnce": len(writer_context_calls) == 1 and writer_calls[0] == writer_context_calls[0],
    "researcherContextPairedSuccess": paired_success(research_trace, legacy["members"]["researcher"]["contextCallId"], "get_brief_context"),
    "writerContextPairedSuccess": paired_success(writer_trace, legacy["members"]["writer"]["contextCallId"], "get_brief_context"),
    "researchMarkerExact": research.startswith(research_marker + "\n"),
    "writerMarkerExact": final_brief.startswith(writer_marker + "\n"),
    "researchPublicationRelativeExact": research_publish["tool_args"] == {"artifacts": [{"path": "brief-studio/research.md"}]},
    "writerPublicationRelativeExact": writer_publish["tool_args"] == {"artifacts": [{"path": "brief-studio/final-brief.md"}]},
    "researchPublicationResolvesInMemberWorkspace": research_path == workspace_root / "brief-studio/research.md",
    "writerPublicationResolvesInMemberWorkspace": writer_path == Path(writer_member["launchConfiguration"]["workspaceRootPath"]) / "brief-studio/final-brief.md",
    "researchPublicationProducerExact": research_publication["runId"] == research_member["agentRunId"] == legacy["members"]["researcher"]["agentRunId"],
    "writerPublicationProducerExact": writer_publication["runId"] == writer_member["agentRunId"] == legacy["members"]["writer"]["agentRunId"],
    "bindingExact": tree["applicationBinding"]["bindingId"] == legacy["brief"]["bindingId"],
    "applicationIdentityPresent": bool(tree["applicationBinding"]["applicationId"]),
    "handoffIdentityExact": handoff["senderAgentRunId"] == research_member["agentRunId"] and handoff["receiverAgentRunId"] == writer_member["agentRunId"],
    "handoffMarkerPathAndCompleteBodyExact": handoff["content"].startswith(handoff_prefix) and handoff_body == research_body.rstrip("\n"),
    "writerVerbatimResearchUse": legacy["content"]["writerVerbatimBullet"] in research and legacy["content"]["writerVerbatimBullet"] in final_brief,
    "writerNoCrossMemberRead": not any(r.get("tool_name") == "read_file" for r in writer_calls),
    "browserAllSemanticAssertionsTrue": all(browser["assertions"].values()) and len(browser["assertions"]) == 10,
    "browserSameBrief": browser["briefId"] == legacy["brief"]["briefId"],
    "finalBusinessStateInReview": legacy["brief"]["status"] == "in_review",
    "currentLifecycleEvidencePassed": "Test Files  21 passed (21)" in lifecycle_log and "Tests  178 passed (178)" in lifecycle_log,
}

diagnostic_checks = {
    "researcherObservedFoundationCallPairedSuccess": paired_success(research_trace, legacy["members"]["researcher"]["shellCallIds"][0], "run_bash"),
    "writerObservedFoundationCallPairedSuccess": paired_success(writer_trace, legacy["members"]["writer"]["shellCallIds"][0], "run_bash"),
}

current_assertions = {
    **stable_assertions,
    "AC-039_authorized_foundation_operation_and_authoritative_business_join": all(acceptance_checks.values()),
    "AC-040_deterministic_tokenless_headerless_listener": acceptance_checks["noExecutableOrMaintainedInputDelta"] and acceptance_checks["currentLifecycleEvidencePassed"],
    "AC-041_same_url_fresh_restore_current_state": acceptance_checks["noExecutableOrMaintainedInputDelta"] and acceptance_checks["currentLifecycleEvidencePassed"],
    "AC-042_general_null_application_exact_capability": acceptance_checks["noExecutableOrMaintainedInputDelta"] and acceptance_checks["currentLifecycleEvidencePassed"],
    "AC-043_application_lane_quiesce_session_liveness": acceptance_checks["noExecutableOrMaintainedInputDelta"] and acceptance_checks["currentLifecycleEvidencePassed"],
    "AC-044_exact_deactivation_shutdown_ownership": acceptance_checks["noExecutableOrMaintainedInputDelta"] and acceptance_checks["currentLifecycleEvidencePassed"],
}

result = {
    "schemaVersion": 2,
    "apiRevision": "API-REV-006",
    "oracle": "SR-010 / ARCH-REV-010 / corrected AC-039",
    "sourceExecution": "API-REV-005 authoritative clean supported-browser journey",
    "historicalSourceResultPreserved": "API-REV-005 Fail / 96.4% under superseded zero-shell oracle",
    "result": "PASS" if all(current_assertions.values()) else "FAIL",
    "brief": legacy["brief"],
    "runtime": legacy["runtime"],
    "members": legacy["members"],
    "acceptanceChecks": acceptance_checks,
    "diagnosticChecks": diagnostic_checks,
    "assertions": current_assertions,
    "operationDiagnostics": {
        "acceptanceAuthority": False,
        "researcher": {"tool": "run_bash", "callIds": legacy["members"]["researcher"]["shellCallIds"]},
        "writer": {"tool": "run_bash", "callIds": legacy["members"]["writer"]["shellCallIds"]},
        "classification": "Allowed already-authorized runtime foundation operation; diagnostic only",
        "excludedFromAcceptanceDecision": True,
    },
    "evidenceIntegrity": {
        "apiRev005ManifestSha256": hashlib.sha256((SOURCE / "sha256sums.txt").read_bytes()).hexdigest(),
        "maintainedInputVerification": "maintained-input-hash-verification.json",
        "sourceJoin": "../api-rev-005/clean-identity-trace-artifact-ui-join.json",
    },
}

OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"result": result["result"], "acceptanceChecks": acceptance_checks, "diagnosticChecks": diagnostic_checks, "assertions": current_assertions}, indent=2))
if result["result"] != "PASS":
    raise SystemExit(1)
