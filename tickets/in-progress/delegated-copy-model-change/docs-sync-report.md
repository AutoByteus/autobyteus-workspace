# Docs Sync Report

## Scope

- Ticket: `delegated-copy-model-change`, `task_size=Large`, `architectural_risk=High`, reviewed route (ARCH-REV-003, CRR-002, API-REV-001, CRR-003 all Pass).
- Trigger: the delivery package from `code_reviewer` after CRR-003 Pass (2026-10-13).
- Bootstrap base reference: `origin/personal` @ `a609de982a`.
- Integrated base reference used for docs sync: `origin/personal` @ `a609de982a`. It was re-fetched at delivery start and had not advanced, so no merge was needed.
- Post-integration verification reference: `release-deployment-report.md` → Integration Refresh.

## Why Docs Were Updated

- Summary: a delegated copy or collaborator can now be stopped on its own, from the sidebar or Settings, and its model changed while it is stopped. Its next message resumes it on the chosen model. The choice is recorded per instance.
  - The implementation documented the server contract (`agent_communication.md`), the record fields (`run_history.md`) and the Settings behavior (web `settings.md`).
  - Delivery checked these against the integrated source and fixed the remaining gaps: two stale "read-only" statements and an undocumented sidebar stop icon.
- Why this should live in long-lived docs: the stop semantics, the per-instance choice rule (`effectiveCopyAgentLaunch`), the `COPY_RUNNING` refusal and the record fields are lasting contracts for delegation, restore and Settings.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | New section "User Model Choice And Stop Of Copies And Collaborators" (implementation) | No change (verified) | It matches the GraphQL operations, `delegatedStopSet`, `TASK_EXECUTION_STOPPING`, `COPY_RUNNING`, live events and per-instance projection |
| `autobyteus-server-ts/docs/modules/run_history.md` | `userLaunchSelection` / `userTeamLaunchSelection` (implementation) | No change (verified) | Optional fields; `effectiveCopyAgentLaunch` is the single rule |
| `autobyteus-web/docs/settings.md` | "Collaborators and delegated copies" (implementation) | Updated by delivery | Copy cards were still described as read-only. They are locked while running and editable while stopped |
| `autobyteus-web/docs/agent_execution_architecture.md` | Workspaces tree delegated rows | Updated by delivery | Added the sidebar stop icon (`DelegatedStopButton`) and its scope |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `delegate_task` / `send_message_to` results | No change | Tool contracts are unchanged. A refused lease uses the existing `accepted: false` shape, documented in `agent_communication.md` |
| `autobyteus-web/docs/agent_teams.md`, `agent_orgs.md` | Launch forms | No change | Launch seeding is unchanged |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` header | TESTING.md wants the cases listed in the header | Updated by delivery | Added DCP-002..004 (non-blocking CRR-003 note) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Correction | The Team, member and Agent cards are "settings cards", locked while running and editable while stopped | They were still described as read-only |
| `autobyteus-web/docs/agent_execution_architecture.md` | Addition | The stop icon on delegated task-Agent and task-Team rows; it stops only that copy and its copies; Team child rows have none | Undocumented UI behavior |
| Probe header | Test documentation | DCP-002..004 case lines | TESTING.md probe header rule |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Stop of one copy | Interrupts the turn, releases like idle shutdown, stays restorable; stops the copies it started; unattributed older copies keep running | `design-spec.md` | `agent_communication.md` |
| Per-instance choice | Only model and settings; the started values are never changed; extra and teammate copies start on the started values | `requirements-doc.md` REQ-005, REQ-006 | `agent_communication.md`, `run_history.md` |
| Save concurrency | Saved only while every named copy is stopped, checked at one serialization point; otherwise `COPY_RUNNING` | `design-spec.md` | `agent_communication.md`, web `settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Collaborators and delegated copies … cannot be edited here" | Editable while stopped (SR-007) | web `settings.md` |
| Reset/undo of a copy choice (REQ-007, AC-008) | Removed in SR-007: the user picks the model again | web `settings.md` (Editing) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and the AC-010 user-verification hold.
