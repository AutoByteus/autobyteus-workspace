# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / first review of the adoption design (2026-10-18) | SR-003, SR-004, SR-005 | N/A | Fail | ARCH-F-001, ARCH-F-002 |
| ARCH-REV-002 | Round 2 / re-review of SR-006 (2026-10-18) | SR-006 | Fail | Fail | ARCH-F-001, ARCH-F-002 resolved; ARCH-F-003 new |
| ARCH-REV-003 | Round 3 / re-review of SR-007 (2026-10-18) | SR-007 | Fail | Pass | ARCH-F-003 resolved |
| ARCH-REV-004 | Round 4 / targeted re-review of SR-008 (DI-001) | SR-008 | Pass | Pass | None new (one required implementation addition) |
| ARCH-REV-005 | Round 5 / targeted re-review of SR-009 (CRR-005 F-002) | SR-009 | Pass | Pass | None new |

## Revision Entries

### ARCH-REV-001 — Initial baseline: resumption from step 1; REQ-004 wording

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 1; SR-004 handoff from `/software_engineering_team/solution_designer`, reviewed on the SR-005 basis (list tool withdrawn). The SR-002 link-only package was paused before any result; no review artifact was written for it.
- Triggering role, report path, and finding IDs: Solution Designer; N/A; N/A.
- Relevant solution revision IDs: `SR-003`, `SR-004`, `SR-005`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established:
  - Confirmed: the adoption branch, eligibility, no file moves, step order (link before resources), reuse of delivery, history row removal, G1/G2 hiding, host-root-scoped fencing, Large / High.
  - Found: resumption doesn't cover a stop after steps 1–2 (retry refused); REQ-004 conflicts with removal of the empty collaboration package.

#### Prior Finding Resolution

None

- New or remaining finding IDs: ARCH-F-001 (Design Impact, Medium), ARCH-F-002 (Requirement Gap, Low)
- Material classification changes: None (Large / High confirmed).
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: application-bound run eligibility; team admission `exclude` on adoption; adopted team runs leave the Memory page Teams list (as all hub task teams); stale list-tool example.

### ARCH-REV-002 — SR-006 re-review: both findings resolved; step 3's write shape raises ARCH-F-003

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 2; SR-006 from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-001); ARCH-F-001, ARCH-F-002.
- Relevant solution revision IDs: `SR-006`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Fail`
- What changed in the review result:
  - The two findings are verified resolved, and the residuals are taken.
  - The new SR-006 close-path reversal (stop inside step 3, then Task close) was checked against the merged 8641c0ac writers. For team runs, step 3 writes the task-agent projection without `teamDefinitionName`, which the team-run reader requires, so the reversal cannot restore a team run (ARCH-F-003).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001 | Open (Design Impact, Medium) | Resolved | SR-006; design Persisted Data "Adoption in progress", bounded spine; tests after steps 1–4 | An open `assigned` entry by this delegator with hostRoot = its root, for a run not in its tree, is recognized first, before the "belongs to no Task" and `assertCopyAssignable` refusals. The retry continues at the first missing step. The entry stays `starting` through steps 2–4, and only a delivery failure marks it `failed`. |
| ARCH-F-002 | Open (Requirement Gap, Low) | Resolved | SR-006; Persisted Data | The collaboration package is kept; REQ-004 is unchanged; harmlessness is argued (G1, readiness D-6, an empty tree in scans). |

- New or remaining finding IDs: ARCH-F-003 (Design Impact, Medium).
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: later ordinary saves normalize an adopted team's tree to the task-agent shape (definition-derived fields; to be recorded).

### ARCH-REV-003 — SR-007 re-review: additive step 3 resolves ARCH-F-003; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 3; SR-007 from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-002); ARCH-F-003.
- Relevant solution revision IDs: `SR-007`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result: ARCH-F-003 verified resolved in the design and against the merged split-write comparison (`task-execution-tree-split.ts:211-237`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-003 | Open (Design Impact, Medium) | Resolved | SR-007; design Persisted Data "Step 3 is strictly additive"; Review Response | `TaskAgentOwnFiles.addTaskAgentSection` adds only the `taskAgent` key to the raw file (atomic). The record is read back through the task-agent reader, so `writeTeamIfChanged` / `writeAgentIfChanged` (compare with the projected file on disk) skip the own-file write and only the link is written. The reversal removes the key → prior content parsed-equal, valid for the team-run and standalone readers. Test: team run stopped inside step 3, then Task closed → listed and openable, parsed-identical tree. Later normalization recorded. |
| ARCH-F-001, ARCH-F-002 | Resolved (ARCH-REV-002) | Resolved | — | unchanged |

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: link-time equality including team handoffs (implementation note); R-1 accepted.

### ARCH-REV-004 — SR-008 targeted re-review (DI-001): reversible address rebase; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 4; SR-008 from `/software_engineering_team/solution_designer` after the implementer's DI-001 (`implementation-design-impact.md`).
- Relevant solution revision IDs: `SR-008`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Pass`
- What changed in the review result:
  - DI-001 is verified: team address frames differ, `/` for a hand-started team versus the catalog address for a task agent team and the delegator's tree.
  - The SR-008 resolution is accepted: an exactly reversible prefix rebase keeping every other fact; read-back so only the link is written; `startedAt` equality; catalog address with refusal when the definition is unlisted; archived runs refused; `revertUnfinished` owned and serialized on the delegator root's queue; R-3 accepted.
  - ARCH-F-003's basis is revised; its intent (step 3 exactly reversible, nothing lost) holds.
  - Required implementation addition: the Project delete path also calls `revertUnfinished`, since Project delete bypasses `ProjectTaskService`'s Task delete.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-003 | Resolved (ARCH-REV-003) | Resolved (basis revised by SR-008) | SR-008; design Persisted Data "Step 3 keeps every fact and is exactly reversible" | `adoptOwnFile` / `restoreHandStartedFile` on raw JSON. For a team: the `taskAgent` key plus a `/` → `A` prefix rebase of root, members, coordinator and handoffs, with an exact inverse (flat teams). Messages are keyed by run ids (`collaboration-communication-message-schema.ts:43`). Round-trip and revert tests are listed. |
| ARCH-F-001, ARCH-F-002 | Resolved | Resolved | — | unchanged |

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: Project-delete revert caller (required addition); R-3 accepted; link-time equality incl. handoffs (implementation note).

### ARCH-REV-005 — SR-009 targeted re-review (CRR-005 F-002): renderer rule for the sidebar after adoption; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 5; SR-009 from `/software_engineering_team/solution_designer` after the code reviewer's failure-origin review CRR-005 (API/E2E F-002, Design Impact).
- Relevant solution revision IDs: `SR-009`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The F-002 cause is verified in the renderer code. Open contexts become local rows, and there is no server history push.
  - The renderer-only rule is accepted: rule 1 on `task_execution_started` by run id; rule 2 drops history-origin local rows absent from a later read.
  - Side note: rule 2 also removes an open, inactive team run that the user archives (team archive keeps the local context), which is consistent with archive; to be confirmed by the implementer.
  - **Factual correction (implementer IR-004, commit `fbc0f805bf`, verified):** the side note's premise was wrong. Team archive already removes the local context (`archiveTeamRunRecord` → `cleanupStoredTeamRunLocalState` → `removeTeamContext`, `runHistoryMutationActions.ts:84-110, 236-241`), so rule 2 changes nothing for archived runs. Accepted refinement: rule 2 respects the agent history's `limitPerAgent` window. The decision (`Pass`) is unchanged.

#### Prior Finding Resolution

None open (ARCH-F-001..ARCH-F-003 remain resolved).

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: Project-delete revert caller (round 4 requirement) still applies. The archived-team side note was withdrawn after IR-004.
