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

## SR-003 Revision (after IR-001, 2026-11-01)

- **IR-001:** QR-004 missed after DEC-001 (a). Opening still took 85,946 ms, as 23 forced layouts of 3.9–7.1 s each. Everything else is implemented and measured: QR-001, QR-002 and QR-003 are met.
- **Cause, measured in the loaded page (investigation-notes M-163b):** text shaping of 60 KB single-word runs in the system UI font with kerning and ligatures. Relayout takes 86 s; 48–87 ms with `font-kerning:none; font-variant-ligatures:none; text-rendering:optimizeSpeed`; 45–83 ms in Arial. `break-all`: 43 s; `white-space`, `display` and `min-width` change nothing.
- **Design (DS-007, DEC-004; no visible change):**
  - a `long-unbroken-text` class turns kerning and ligatures off only on text blocks with a run of at least 1,000 non-whitespace characters: user message text, markdown html segments, inter-agent messages and Team-tab rows;
  - one linear helper, `utils/text/longUnbrokenRun.ts`;
  - DS-006 is kept.
  - DEC-001 (b), collapsing long messages, is not needed, so there is no question for the user.
- **Route:** `get_handoff_rules` → the revised Large/High package matches the architecture-review rule → `/software_engineering_team/architecture_reviewer`, as a targeted review of SR-003. Implementation then adds DS-007 to IR-001's work, and the route continues to code review.

- 2026-11-01: ARCH-REV-003 **Pass** on SR-003 (DS-007 / DEC-004). The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer`. Residual (recommendation only): tool-call and reasoning renderers were not measured for long tokens. No Solution Designer forwarding required.

## SR-004 Revision (after code review CRR-003, CR-002, 2026-11-01)

- **Finding:** on a running root, participant lists were fetched again on every context publication: twice per selection (inspection, then attach), and once per new child or settings Save (checkpoint reconnect). This is avoidable full-history transfer.
- **Decision, option (b), one rule for hub, Team and Org:** reload only when a message could have been missed.
  - `CollaborationParticipantMessages` keeps a per-root consistent-through sequence C. It comes from applied events, and from seen single `checkpoint_required` events, which carry no message.
  - `reloadRoot(rootKind, rootRunId, { isActive, baseChangeSequence })` reloads for a stored rebuild, or when the live base B > C. Otherwise it keeps the lists and in-flight loads.
- **Expected API-08 counts:**
  - running-hub selection: 1;
  - new child or Save with no message meanwhile: 0;
  - a message meanwhile: 1.
- **Tests:** the four cases in the design's SR-004 summary.
- **Route:** `get_handoff_rules` → the revised Large/High package → `/software_engineering_team/architecture_reviewer` (targeted SR-004). Then implementation, a targeted source review, and the API-08 recheck.

## SR-005 Revision (after ARCH-REV-004, AR-005, 2026-11-01)

- **Option (b):**
  - `RootEventPublisher` gets a per-instance `liveSequenceId`, carried as `live_sequence_id` in active Agent-root, Team and Org views and snapshots (`null` in stored views). This is a contract field.
  - `CollaborationParticipantMessages` keeps C with the `live_sequence_id` it belongs to.
  - `reloadRoot(…, { liveSequenceId, baseChangeSequence })` keeps the lists only for the same non-null ID and B ≤ C, and reloads otherwise.
  - Option (a) was rejected: it relies on the client observing every stop, resume or restart.
- **New tests:** stop → resume with a message before attach reloads; a new-publisher reconnect with B ≤ the old C reloads.
- **Route:** the architecture-review rule → `/software_engineering_team/architecture_reviewer` (targeted SR-005).

- 2026-11-01: ARCH-REV-005 **Pass** on SR-005 (AR-005 resolved; all three roots covered). The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer`. No Solution Designer forwarding required.

## SR-006 Revision (after code review CRR-004, CR-003, 2026-11-01)

- **Option (a), the same rule as hub and Org:**
  - `getTeamRunResumeConfig` (`team-run-history.ts:94`) adds `liveSequenceId` and `baseChangeSequence` from the active Team's publisher (`null`/`0` when stopped).
  - `teamRunHydrationCommit.ts` passes them to `reloadRoot` as a live rebuild. The following snapshot then keeps the list (same ID, B ≤ C).
  - Option (b) was rejected: Team would get its own timing rule. Option (c) was rejected: a running Team's open is a normal path.
- **Test:** 1 participant fetch per running-Team open, and 1 per stopped-Team open; API/E2E rechecks the Team counts.
- **Route:** `get_handoff_rules` → the revised Large/High package → `/software_engineering_team/architecture_reviewer` (targeted SR-006).

- 2026-11-01: ARCH-REV-006 **Pass** on SR-006, with a condition for implementation: read `liveSequenceId` and `baseChangeSequence` together from one publisher. The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer`. No Solution Designer forwarding required.
