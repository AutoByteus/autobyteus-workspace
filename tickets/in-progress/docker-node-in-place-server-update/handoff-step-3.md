# Handoff — autobyteus-305: build step 3 (in-place update by command)

- Package: `docker-node-in-place-server-update`; Task `autobyteus-305` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); requested by `/project_task_manager`.
- Result: `Architecture Design Complete`. The design is at SR-009: SR-005, reviewed `ARCH-REV-002`/`ARCH-REV-003` Pass, plus the step-3 delta below. Classification: Large / High.
- State:
  - steps 1 and 2 are finalized into `personal` (merges `eec6522b27`, `a0f4b491f7`; `origin/personal` @ `6b34f900b6`);
  - the receipts are verified (`delivery-receipt-verification-step1.md`, `delivery-receipt-verification-step2.md`).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update` @ `6b34f900b6`, target `personal`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`

## Step 3 scope (design-spec.md, "Change / Refactor Sequence", step 3)

- `UpdateService`, `UpdateRun` (DS-006), `ReleaseSource`, `PackageVerifier`, `SelfCheck`, `DataCopy`, `UpdateStatus`.
- The socket `POST /updates` and `cli.mjs update`.
- The launcher `update` command, in bash and PowerShell, with the IMAGE_REF → track table.

## Delta reviewed in this round (SR-009, from the step-2 delivery)

- **RU-23:** the `NO_PACKAGES_VOLUME` gate in `UpdateService`, applied when `/home/autobyteus/server-packages` is not its own mount (`/proc/self/mountinfo`).
  - C2/C1 status gets the optional `updateBlocker { code, message }`, an additive change under the frozen-contract rule.
  - The step-3 release notes tell launcher users to reinstall the launcher.
- **CR2-N1:** the launcher `status` shows the starter's state from `cli.mjs status`.

## Proof

AC-001..AC-006, AC-008, AC-012, AC-013, on a real Docker node built from a clean clone, with a test key and a local release source. The tests listed in step 3 of the design, plus `NO_PACKAGES_VOLUME`.

## Constraints

As in `handoff-architecture-design-complete.md`. Never touch `autobyteus-server-0/1/2`. No release.

## Documents

- `handoff-step-3.md`
- `requirements-doc.md`
- `investigation-notes.md`
- `solution-revision-record.md`
- `design-spec.md`
- `delivery-receipt-verification-step2.md`
- `implementation-handoff.md`
- `follow-ups.md`

## Route record

- `get_handoff_rules` (2026-10-30): the Large/High rule → `/software_engineering_team/architecture_reviewer`.
- 2026-10-30: ARCH-REV-004 Pass; the reviewer routed step 3 to `/software_engineering_team/implementation_engineer` (notes N-2, N-3).
