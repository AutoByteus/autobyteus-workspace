# Docs Sync Report

## Scope

- Ticket: collaboration-model-contract (Project Task 259ddae7)
- Trigger: post-API/E2E, post-test-code-review delivery (CRR-003 pass; API-REV-001 94%)
- Bootstrap base reference: `origin/personal` @ `8878625d94`
- Integrated base reference used for docs sync: `8878625d94` (no advance; branch already current)
- Post-integration verification reference: not needed, no new base commits

## Why Docs Were Updated

- Summary: collaboration was rewritten to one model (delegate outside the run, message inside; messaging never creates a run; collaborators removed). The implementation published `docs/design/collaboration_model.md` and rewrote the affected module and web docs in commit `5dd930d8be`. Delivery verified them against the final state.
- Why this should live in long-lived project docs: agent authors and future designers read these as the contract (`DESIGN.md` now requires it).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/design/collaboration_model.md | AC-009 canonical model | No change | Section 5 status table matches the delivered state (CM-1..CM-7 hold; CM-8/CM-9 are targets of Task 8641c0ac) |
| DESIGN.md, autobyteus-server-ts/docs/design/README.md | Link and requirement to follow the model | No change | Present |
| 14 server module docs (agent_communication, agent_orgs, agent_team_execution, standalone_agent_run_root, agent_tools, run_history, projects, prompt_engineering, token_usage, agent_definition, agent_execution, agent_team_definition, agent_memory, README) | Rewritten by implementation | No change | Consistent with the final state; the remaining "collaborator" mentions are the intentional conversion notes |
| 8 web docs (chat, agent_teams, agent_orgs, settings, agent_execution_architecture, projects, token_meter, agent_artifacts) | Rewritten by implementation | No change | Consistent |
| autobyteus-server-ts/docs/modules/agent_execution.md | Link check over all changed docs | Updated | Dead anchor, see below |
| TESTING.md | Two rules added by API/E2E (synthesized migration data; macOS signed-in CLI environment) | No change | Kept as written; committed separately as `docs(testing)` |

A relative-link and anchor check over every changed markdown file found one dead anchor.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/agent_execution.md | Correction | `agent_orgs.md#readiness-and-runtime-catalog-failure` -> `#readiness` (line 202) | The target heading is "Readiness". The anchor was already dead on the base, and the file was touched by this change. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One collaboration model | Membership vs delegation, messaging resolve-only, Task ownership, coordination, storage | requirements-doc.md, design-spec.md | docs/design/collaboration_model.md |
| Collaborator-to-delegated-run conversion | Startup migration, idempotency, preserved-tree warnings, downgrade note | design-spec.md, implementation-handoff.md | run_history.md, agent_communication.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Collaborators (bring-in by `send_message_to`) and Task helper copies | `delegate_task` copies, reached by run ID | collaboration_model.md, agent_communication.md |
| Teammate copies via `delegate_task` | Refusal with guidance to message the teammate | collaboration_model.md, agent_team_execution.md |
| `collaborators` key in stored Team/Org trees | `taskExecutions` entries via the startup migration | run_history.md |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification, archive, finalization
- Notes: memory-sync imports (`memory/imports/...`) are deliberately not migrated. This is recorded as an upgrade note in release-notes.md. OBS-T1 and OBS-T2 (test notes) are non-blocking and not taken.
