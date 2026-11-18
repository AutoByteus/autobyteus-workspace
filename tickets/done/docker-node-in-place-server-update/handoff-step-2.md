# Handoff — autobyteus-305: build step 2 (starter and server-packages volume)

- Package: `docker-node-in-place-server-update`; Task `autobyteus-305` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); requested by `/project_task_manager`.
- Result: `Architecture Design Complete` for the next build step. The design is unchanged: SR-005, reviewed `ARCH-REV-002` Pass. Classification: Large / High.
- State:
  - step 1 is finalized into `personal` (merge `eec6522b27`, `origin/personal` @ `77fb8bf2d1`);
  - the receipt is verified in `delivery-receipt-verification-step1.md` (SR-007).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update` @ `77fb8bf2d1` (= `origin/personal`), target `personal`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`

## Step 2 scope (design-spec.md, "Change / Refactor Sequence", step 2)

- Starter boot, recovery and cleanup, selection with `NEEDS_NEW_IMAGE`, and `ServerSupervisor` (DS-003, DS-007).
- The starter socket's status part (C2 `GET /status`, `cli.mjs status`).
- C1 GET `/rest/node-update`: version and `inPlaceUpdate` come from C2; starter presence from `AUTOBYTEUS_STARTER_SOCKET`.
- supervisord runs the starter.
- Launcher (bash and PowerShell): the `<node>-server-packages` volume, the config hash, and the IMAGE_REF → track table.
- `prisma-engine-discovery.docker.mjs` takes the server PID from `cli.mjs status`.
- Carried from step 1: CR-N1, code side (the "Check system level" error message), as `implementation-handoff.md` records.

## Approval basis and constraints

- Requirements: approved at SR-003 by the user (quote in requirements-doc.md).
- Prerequisites: PRQ-001 (autobyteus-284) is delivered. PRQ-002 (285, 287) is needed only for step 5.
- Constraints: as listed in `handoff-architecture-design-complete.md`. Never touch `autobyteus-server-0/1/2`. No release.

## Documents

- `handoff-step-2.md`
- `requirements-doc.md`
- `investigation-notes.md`
- `solution-revision-record.md`
- `design-spec.md`
- `delivery-receipt-verification-step1.md`
- `implementation-handoff.md`
- `follow-ups.md`

## Route record

- `get_handoff_rules` (2026-10-30): "Architecture Design Complete with … Large or … High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`.
- The review basis SR-005 (ARCH-REV-002 Pass) already covers step 2. The reviewer confirms it and routes step 2 to implementation.
- 2026-10-30: ARCH-REV-003 Pass; the reviewer routed step 2 to `/software_engineering_team/implementation_engineer`.
