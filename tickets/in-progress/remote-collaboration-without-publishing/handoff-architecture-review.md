# Handoff — Architecture Design Complete: autobyteus-245 (remote collaboration without publishing)

- Result: `Architecture Design Complete`; `task_size: Medium`, `architectural_risk: High` → independent architecture review
- Package: `remote-collaboration-without-publishing`; Task **autobyteus-245**, part of **autobyteus-25**; requested by `/project_task_manager`; revision SR-004
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-collaboration-without-publishing`, branch `codex/remote-collaboration-without-publishing`, base `origin/personal` `786055f3d7` (includes slice 1, merge `d51ef843f6`); finalization target `origin/personal`
- Ticket folder: `…/tickets/in-progress/remote-collaboration-without-publishing/`

## What to review

- The user's direction (2026-10-21): no publishing; every shared Agent (and, through autobyteus-247, Agent Team) is automatically available to registered peers. Remote runs use the target's default runtime and model, or the delegation is refused with "There is no default runtime configured for the target agent …"; they use the temp workspace and auto-approve on.
- Design:
  - B resolves the target through `CollaboratorAdmission.catalogTaskSource` with a new `NodeCatalogPort` (no run; launch base `defaults_only`).
  - `CollaboratorLaunchResolver` gains a launch base (`inherited` unchanged).
  - `CollaboratorNoDefaultLaunchError`.
  - The contract field `address`; refusal codes.
  - Removal of the publish subsystem, GraphQL, web, tests and docs.

## Approval basis

Requirements `Approved` by the user, SR-002/SR-003 (2026-10-21), quoted in `requirements-doc.md`.
- DEC-202: the temp workspace (a definition default workspace is FU-001, sent).
- DEC-203: auto-approve always on.
- DEC-204: no migration (publishing never shipped).
- DEC-205: 245, then 247 (Teams).

## Risks

- RSK-201 (auto-approve on; accepted by the user).
- The shared resolver mode must leave `inherited` byte-for-byte unchanged (escalation trigger).

## Documents

- `handoff-architecture-review.md` (this file), `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `follow-ups.md`
- Prior review artifacts: N/A — not applicable (first review of this package). The slice 1 package is archived at `origin/personal:tickets/done/cross-node-agent-communication/` for context.

## Route record

- `get_handoff_rules` (2026-10-21): "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
