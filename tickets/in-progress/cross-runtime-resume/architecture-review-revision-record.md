# Architecture Review Revision Record — autobyteus-316

The latest `design-review-report.md` remains authoritative. This record holds the baseline and each later review delta.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer handoff "Architecture Design Complete" (Large / High) | SR-004 (notes 1–7) | N/A | Fail | ARCH-F-001, ARCH-F-002, ARCH-F-003, ARCH-F-004, ARCH-F-005 |
| ARCH-REV-002 | Round 2 / revision after ARCH-REV-001; autobyteus-343 delivered; rename decided (option A) | SR-004 (notes 8–11) | Fail | Pass | ARCH-F-001…005 resolved; ARCH-F-006 new (Low) |

## Revision Entries

### ARCH-REV-001 — Baseline: sound architecture, one success-path defect in the activation commit, incomplete trace of the first-message path

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff (`solution-designer-handoff.md`), requested by the user's design-principles re-audit (SR-004 note 7)
- Triggering role, report path, and finding IDs: Solution Designer (`/software_engineering_team/solution_designer`); handoff above; no prior findings
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: N/A
- Current authoritative decision: Fail (Design Impact; one Requirement Gap needing the user's decision)
- What changed in the review result or what baseline was established: baseline established. Confirmed in code: the two existing activation cases and the retry predicate being prepared-run-only; the preface route and its one-notice-per-input rule; the one-runtime-per-run journal; the library store appending by path; run rows holding no runtime; the journals step re-ensuring only runs whose raw-trace fingerprint changed. Found: `recordRunStarted` cannot clear the pending field, so the success path of every switch would end in a quarantine (ARCH-F-001); the first-message spine omits the root hop, a second caller of the changed input, the second construction site of the lifecycle service and the root's launch base (ARCH-F-002); the open file's runtime is wrong while a switch is pending (ARCH-F-003); the permanent label mapping needs the user's explicit decision under DESIGN rule 10 (ARCH-F-004); small vocabulary and citation corrections (ARCH-F-005).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: ARCH-F-001 (High, blocking), ARCH-F-002 (Medium, blocking), ARCH-F-003 (Low), ARCH-F-004 (Requirement Gap — User Approval Required), ARCH-F-005 (Low)
- Material classification changes: none; `task_size=Large`, `architectural_risk=High` confirmed
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: `MP-1` (can a root of a switched run still be registered when its host is offline) is `Unclear` and needs only a statement from the code; the in-memory hand-over notice is lost on a restart (accepted by the design).

### ARCH-REV-002 — Round 2: all round-1 findings resolved; Pass with one Low text correction

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/design-review-report.md`
- Review round and trigger: round 2; Solution Designer revision (`solution-designer-handoff.md` "Round 2", `solution-revision-record.md` SR-004 notes 8–11), head `f3252f1d1a`
- Triggering role, report path, and finding IDs: Solution Designer; round-1 report; ARCH-F-001…005
- Relevant solution revision IDs: SR-004 (notes 8–11)
- Prior authoritative decision: Fail
- Current authoritative decision: Pass
- What changed in the review result or what baseline was established: every claimed design update was checked against the current artifacts and the code (not taken from the revision record). Affected spines redrawn: DS-002 now starts at `AgentRunService.activate` and runs through the root manager, root, host handle and lifecycle lane; DS-001 now has two callers; DS-003 takes the open file's runtime from `openRawTraceRuntimeKind`. Classification unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001 | Open (High, blocking) | Resolved | SR-004 note 8; design-spec "Bounded Local / Internal Spines", Interface table, mapping row for the catalog service, removal-plan row; contract §3.3 step 4 | `recordRunStarted` re-read (`agent-run-history-catalog-service.ts:202-232`): it overrides only three fields and resets the row's `terminatedAt`, so one explicit `clearPendingRuntimeSwitch` input on it is the minimal fix and adds no second writer; the stored-before/after example is in the contract; the retry rule is a flag (`unchangedIsRetryable`) plus a data comparison (`isExactOriginal`), equivalent to the old rule for prepared starts and restores; the replaced private pieces are in the removal plan |
| ARCH-F-002 | Open (Medium, blocking) | Resolved | SR-004 note 8; design-spec Change Scope, DS-002, Dependency Rules, mapping rows, MP-1; notes F-34, F-35; FU-008 | Root hop confirmed (`resolveRootAndEnsureHost` → `ensureHostReady`); combined Save confirmed (`delegated-launch-selection-service.ts:142-160`) and now carries the host's runtime (REQ-001 sentence); both construction sites named, optional `switching` fails closed; root/member view/token usage/discovery decisions reasoned and checked; MP-1 answered from the code (stop/endRoot/terminate/fail-stop unregister; idle shutdown only with `delegatedFrom`) |
| ARCH-F-003 | Open (Low) | Resolved | SR-004 note 8; contract §3.2, I-4, I-9; design-spec mapping row for discovery | `openRawTraceRuntimeKind(metadata)` is the one owner; `memory-run-discovery.ts:146` is the only supplier for standalone runs; the live updater uses a live run (no pending switch). Minor placement note in ARCH-F-006 |
| ARCH-F-004 | Open (Requirement Gap — user approval) | Resolved | SR-004 notes 9, 10; autobyteus-343 merged (`31eb1fb5d3`) | 343 is on the branch: writers use `RuntimeKind.*`, the recorder uses `runtimeKindFromString`, the migration folder exists; the design has no mapping file or label test; the recorder writes `from.runtimeKind` as is; `DESIGN.md` rule 10 passes |
| ARCH-F-005 | Open (Low) | Resolved | SR-004 note 11; design-spec discrepancy 2, removal-plan row, naming table | The user decided option A (2026-10-31). A grep of every old name found no site outside the list except one agent-specific web type (`AgentModelConfigMutationResult`), recorded in ARCH-F-006; the kept names are the ones that stay accurate; the statement that the drift is created by this change is corrected |

- New or remaining finding IDs: ARCH-F-006 (Low, non-blocking text and inventory corrections)
- Material classification changes: none; `task_size=Large`, `architectural_risk=High` confirmed
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass, with a hold until the user's final approval of the design), then `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: unproven offline-host-with-registered-root path (FU-008); in-memory notice lost on a restart (accepted); real-backend check of I-7 happens in the real run.
