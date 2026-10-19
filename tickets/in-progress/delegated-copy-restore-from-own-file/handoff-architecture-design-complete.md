# Handoff: Architecture Design Complete: delegated-copy-restore-from-own-file (autobyteus-197)

- Result: `Architecture Design Complete`, `task_size = Large`, `architectural_risk = High` → independent architecture review
- Package identifier: `delegated-copy-restore-from-own-file`; Project Task `autobyteus-197`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction
- Current solution revision: `SR-002`
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-restore-from-own-file`, branch `codex/delegated-copy-restore-from-own-file`, base `origin/personal` @ `f171032e88`, finalization target `origin/personal`
- Ticket folder: `tickets/in-progress/delegated-copy-restore-from-own-file/`

## Original request and goal

The user's direction (2026-10-19): "the data model should be pure … clean it up immediately". Every delegated copy (task agent or task agent team) restores from its own run file. `taskAgent.origin`, the two-way merge on load and every path that resolves a copy through the configured placement at its address are removed. One startup migration converts the existing own files.

## Approval basis

- Requirements SR-001 approved by **the user** in the Solution Designer conversation, 2026-10-19: "Yeah, exactly. Basically, we want to keep the code and the data clean now … if it cannot be converted, leave it there. That's fine. Let it fail. But the application starts normally."
- User decisions:
  - DEC-001: editing a configured member in a stopped run no longer changes copies already started from it;
  - DEC-002: one data migration of his real data, after his backup;
  - DEC-006: remove `origin` from every own file;
  - no rollback consideration.
- SR-002 corrects the wording of REQ-002 / AC-006: a team copy keeps every handoff rule its members have today, including rules to the coordinating run. This preserves current behavior; no renewed approval needed.

## Artifacts

- `requirements-doc.md`: Approved (SR-001; SR-002 wording)
- `investigation-notes.md`: including Architecture Investigation Findings and the read-only data shape inventory
- `design-spec.md`: design Ready (D-1..D-7, migration plan, removal plan, file mapping)
- `solution-revision-record.md`: SR-001, SR-002
- Supplements: none. Independent review artifacts: N/A (first review)

## Key design points for review

- **D-1:** every `DelegationPlacement` carries `source`. Configured placements get a snapshot from `configuredPlacementSource` (new, `collaborator-source-projector.ts`), so `TaskAgentExecution.source` / `TaskTeamExecution.source` become required.
- **D-2:** adapters and delegated launches project `source`. The three task-source resolvers and the `readTaskSource` port are removed as empty indirection.
- **D-3:** own-file writer and composer have one branch each. `origin` is gone, and agent own files require the started launch.
- **D-4:** a team copy's snapshot keeps the handoffs whose `from` is a member. The team-source invariant changes from "inside the team" to "starts at a member".
- **D-5:** a team member's launch is omitted iff it is deep-equal to the team default (recorded follower rule). This preserves all 331 members in the user's data.
- **D-6:** new launch-source origin `configured` (server + both stream-contract packages), so "As configured in this run" stays data-driven.
- **D-7:** display names unchanged (the Team web rule changes to "first segment is not a configured root member").
- **Migration `20261019_delegated_copy_own_file_complete_v1`** (STARTUP_ONLY):
  - completes the configured-place own files from their slot;
  - removes `origin` from every own file;
  - leaves files whose placement is missing untouched, with a warning;
  - stays non-terminal while `20261017_task_agent_own_run_v1` is pending (the append-only-logs pattern).
- **Released 10-17 migration** repointed to frozen copies in `legacy/released-run-package-shapes/released-task-agent-own-files-with-origin.ts`.

## Open risks

- RSK-001: a missed "configured placement first" site; mitigated by a grep list and per-root tests.
- D-5 divergent shape (same model, different workspace or auto-approve): 0 of 331 members in the user's data.
- Follow-up F-1: skill-improvement launch for a copy at a configured address uses the slot's settings.

## Context

- Not a prerequisite of autobyteus-191 (cross-node slice 1), but it touches the same loading code (`task-agent-own-records.ts`, tree stores). The user and the Project Task Manager set the order.
- Testing: TESTING.md applies. Synthesized fixtures only; never a migration on real data or a copy of it.

## Route

- `get_handoff_rules` → rule "task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`
- Expected next action: independent architecture review of this package.

## SR-003 — Response to ARCH-REV-001 (re-review requested)

- AR-001 → resolved by the user's decision DEC-010 (2026-10-19, conversation): "every agent run has their own configuration … complete one. Then when you're restoring, you don't have to borrow from the team … It will stay clean." Added as REQ-012 / AC-011.
  - Design D-5 rewritten: every team-copy member (catalog and configured place) records its complete `launchConfiguration` and a required `followsTeam` boolean.
  - How `followsTeam` is set: catalog = the member has no own agent default; configured placement = today's configured rule (runtime, model and model settings equal to the team default). So the member with its own auto-approve and the team's model keeps following.
  - Removed: `effectiveMemberLaunchConfiguration`, the presence-based follower rule, `recordedFollowerAddresses`, and the contract (`teamMember*` / `collaborationMember*` launch/follow helpers) and web equivalents.
  - `effectiveMemberLaunchSource` stays: a follower's provenance is the team's, derived from `followsTeam`.
  - Out of Scope narrowed: catalog copies' start and restore are unchanged; their recorded member shape changes.
- Migration:
  - M2 now also completes the members of catalog team copies (own launch, else the team default; `followsTeam` = had no own launch);
  - M4 writes complete members with `followsTeam` by the configured rule.
- AR-002 → M4 projects every slot launch object (team default and members) to the 5 current keys before comparing or writing; `skillAccessMode` fixture variants added. The follower evidence (331/331) was computed on exactly those 5 keys (investigation notes, Review Evidence).
- Residual R-1 (memory targets / skill improvement still read `configuredPlacement` for copies): kept as follow-up F-1, as the report suggests.
- Classification unchanged: Large / High. Re-review requested for D-5, M2/M4 and the sections they touch: Persisted Data, Migration Plan, Removal Plan, Interface table, Shared Structure tightness, File mapping, Examples, Tradeoffs, Guidance; plus requirements REQ-012 / AC-011 / DEC-010.

## SR-004 — Response to ARCH-REV-002 (re-review requested)

- AR-003: Shared Structure tightness row and Removal Plan row rewritten. A member's `launchSource` keeps today's presence rule (own default used or skipped), independent of `followsTeam`, and `effectiveMemberLaunchSource` stays `member.launchSource ?? team.defaultLaunchSource`. Test added (Guidance: Member provenance).
- AR-004: the "Admission after the migration" bullet now says a preserved team copy is rejected and not loaded. The Removal Plan row's replacement is now `member.followsTeam`. AC-007 covers a preserved team copy; test added.
- AR-005: Change Sequence step 1 and Guidance now carry the explicit 4-part 10-17 test plan.
- Re-review scope: the D-5 provenance wording, the admission bullet, the Removal Plan rows, Change Sequence step 1, the test guidance, and AC-007.

## SR-005 — DI-001 from implementation (re-review requested)

- DI-001 (`implementation-design-impact-DI-001.md`): four released migrations (two `20260731` working-context snapshot migrations, `20260926` locators, `20260905` org-history summary) pass pre-own-run trees into the current indexes and validators. They stop typechecking once `source` is required, but their runtime results are unchanged.
- Decision D-8: option A, a legacy-owned bridge `asSourceIndependentIndexInput` at the 4 call sites, with documented source-independent methods. The README note is extended and the four suites stay unchanged. Option B (freeze about 914 lines) was rejected; the reasoning is in the design's Dependency Rules.
- Implementation state: step 1 committed `3ed550595c`; steps 2–5 partly done and uncommitted; the implementation engineer applies D-8 when this passes.
- Re-review scope: D-8 in Dependency Rules, the Migration Plan's "Other released migrations", Change Sequence step 1, the file mapping row, the escalation trigger, the test guidance, and the corrected evidence row.

## SR-006 — Guideline §2 checklist and shape inventory (re-review requested)

- Added the design-spec section "Data Migration Guideline Checklist (§2) and Shape Inventory": the 10 answers in one place, plus every source shape with its count in the user's data (read-only), disposition and synthesized fixture (F-A1..F-X3). No design decision changed.
- New evidence: 22 mirrored own files under `memory/imports/docker-node-1/` are not converted (another node's data, replaced on sync; append-only precedent, S26). The 2 mirrored configured-place copies are not shown until that node is updated. Fixture F-X3 proves they stay byte-identical.
- Re-review scope: that section only. For implementation, the fixture list F-A1..F-X3 is the migration test plan.

## SR-007 — AR-006 response (re-review requested)

- The `imports/` row is split: 9 mirrored catalog agent copies stay readable (F-X3); 2 configured-place agent copies (F-X3b) and 11 catalog team copies (F-X3c) are not shown until `docker-node-1` updates and syncs. They stay byte-identical, are reported unavailable, and the source still lists its other runs.
- Checklist item 8 is corrected to 13 hidden of 22 mirrored copies (175 mirrored run folders in total).
- Coverage decision (Solution Designer): S26 and the user's rule cover it; the user is informed in the conversation. See SR-007.
- Re-review scope: the mirrored rows and checklist item 8.
