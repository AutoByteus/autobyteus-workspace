# Architecture Review Revision Record — projects-left-navigation

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete | SR-005, SR-006, SR-007 | N/A | Fail | AR-001, AR-002, AR-003, AR-004, AR-005 |
| ARCH-REV-002 | Round 2 / Re-review of SR-008 | SR-008 | Fail | Pass | AR-001…AR-005 (resolved) |
| ARCH-REV-003 | Round 3 / Re-review of SR-009 after CRR-001 CR-001 | SR-009 | Pass (SR-008) | Pass | None (correction of the ARCH-REV-001/002 Persisted-Data verdict) |

## Revision Entries

### ARCH-REV-001 — Initial review: server design sound; web projection and multi-Project copy scope open

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/design-review-report.md`
- Review round and trigger: Round 1; Solution Designer's Architecture Design Complete (run `solution_designer_7591e3d191704d25a3396b3020a41127`), 2026-10-31.
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review.md`; N/A.
- Relevant solution revision IDs: SR-005, SR-006, SR-007.
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail (Design Impact; one Requirement Gap).
- What was established: baseline review at worktree commit `1f0cabbf8d`. The server spines DS-001, DS-002 and DS-005, the persisted-data decision (Directly Usable — No Migration), the ports and the composition binding pass. The web half of DS-003/DS-004 fails (AR-001), and the scope rule for multi-Project copies needs a decision (AR-002).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (blocking), AR-002 (blocking until decided), AR-003, AR-004, AR-005 (non-blocking; expected in the same revision).
- Material classification changes: none. task_size Large / architectural_risk High confirmed.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: see the report's Residual Risks.

### ARCH-REV-002 — Re-review of SR-008: all findings resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/design-review-report.md`
- Review round and trigger: Round 2; the Solution Designer's re-review request, commit `9f78941d0b` (handoff § Re-review request — SR-008).
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review.md`; AR-001…AR-005.
- Relevant solution revision IDs: SR-008.
- Prior authoritative decision: Fail (ARCH-REV-001).
- Current authoritative decision: Pass.
- What changed: the web half of DS-003/DS-004 now has owners (`projectRunsProjection`, `useProjectsTreeState`) that reuse the Workspaces builders and live overlay. REQ-008 states the multi-Project copy rule. The scope structure is tightened. The file placements are corrected. The revision was verified against the code (see the report's Current-State Evidence Basis).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-008; design DS-003/DS-004, Ownership Map, File Mapping, step 5; E-037 | `buildRunTreeProjection` (`runTreeProjection.ts` 229–241) groups by the descriptors given; `mergeRunTreeWithLiveContexts` (`runTreeLiveStatusMerge.ts` 58–83) overlays by run id; `buildTeamNodes` (`runHistoryTeamHelpers.ts` 88–113) takes injected resolvers; ancestry lists and reveal are named |
| AR-002 | Open (Requirement Gap) | Resolved | SR-008; REQ-008, DEC-013, AC-007; `runLinksOf` contract | Rule recorded within the direction, user informed; test cases listed |
| AR-003 | Open | Resolved | SR-008; E-038; Task Design Health; `chatDraftProjectChoice.ts`, `agent-run-history-row-projector.ts`; FU-006 withdrawn | Counts match this reviewer's round 1 measurements |
| AR-004 | Open | Resolved | SR-008; Interface Boundary Mapping; DS-004 triggers (1)–(5); E-039 | `startedUnderProject` removed; Task view `root.hostRoot` confirmed (`task-root-view-builder.ts` 42) |
| AR-005 | Open | Resolved | SR-008; Dependency Rules, Ownership Map, File Mapping; E-040 | Rule reworded; Team owner named; reader port placed beside `RunProjectContext` |

- New or remaining finding IDs: none.
- Material classification changes: none (Large / High).
- Recommended recipient: Implementation Engineer; Solution Designer informational.
- Remaining risks or uncertainty: see the report's Residual Risks (Project-keyed builder inputs, the multi-Project copy's Task line, stale "per expanded Project" wording, composer coverage, damaged Task files).

### ARCH-REV-003 — Re-review of SR-009: the record moves to a Projects file; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/design-review-report.md`
- Review round and trigger: Round 3; the Solution Designer's re-review request at `5f8872eca2`, after code review CRR-001 (`code-review-report.md`) raised CR-001 (Design Impact).
- Triggering role, report path, and finding IDs: Code reviewer via the Solution Designer; `code-review-report.md`; CR-001 (CR-002 is a Local Fix, outside this review).
- Relevant solution revision IDs: SR-009.
- Prior authoritative decision: Pass (ARCH-REV-002, SR-008).
- Current authoritative decision: Pass.
- What changed:
  - The "started under a Project" record moves from run metadata, index rows and the Team tree to `projects/<projectId>/project_runs.json`, owned by `ProjectRunService`. It is written through `RunProjectStarts.recordStart` before the run's records, and read through `ProjectRunLinks.startedRunsOf` and `RunProjectContextReader.contextOfRun`.
  - Verified at base `8faae96899`: the index stores' allow-lists and the empty-index fallback (E-041); Project folder listing and Delete (E-042); the Team creation order.
- **Reviewer correction (factual):** the ARCH-REV-001/002 Persisted-Data verdict ("readers ignore unknown fields") checked `agent-run-metadata-store.ts` and `team-run-execution-tree-schema.ts` but not `agent-run-history-index-store.ts` or `team-run-history-index-store.ts`. That verdict was wrong for the index rows. The code reviewer caught it (CR-001); MP-003 records the premise.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-005 | Resolved (ARCH-REV-002) | Resolved, unaffected | SR-009 changes only the storage location and the DS-001/002/005 record steps | DS-003/DS-004, the scope rule and the file placements are unchanged in the SR-009 diff |

- New or remaining finding IDs: none.
- Material classification changes: none (Large / High).
- Recommended recipient: Implementation Engineer (apply SR-009 and CR-002; then code review again before API/E2E); Solution Designer informational.
- Remaining risks or uncertainty: load `ProjectRunService` before root admission and restore; an orphan-entry test; a rollback check on a real data copy; the items carried from ARCH-REV-002.
