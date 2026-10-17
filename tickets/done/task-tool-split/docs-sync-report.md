# Docs Sync Report

## Scope

- Ticket: task-tool-split (Project Task ee74d72b)
- Trigger: post-API/E2E, post-test-code-review delivery (CRR-002 pass; API-REV-001 94%)
- Bootstrap base reference: `35eacddb25` (`origin/personal`)
- Integrated base reference used for docs sync: `35eacddb25` (no advance; branch already current)
- Post-integration verification reference: not needed, no new base commits (see release-deployment-report.md)

## Why Docs Were Updated

- Summary: `create_or_update_task` was split into `create_task` and `update_task`. The implementation already updated the canonical tool contract (projects.md "Exactly Five Agent Tools"). The heading anchor changed from `#exactly-four-agent-tools` to `#exactly-five-agent-tools`, which left three dead links and two stale "four tools" counts (OBS-001).
- Why this should live in long-lived project docs: the links and counts are read as the authoritative tool contract by agent authors and MCP integrators.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/projects.md | Canonical Project/Task tool contract | Updated | Contract table already carries `create_task`/`update_task` (implementation); line 40 count fixed |
| autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md | MCP reserved-name policy and anchors | Updated | Count and two anchors fixed |
| autobyteus-web/docs/projects.md | Links to the server tool contract | Updated | Anchor fixed |
| autobyteus-server-ts/docs/modules/application_orchestration.md, applications.md, autobyteus-web/docs/electron_packaging.md | Matched "exactly four" grep | No change | Unrelated counts |
| autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts | Remaining `create_or_update_task` string | No change | Intentional parse-only recognizer for previous-release notes (AC-008); never composed |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md | Correction | "four Project/Task tools" -> "five" (l.201); `#exactly-four-agent-tools` -> `#exactly-five-agent-tools` (l.341, l.354) | Match the renamed heading and the five tools |
| autobyteus-server-ts/docs/modules/projects.md | Correction | l.40 "four" -> "five" Project/Task tools | Match the five-tool contract |
| autobyteus-web/docs/projects.md | Correction | l.425 anchor -> `#exactly-five-agent-tools` | Dead link |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Split task tools, no auto-added task tool, closing guidance on `update_task` description | Tool contract, missing-tool behavior, MCP name reservation | design-spec.md, implementation-handoff.md | projects.md, agent_tools_mcp_server.md (promoted during implementation; verified here) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `create_or_update_task` (no alias) | `create_task`, `update_task` | projects.md "Exactly Five Agent Tools" (removed-name note at l.56) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification judgement, ticket archive, finalization
- Notes: `grep` for `exactly-four` and `four Project` over server/web docs returns nothing after the edits. OBS-002 (optional test assertion) not taken: non-blocking, outside delivery scope.
