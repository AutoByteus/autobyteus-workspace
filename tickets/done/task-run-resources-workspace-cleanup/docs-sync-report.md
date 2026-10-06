# Docs Sync Report — task-run-resources-workspace-cleanup

## Scope

- Ticket: `task-run-resources-workspace-cleanup`. `task_size=Large`, `architectural_risk=High`, reviewed route. Covers SR-001–SR-009, ARCH-REV-001–004, IR-001–IR-004, CRR-001–CRR-006 and API-REV-003.
- Trigger: the delivery package from `/code_reviewer`, after the CRR-006 test-code review Pass (2026-10-06).
- Bootstrap base reference: `origin/personal@5c74fed71`.
- Integrated base reference used for docs sync: `origin/personal@db39803d4`, merged as `27d7e12bf` on top of delivery checkpoint `a3c3abec5`.
- Post-integration verification reference: `delivery-evidence/` (server build, affected server suites, gated server E2E, the `test:e2e:task-closure-tree` probe and web closure suites).

## Why Docs Were Updated

- Summary: closed Task runs now leave the Workspaces tree. Two web docs said delegated children "never leave the tree". The Team doc had no closure note, and `TESTING.md` did not list the two durable checks this ticket added.
- Why this should live in long-lived project docs: closure is a lasting part of the tree's contract on the wire and in the UI. Future changes to the tree, selection or stream handling must preserve it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `TESTING.md` § Project Task Agent Run Resources… | Code review asked for the new probe and the gated E2E | Updated | Commands, gating, what each covers, rebuild and cleanup notes |
| `autobyteus-web/docs/agent_execution_architecture.md` | It said "Delegated children never leave the tree" | Updated | Corrected, and a "Task closure" paragraph added (wire, owners, motion, selection, preservation, surface limits) |
| `autobyteus-web/docs/settings.md` | Holds the same text as above | Updated | Same changes |
| `autobyteus-web/docs/agent_teams.md` | Team delegation paragraph | Updated | Closure note for the Team root, including the members panel, running list and token usage residual |
| `autobyteus-web/docs/agent_orgs.md` | Org closure | No change (IR-004) | Already accurate |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Area contract required by DESIGN.md | No change (IR-004, DOC-001) | Already accurate |
| `autobyteus-server-ts/docs/modules/agent_communication.md`, `standalone_agent_run_root.md` | Root events and stored reads | No change (IR-004) | Already accurate |
| `autobyteus-server-ts/docs/modules/run_file_changes` and related (base ticket) | Base integration touched the supervisor | No change | The base delivery owns them; no closure interaction |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | Test path | Gated `task-closure-root-visibility.e2e.test.ts` and `pnpm -C autobyteus-web test:e2e:task-closure-tree`, with commands and coverage | Make the durable checks findable |
| `autobyteus-web/docs/agent_execution_architecture.md` | Behavior correction and new section | Idle shutdown keeps rows; Task DONE removes them. The closure contract and owners (`taskExecutionClosure.ts`, row builders, `useLeavingTreeRows`/`treeRowLeave.css`) | REQ-001–REQ-009 |
| `autobyteus-web/docs/settings.md` | Same as above | Same | Same |
| `autobyteus-web/docs/agent_teams.md` | Behavior note | Team-root closure: `TASK_EXECUTIONS_CLOSED` before stop, `closed_task_executions` in the snapshot and resume config, Manager hand-off, messages kept, other Team surfaces unchanged | REQ-001–REQ-009, the accepted REQ-009 scope residual |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Closure beside an unfiltered tree | The execution tree is never filtered. `closed_task_executions` is a separate fact, and only the Workspaces tree and main view apply it | `design-spec.md`, `implementation-handoff.md` | web architecture, settings and Team docs; server protocol doc |
| Close-before-stop ordering | The closed event comes before the stop frames, and visibility does not depend on stop success | `requirements-doc.md` REQ-003 | same |
| Durable closure checks | The gated server E2E and the browser probe, and how to run them | `api-e2e-execution-coverage-report.md` | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Delegated children never leave the tree" | Idle shutdown keeps them; Task DONE removes them from the tree | `agent_execution_architecture.md`, `settings.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and release notes, then explicit user verification.
- Notes: the docs were edited only after the integrated state passed its checks.
