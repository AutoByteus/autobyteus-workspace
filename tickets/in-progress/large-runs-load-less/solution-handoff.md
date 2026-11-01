# Solution Handoff — `large-runs-load-less`

- Result: **Architecture Design Complete** (SR-001), `task_size=Large`, `architectural_risk=High`.
- Origin: Project Task `autobyteus-358` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`) from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-11-01. Eight older Tasks merged: 151, 152, 118, 156, 162, 163, 161, 200.

## Request summary

Make large runs load less and open faster. Check each merged item against the current code, drop what is fixed or not worth it (the user's rule), and fix the rest as one change where they share a cause. Measure before and after on test-owned large data. No release unless asked. Other teams work in parallel on 318, 345, 357, 285, 337 and 355: keep to this area.

## Decisions (requirements-doc "Merged Items")

- **Kept:**
  - 151: team and org members on demand, with one shared member loader;
  - 152: messages only when shown, for hubs, team and org runs;
  - 162: one view read per hub click;
  - 156: structure-only readiness scan;
  - 163: the long unbroken-token freeze.
- **Dropped, with evidence:**
  - 161 already fixed (252 of 252 messages live);
  - 200 not worth it now (1.3 s on Docker at 20,000 Tasks; the user has 458);
  - 118 no real cost (47 ms for 300 task agents).

## Approval

The Solution Designer approved within the direction. The user's rule, relayed 2026-11-01, lets this role decide and drop items. The user was informed in the conversation ("go ahead"), and asked to look at the functionality behind each performance problem. No `Needs user` decision: DEC-001 keeps the display unchanged.

## Classification evidence

- Shared view contracts change for every root kind, live and stored.
- Message completeness under live append is an invariant.
- The readiness admission changes the startup safety boundary (DESIGN.md rule 7).
- About 40–60 files.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/solution-revision-record.md`
- Evidence: `evidence/M-*` (before measurements, the CPU profile) and `evidence/probes/*.mjs`.

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less`, branch `codex/large-runs-load-less`.
- Base `origin/personal` @ `efd28d5c4a6c867ee1674a6f1a5e98585ddf2ea9`; target `origin/personal`.
- No source changes; the ticket docs are uncommitted.
- Test-owned seed at `/tmp/ab358-seed`, to be removed after the after-measurements.

## Open risks

- The remote-run case of the Team tab (design Risks).
- Ordering under bursts.
- QR-004 depends on the measured cause (escalation trigger, DEC-001 b).
- Measurements run beside other teams' work; the load average is recorded.

## Next expected action

Independent architecture review, then implementation per the Change / Refactor Sequence.

## Route applied

`get_handoff_rules` (2026-11-01): Large/High → `/software_engineering_team/architecture_reviewer`.

## SR-002 Revision (after ARCH-REV-001, 2026-11-01)

- **AR-001:**
  - Inspections read and validate the tree only. The view snapshots (`StandaloneRootPackageSnapshot`, org, team stream) drop `messages`.
  - Per-root records owners validate tree plus log: the hub gets a new `getCollaborationRecordsSnapshot`; the org one gains the validation now in `agent-org-run-manager.ts:189-197`; the team one exists.
  - The participant query, reference content (`agent-org-reference-content-service.ts`, `agent-collaboration-references.ts`, `team-communication.ts`) and resume read through them.
  - A damaged log fails only those reads; the view opens.
- **AR-002:**
  - Buffering starts before the request.
  - Merge by message ID; `baseChangeSequence` is removed.
  - `reloadRoot` runs on every rebuild: reconnect, gap, checkpoint, recovery and stop/inspect. Call sites are named in DS-002.
  - Tests: a gap reopen during and after a load.
- **AR-003:**
  - `MemberLoader` keeps per-root generations; every hydration form stages only the focused member (recovery: exact, between the checkpoints).
  - Test: a member hydrated before a failure reloads on its next open.
- **AR-004:** no query for a remote participant (empty, as today); the server rejects non-participants.
- **Route:** the architecture-review rule → `/software_engineering_team/architecture_reviewer`.

- 2026-11-01: ARCH-REV-002 **Pass** on SR-002 (AR-001…AR-004 resolved). The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer`. The Ownership Map wording on reload is aligned with DS-002 (every rebuild), as the reviewer noted. No Solution Designer forwarding required.
