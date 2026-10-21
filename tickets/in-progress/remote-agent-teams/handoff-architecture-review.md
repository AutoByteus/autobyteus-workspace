# Handoff — Architecture Design Complete: autobyteus-247 (remote Agent Teams)

- Result: `Architecture Design Complete`; `task_size: Large`, `architectural_risk: High` → independent architecture review
- Package: `remote-agent-teams`; Task **autobyteus-247**, part of **autobyteus-25**; requested by `/project_task_manager`; revision SR-005
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams`, branch `codex/remote-agent-teams`, base `origin/personal` `4a05909457` (1.5.8-beta.5; slice 1 and 245 included); finalization target `origin/personal`
- Ticket folder: `…/tickets/in-progress/remote-agent-teams/`

## What to review

- A shared Agent Team on a peer is delegated to like a local Team copy, with any member reachable and wakeable.
  - B hosts it as a top-level Team run with `delegatedFrom`.
  - A links it with `coordinatorAddress` and `members`.
  - Every message names its receiving root (`targetRoot`, both directions).
  - 245's rules apply (defaults, the temp workspace, auto-approve on for every member).
- The design resolves validation points G-1 … G-9 (`validation-cases.md`).
- The contract `collaboration_model.md` (CM-10 … CM-12, § 3) was updated in this branch with the user.

## Approval basis

- Requirements approved by the user, SR-002 (2026-10-21): any member, linked and wakeable; Teams before S3.
- The data model was refined with the user (SR-004).
- The user asked for validation rounds and then the handoff (SR-005).

## Risks

RSK-201 (auto-approve, accepted), RSK-301 (an unused Team run after a failure on A, accepted), RSK-302 (Stop through the idle schedule keeps the package).

## Documents

- `handoff-architecture-review.md`, `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `validation-cases.md`, `follow-ups.md`
- The contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams/autobyteus-server-ts/docs/design/collaboration_model.md`
- Prior review artifacts: N/A — not applicable (first review of this package)

## Route record

- `get_handoff_rules` (2026-10-21): "… Large or architectural_risk=High …" → `/software_engineering_team/architecture_reviewer`.

## Round 2 — 2026-10-21 (SR-006), answering ARCH-REV-001

| Finding | Resolution |
| --- | --- |
| AR-301 | `RemoteTeamIdleShutdown` is a quiet shutdown: the delegated-child arm/cancel signals; fire in the root's gate via `RootTeamRun.shutDownIfQuiet()`, which skips open child work and leases and reuses `TeamRunBackend.tryPrepareTerminationIfQuiescent()` (the Team-copy rule, all or nothing); the package is kept, no interrupt; unit cases, including a background task and a tool-approval wait |
| N-301 | `pairedAgentRunIds` is the single representation; `allowsSender`/`allowsTarget` derived |
| N-302 | The starter passes every planned member; a changed layout is refused (`AGENT_CANNOT_RUN`); a nested sub-team test |
| N-303 | A stored-link check before restoring an inactive root (`RemoteMessageReceiver`) |
