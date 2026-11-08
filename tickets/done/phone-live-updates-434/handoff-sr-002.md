# Handoff — autobyteus-434, SR-002: Architecture Design Complete

- Package: `phone-live-updates-434` (Project Task `autobyteus-434`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Result: `Architecture Design Complete`; `task_size: Medium`, `architectural_risk: High`
- Route (from `get_handoff_rules`, 2026-11-08): `/software_engineering_team/architecture_reviewer` (rule: Large or High risk → independent architecture review)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434`, branch `codex/phone-live-updates-434`, base `origin/personal` at `eebbc2b8ee` (v1.5.12-beta.8); finalization target `origin/personal`. No product code changed yet. The ticket documents are on disk in the ticket folder, not yet committed.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/`

## Original request and goal

The user's phone (Android app beta.7) showed a running Software Engineering Team member's conversation as not updating. Later his own message appeared at the end, after the agent's later tool calls. Find the cause, fix it, and prove that new events reach the phone without user action, also after the app was in the background and for a Team member. Constraints: no new Android permission; 403/416 untouched; isolated node and emulator for tests; no secrets or real machine/tailnet names; release only on the user's word.

## What was found (evidence in `investigation-notes.md`)

1. Not a 403/416 regression (node logs, allowed routes). The blog team runs on the desktop node.
2. At 7:44 there were no new events: the agent was inside a ~10-minute command (measured on the node). Live delay on the phone bundle is 46 ms.
3. Stall (reproduced, R3): after an outage of more than ~31 s the run stream gives up forever. Silent dead path (R4): never noticed, and re-open does not help.
4. Duplicate/order (reproduced, R6): external-runtime user messages are stored without `message_id`/`dedupe_key`. A view loading the run during that message's turn appends a second copy at the end.

## Approval basis

Requirements at SR-001 were approved by the Solution Designer within the Task's direction, with the user informed. The PM confirmed (2026-11-08) that the order bug stays in this ticket. The design adds no new behavior (SR-002).

## What the reviewer is asked to do

Independently review `design-spec.md` against `requirements-doc.md` (REQ-001, 002, 004, 005; AC-001…006):
- one `LiveStreamReconnectScheduler` replaces three retry copies, with `pageResumeSignal`;
- agent-run catch-up after a reconnect through `resynchronizeLiveAgentRun` (revision guards);
- Org and collaboration streams keep their error report on persistent failure;
- user raw-trace records gain identity, no migration.
Risk areas: lifecycle/timing of four streams, the re-sync race, additive persisted fields.

## Open items and risks

- ASM-001: Android WebView `visibilitychange` on background/screen-off, to be validated on the emulator.
- FU-001 (`follow-ups.md`): detecting a silently dead stream while the page stays visible needs a heartbeat. Out of scope; it is sent to the PM when the ticket leaves the team.
- Reproduction for implementation: `evidence/repro/phone-live-repro.mjs` (command in the design spec, Guidance For Implementation).

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `evidence/repro/phone-live-repro.mjs` (and run results in `evidence/repro-run-3..5/`).
