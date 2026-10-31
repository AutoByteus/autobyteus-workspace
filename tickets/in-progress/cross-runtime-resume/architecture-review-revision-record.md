# Architecture Review Revision Record — autobyteus-316

The latest `design-review-report.md` remains authoritative. This record holds the baseline and each later review delta.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer handoff "Architecture Design Complete" (Large / High) | SR-004 (notes 1–7) | N/A | Fail | ARCH-F-001, ARCH-F-002, ARCH-F-003, ARCH-F-004, ARCH-F-005 |
| ARCH-REV-002 | Round 2 / revision after ARCH-REV-001; autobyteus-343 delivered; rename decided (option A) | SR-004 (notes 8–11) | Fail | Pass | ARCH-F-001…005 resolved; ARCH-F-006 new (Low) |
| ARCH-REV-003 | Round 3 / failure-origin review CRR-002 of the built system (F-1 candidate records, F-2 chat after reload, F-3 pending context) | SR-004 (note 14) | Pass | Fail | ARCH-F-006 resolved; ARCH-F-007 new (Medium, blocking) |
| ARCH-REV-004 | Round 4 / revision after ARCH-REV-003 and the Solution Designer's data-model review (SR-004 note 15) | SR-004 (note 15) | Fail | Pass | ARCH-F-007 resolved; ARCH-F-008 new (Low) |

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

### ARCH-REV-003 — Round 3: watermark order and one chat reader accepted; the retry path of the watermark fails

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/design-review-report.md`
- Review round and trigger: round 3; Solution Designer revision after the failure-origin review CRR-002 (`code-review-report.md`, `solution-designer-handoff.md` "Round 3"), documents `69426cd284`
- Triggering role, report path, and finding IDs: Code Reviewer (CRR-002: F-1, F-2 Design Impact, F-3 Local Fix), relayed by the Solution Designer
- Relevant solution revision IDs: SR-004 (note 14)
- Prior authoritative decision: Pass (ARCH-REV-002)
- Current authoritative decision: Fail (Design Impact)
- What changed in the review result or what baseline was established: CRR-002's two premises confirmed in code (a native candidate writes its `system_instruction` while it prepares; Grok writes at backend creation; the chat reads the active file only). Accepted: the order `begin (watermark) -> prepare -> validate -> record -> persistAndPublish -> register`, the single library call, the chat reader serving `buildProjection` and `buildActiveTracePage` with an unchanged cursor-generation rule, the pending-context rule for F-3, the requirement changes (REQ-010, REQ-014, AC-010). Found: on a retry after a failed start the watermark is re-read after the failed candidate's own record, the instruction dedupe writes nothing, and `record` archives the new agent's record with the previous agent's (ARCH-F-007).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-006 | Open (Low, non-blocking) | Resolved | SR-004 note 14 and the earlier text pass | Design-spec status, notes range and persisted-data counts updated; `ExistingRunConfigEditor.vue`, `AgentModelConfigMutationResult` and the two docs are in the mapping; F-38…F-41 added to the notes |
| ARCH-F-001…005 | Resolved (round 2) | Still resolved | | The activation commit, root hop, open-file runtime, stored spelling and rename are untouched by this revision |

- New or remaining finding IDs: ARCH-F-007 (Medium, blocking)
- Material classification changes: none; `task_size=Large`, `architectural_risk=High` confirmed
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: whether the system-instruction dedupe can suppress a new era's own record across eras (`Unclear`, no mechanism required); the marker disappears from a reloaded chat after a compaction in the new era (stated in §3.7; tell the user).

### ARCH-REV-004 — Round 4: ARCH-F-007 resolved; derived hand-over accepted; Pass with one Low clarification set

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/design-review-report.md`
- Review round and trigger: round 4; Solution Designer revision (`solution-designer-handoff.md` "Round 4", SR-004 note 15), documents `ca4c82b050`
- Triggering role, report path, and finding IDs: Solution Designer; round-3 report; ARCH-F-007
- Relevant solution revision IDs: SR-004 (notes 14, 15)
- Prior authoritative decision: Fail
- Current authoritative decision: Pass
- What changed in the review result or what baseline was established: ARCH-F-007's fix verified case by case against the code; the Solution Designer's additional changes reviewed (the contract holds data only; the hand-over derived from the raw traces; the second port and the lifecycle → notice call removed). Affected spines redrawn: DS-002 (with `discard` on every branch that ends before `record` succeeds) and DS-005 (publication → derive once → notice → `prefaceDelivered` → the user record ends it).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-007 | Open (Medium, blocking) | Resolved | SR-004 note 15; design-spec "Activation Sequence", Dependency Rules, mapping rows; contract §3.3 identity, archive rules and case table, I-7 | Walked each case against `archiveRecords` (idempotent by key, pending-segment cleanup) and `recordSystemInstructionSupply` (dedupe against the latest instruction in the active file): failed start then retry (discard removes the candidate's record after the abort; the next `begin` reads the original tail), failed commit then retry (marker present, `discard` a no-op, watermark ignored, instruction not written twice), `record` failing between segment completion and the rewrite (discard removes the candidate's record; the retry removes the archived ids and puts the same-id marker first), abandoned attempt (previous file untouched). The marker id is derived from the key, which makes I-3 hold on every attempt. The dedupe consequence is stated as `Unclear` with no mechanism |
| ARCH-F-001…006 | Resolved | Still resolved | | Untouched, apart from the removal of the second port, which only simplifies the dependency rules |

- New or remaining finding IDs: ARCH-F-008 (Low, non-blocking): the exact guard of `discard` (keyed to this switch, so later switches work; watermark not found removes nothing; discard only after a confirmed release), bounded read-only reads for the derivation and `begin`, notice-service semantics (`MP-4`), stale design-spec text
- Material classification changes: none; `task_size=Large`, `architectural_risk=High` confirmed
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass), then `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: the instruction dedupe across eras (`Unclear`, no consequence for chat or journal); the marker is not shown on reload after a compaction in the new era (tell the user); a duplicated notice after a restart in the no-turn-id case.
