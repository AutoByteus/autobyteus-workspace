# Docs Sync Report — `reactivate-done-task-runs`

## Scope

- Ticket: `reactivate-done-task-runs` (SR-002, Approved). Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed (ARCH-REV-002 → IR-001 → CRR-001 → API-REV-001 → CRR-002).
- Trigger: CRR-002 Pass from `/code_reviewer` (validated package ready for delivery).
- Bootstrap base reference: `origin/personal@cfeda548b`.
- Integrated base reference used for docs sync: `origin/personal@cfeda548b`. It was re-fetched at the start of delivery (2026-10-07), had not advanced, and is an ancestor of the ticket branch.
- Post-integration verification reference: no new base commits, so no integration rerun was required. A delivery smoke run on the docs-synced tree passed: 4 files / 37 tests (`ad-hoc-tasks`, `task-agent-resource-reactivation`, `root-task-reactivation`, `task-reactivation-backends`). `node --check` passed on both browser probes. See `release-deployment-report.md`.

## Why Docs Were Updated

- Summary:
  - The implementation commit `3394e7078` already rewrote the main docs. That includes the new **Reactivation** section in `projects.md`, `target_kind`, and the removal of the "closed is forever" and "unless its Task is DONE" wording.
  - Delivery reviewed every long-lived doc that describes Task closure or the closure wire events.
  - Five docs still listed only `task_executions_closed` / `TASK_EXECUTIONS_CLOSED`. They described the closed set as growing only, which stopped being true with this change. Delivery added the reopened event to each.
  - Two test-file comments still said closure is permanent. Delivery corrected those comments; no behavior changed.
- Why this should live in long-lived project docs:
  - `agent_websocket_streaming_protocol.md` is the area contract for Team stream messages. A precedent finding (DOC-001, `task-run-resources-workspace-cleanup`) requires every Team server message type to be listed there.
  - The web architecture and Org docs describe the closed-set rule that clients apply. A reader would otherwise conclude that rows can never return.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | DONE rules, resource file `closedAt`, new Reactivation section | No change (updated in `3394e7078`) | Checked against the code. The refusal table matches the codes in `project-errors.ts` and the lifecycle. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | `delegate_task` result shape, closed-record rules | No change (updated in `3394e7078`) | `target_kind` union is correct. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Run-ID path, closed-sender/recipient fence, closure events | No change (updated in `3394e7078`) | Lists `task_executions_reopened`. |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Agent-facing collaboration text | No change (updated in `3394e7078`) | Matches the hash-pinned LLM contract. |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Agent-root DONE text, collaboration stream event list | **Updated** | Event list lacked `task_executions_reopened`. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Team stream area contract | **Updated** | `TASK_EXECUTIONS_REOPENED` was missing from the message list and the closure subsection. |
| `autobyteus-web/docs/agent_teams.md` | Team-root closure in the tree | No change (updated in `3394e7078`) | — |
| `autobyteus-web/docs/chat.md` | `@` delegation row lifecycle | No change (updated in `3394e7078`) | — |
| `autobyteus-web/docs/projects.md` | Project Task status and runs | No change (updated in `3394e7078`) | — |
| `autobyteus-web/docs/agent_orgs.md` | Org-root closure | **Updated** | Only the live closed event was mentioned. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Shared closure rule (`taskExecutionClosure.ts`) | **Updated** | Did not mention `removeReopenedTaskExecutions` or reactivation. |
| `autobyteus-web/docs/settings.md` | Contains the same Task-closure paragraph as above | **Updated** | Kept consistent with `agent_execution_architecture.md`. Its odd placement is pre-existing and out of scope. |
| `TESTING.md` | Test layers and commands | No change (updated in `3394e7078` and the API/E2E round, CRR-002 reviewed) | — |
| `autobyteus-server-ts/tests/unit/projects/ad-hoc-tasks.test.ts` (comment) | Leftover "Closed is forever" comment | **Updated** (comment only) | Assertion unchanged. The suite passes. |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (header comment) | "leaves the tree for good" | **Updated** (comment only) | `node --check` passes. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Area contract | Adds `TASK_EXECUTIONS_REOPENED {change_sequence, task_executions}` to the Team-only events and the closure subsection. Covers the same payload as closed, published after the Task-side commit and before delivery, how clients remove it from the closed set, helpers staying hidden, and snapshot/stored-read consistency. | Wire contract completeness (DOC-001 precedent) |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Event list | Adds `task_executions_reopened` to the collaboration stream events | Wire event completeness |
| `autobyteus-web/docs/agent_orgs.md` | Behavior note | Adds the live `task_executions_reopened` event: the row is listed again and helpers stay hidden | REQ-008 for the Org root |
| `autobyteus-web/docs/agent_execution_architecture.md` | Architecture note | Reactivation reverses closure for one execution via `removeReopenedTaskExecutions`, live, with snapshots and stored reads following | Describes the replaced monotonic closed-set assumption |
| `autobyteus-web/docs/settings.md` | Architecture note (duplicate paragraph) | Same as above | Consistency |
| Two test comments | Comment wording | Removed "closed is forever" / "for good" | Remove obsolete understanding |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Reactivation contract | Agent-owned status. Reopen first, then the assigner messages the ingress run ID. Covers eligibility, the serialized runtime step, the Task-side commit, the publish, delivery, and the refusal table. | design-spec.md DS-001/DS-L1, implementation-handoff.md | `autobyteus-server-ts/docs/modules/projects.md#reactivation` (implementation commit) |
| Reopened wire event | Same reference shape as closed. Clients remove it from the closed set. | design-spec.md, contracts | `agent_websocket_streaming_protocol.md`, `agent_communication.md`, `standalone_agent_run_root.md`, web docs |
| `target_kind` | `delegate_task` success says `agent` or `team`. The run ID stays the only messaging handle. | requirements REQ-010 | `agent_team_execution.md`, `prompt_engineering.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Closed is forever" / "DONE closes runs for good" | Closed until the assigner's reactivation after the Task leaves DONE. A deleted Task's work stays closed. | `projects.md` (DONE §3, `closedAt` row, Reactivation) |
| Monotonic client closed set (merge-only) | `mergeClosedTaskExecutions` + `removeReopenedTaskExecutions` | `autobyteus-web/docs/agent_execution_architecture.md`, `settings.md` |
| Facades wrapping the run-ID path in a bare `withLiveLease` | `RootTaskExecutionLifecycle.deliverToExactTarget` | `agent_communication.md`, `projects.md#reactivation` |

## No-Impact Decision

- Not applicable: docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and release notes, then hold for explicit user verification.
- Notes: The external agent repository's `project-task-management` skill text about DONE is outside this repository. It is recorded as a follow-up, not a docs-sync blocker.
