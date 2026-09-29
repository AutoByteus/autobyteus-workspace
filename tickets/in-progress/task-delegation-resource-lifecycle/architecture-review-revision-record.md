# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1: initial review of the SR-003 design package | SR-002, SR-003 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2: focused re-review of SR-004 | SR-002, SR-004 | Fail (Design Impact) | Pass | AR-001, AR-002, AR-003 (resolved) |
| ARCH-REV-003 | Round 3: focused re-review of SR-005 (migration checklist, real data, basis refresh, wake simplification) | SR-002, SR-005 | Pass | Fail (Design Impact) | AR-004, AR-005 (new) |
| ARCH-REV-004 | Round 4: focused re-review of SR-006 | SR-002, SR-006 | Fail (Design Impact) | Pass | AR-004, AR-005 (resolved) |
| ARCH-REV-005 | Round 5: focused re-review of SR-007 (tolerant tree reading, no migration; requirements delta DEC-008) | SR-007 | Pass | Pass | None new; AR-004's new-migration ordering superseded |

## Revision Entries

### ARCH-REV-001 — Initial review: idle-schedule `error` mapping, task restore without context, result shape

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/design-review-report.md`
- Review round and trigger: Round 1; Solution Designer "Architecture Design Complete" handoff (Large / High), 2026-09-29
- Triggering role, report path, and finding IDs: `solution_designer`, `solution-handoff.md`; N/A
- Relevant solution revision IDs: SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, classification `Design Impact`
- What changed in the review result or what baseline was established:
  - The behavior basis is confirmed against code at `8bffda045`.
  - Ownership, boundaries, dependency rules, the migration decision and safety, and the removal plan pass.
  - Three findings:
    - AR-001 (High): DS-005 cancels timers on `error`, so errored children and failed-wake chains are never shut down, and the root stays open (REQ-004, REQ-011, AC-004, AC-015).
    - AR-002 (Medium): the reused restore planner starts fresh when there is no saved conversation, contradicting the design's REQ-007 claim (AC-011, AC-013).
    - AR-003 (Low): the result shape keeps a `status` field, contrary to REQ-001 and AC-001.
  - Premises: P-01 Reachable; P-02 Unclear, with a resolution that does not depend on the answer; P-03 and P-04 Not Reachable.
  - Non-blocking recommendations R-1 to R-4 are recorded.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002, AR-003
- Material classification changes: N/A
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: FIFO latency on exact delivery; per-runtime restore and approval validation; migration on real data (see the report's Residual Risks).

### ARCH-REV-002 — Focused re-review of SR-004: all round 1 findings resolved

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/design-review-report.md`
- Review round and trigger: Round 2; Solution Designer revised package SR-004 (design-spec.md → "Review Round 1 Resolution"), 2026-09-29
- Triggering role, report path, and finding IDs: `solution_designer`, `solution-handoff.md` (Round 2 section); AR-001, AR-002, AR-003, R-1 to R-4
- Relevant solution revision IDs: SR-002 (unchanged, approved), SR-004
- Prior authoritative decision: `Fail` (Design Impact), ARCH-REV-001
- Current authoritative decision: `Pass`
- What changed in the review result:
  - I confirmed the behavior basis is unchanged: SR-002, no intended-behavior change, and AR-003 now conforms to AC-001.
  - I re-checked DS-002, DS-003, DS-005, the restore contract, the result shape, open work, admission and the helper dispositions.
  - All findings are resolved.
  - New non-blocking notes: R-5 (use a single task open-work predicate), R-6 (stale DS-002 wording), R-7 (Team tree-projection file removal and switch to the root-neutral projection).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-004; design-spec DS-005 (line ~242), Lease (~245-246), Guidance status events, open work (~500, ~509-513), Key Tradeoffs, Examples, test obligations | `error` arms; `release()` arms the chain; partial restore arms the restored executions. Task open work counts only `initializing|running`. The fire-time `tryPrepareTerminationIfQuiescent` guard is unchanged (`agent-run.ts:211-221`) |
| AR-002 | Open (Medium) | Resolved | SR-004; Interface Mapping (`acquireLiveLease`, port), Guidance restore precheck (~502-508), Risks | `assertRestorableChain` runs before restore: `none`/`indeterminate` → `TASK_EXECUTION_CONTEXT_UNAVAILABLE`; restore errors → `TASK_EXECUTION_RESTORE_FAILED`; returned as `{accepted:false, code}`. External runtimes write local traces (`external-runtime-memory-writer.ts`), so the precheck is runtime-uniform |
| AR-003 | Open (Low) | Resolved | SR-004; Interface Mapping, Examples, Guidance result schema and LLM text | The shape `{target_agent_run_id}` or `{target_agent_run_id: null, message}` matches REQ-001 and AC-001 |
| R-1 to R-4 | Recommendations | Addressed | SR-004; Evidence-Only Clarifications, Removal Plan, Retained Team Helper Dispositions | Present in design-spec |

- New or remaining finding IDs: None (non-blocking notes R-5 to R-7)
- Material classification changes: P-02 no longer drives any decision (the precheck makes the outcome correct either way)
- Recommended recipient: `/implementation_engineer` (primary), then `/solution_designer` (informational)
- Remaining risks or uncertainty: validation obligations for per-runtime restore and approval-pending (AC-006, AC-007), migration on real installed data, FIFO latency on exact delivery, and the R-4 label confirmation at Delivery.

### ARCH-REV-003 — SR-005 re-review: migration ordering and dependencies on current services; retained-handle liveness

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/design-review-report.md`
- Review round and trigger: Round 3. Solution Designer revised package SR-005 (self-identified guideline gaps after the user's question), 2026-09-29.
- Triggering role, report path, and finding IDs: `solution_designer`, `solution-handoff.md` (Round 3 section); evidence ARCH-16 to ARCH-19
- Relevant solution revision IDs: SR-002 (unchanged, approved), SR-005
- Prior authoritative decision: `Pass` (ARCH-REV-002, on SR-004)
- Current authoritative decision: `Fail`, `Design Impact`
- What changed in the review result:
  - I verified the SR-005 sections against the published guideline, registry, runner, released migrations and `ConfiguredAgentExecutionHandle` at `origin/personal@f2924a2b0`.
  - The real-data inventory, dispositions, availability and the records-read simplification pass.
  - New AR-004 (High): the runner executes in list order. The design's position "after `20260926`" and a generic "repoint to frozen copies" do not handle `20260926` (current `RootRunPackageCurrentValidator.scan()`) or `20260905` (current Org store, validator, index and history projection, listed after `20260926`) on a supported skip-version upgrade (P-05). The pre-rebase worktree registers the new migration differently, before both.
  - New AR-005 (Low): the retained-handle wake leaves "live / shut down" undefined for task agents.
  - Non-blocking: R-8 (guideline section references and checklist item 7) and R-9 (downstream re-review after the rebase).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Still resolved; must stay consistent under AR-005 | SR-004, SR-005 Basis refresh | DS-005 and lease text unchanged in SR-005 |
| AR-002 | Resolved (ARCH-REV-002) | Still resolved; the "dormant" set needs definition under AR-005 | SR-004, SR-005 Basis refresh ("`assertRestorableChain` still runs before any wake") | Precheck text unchanged |
| AR-003 | Resolved (ARCH-REV-002) | Still resolved | SR-004 | Result-shape text unchanged |

- New or remaining finding IDs: AR-004, AR-005 (R-5 to R-9 non-blocking)
- Material classification changes: P-05 Reachable (skip-version contract); P-06 Not Reachable
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty:
  - Pending: the rebase onto `f2924a2b0` and the stopped-writer installed-data copy run.
  - The existing downstream implementation, code-review and API/E2E artifacts reflect the pre-rebase basis (R-9).

### ARCH-REV-004 — SR-006 re-review: migration ordering (option b) and single liveness predicate verified

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/design-review-report.md`
- Review round and trigger: Round 4. Solution Designer revised package SR-006 (resolution of ARCH-REV-003), 2026-09-29.
- Triggering role, report path, and finding IDs: `solution_designer`, `solution-handoff.md` (Round 4 section); AR-004, AR-005, R-8, R-9
- Relevant solution revision IDs: SR-002 (unchanged, approved), SR-006
- Prior authoritative decision: `Fail` (Design Impact), ARCH-REV-003
- Current authoritative decision: `Pass`
- What changed in the review result:
  - I verified at `f2924a2b0`:
    - the runner's list-order execution;
    - the tree producers before `20260901`;
    - that `20260926` and `20260905` only read trees;
    - the `ConfiguredAgentExecutionHandle` behavior: `dispose()` clears only the run and overlay; `ensureReady` re-activates in `restore` mode after first publication; `isActive()` depends on the run; `approveToolInvocation` calls `ensureReady`, which the design now gates.
  - AR-004 and AR-005 are resolved.
  - New optional or non-blocking notes: R-10 (optional prerequisite hardening, based on a Not Reachable premise) and R-11 (stale Migration Plan trigger wording).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-004 | Open (High) | Resolved | SR-006; design-spec "SR-006 Resolution → Released-migration ordering and dependencies", checklist items 5, 7 and 8(g) | Position immediately after `20260901` with prerequisites. Disposition table covers `20260814`, `20260824`, `20260819`, `20260901` (+transitions), `20260926`, `20260905` and later migrations. Frozen module sized. `20260905` adaptation. Skip-version fixture. Runner list order and read-only behavior of `20260926`/`20260905` confirmed at `f2924a2b0` |
| AR-005 | Open (Low) | Resolved | SR-006; design-spec Terminology (liveness, shutdown commit, predicate uses, command gating) | Predicate consistent with upstream handle semantics (`dispose`, `ensureReady`, `isActive`); `approve_tool`/`interrupt` gated without calling the handle |
| R-8 | Recommendation | Addressed | SR-006; checklist heading and item 7 "Boundary contracts" | Published numbering; STARTUP_ONLY / RESTART_TO_RETRY; runner summary; attempt-log reasons |
| R-9 | Recommendation | Recorded | SR-006 "Downstream re-review after the rebase" | Present |

- New or remaining finding IDs: None (non-blocking R-5, R-6, R-7, R-10, R-11)
- Material classification changes: P-05 resolved; the P-05 sub-premise (whole-migration write failure) is Not Reachable
- Recommended recipient: `/implementation_engineer` (primary), then `/solution_designer` (informational)
- Remaining risks or uncertainty: the rebase onto `f2924a2b0` or later; downstream gates must be re-run on the rebased basis; validation obligations (checklist item 8(a)–(g), AC-006, AC-007 per runtime, R-4).

### ARCH-REV-005 — SR-007 re-review: tolerant tree reading replaces the migration

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/design-review-report.md`
- Review round and trigger: Round 5. Solution Designer revised package SR-007 after the user's DEC-008 decision, 2026-09-29 (time-sensitive).
- Triggering role, report path, and finding IDs: `solution_designer`, `solution-handoff.md` (Round 5 section); N/A
- Relevant solution revision IDs: SR-007 (requirements delta plus design; explicit user approval quoted in the requirements status block)
- Prior authoritative decision: `Pass` (ARCH-REV-004, on SR-006)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The persisted-data decision changes from `Migration Required` to `Directly Usable — No Migration`, on the user-approved basis REQ-018 and DEC-008.
  - I verified at `f2924a2b0`:
    - V1 trees are still rejected structurally (the uppercase `runtimeKind` values fail the current enum);
    - `20260901` uses the strict validator as its flat-versus-nested classifier, which justifies the frozen strict module;
    - the tree `schemaVersion` consumers, including the stream DTOs (R-13).
  - New premises P-07 and P-08 are Not Reachable.
  - New non-blocking notes: R-12 (stale migration-era statements; SR-007 takes precedence), R-13 (the DTO `schema_version` decision) and R-14 (write the delegator only for children that have one). R-10 is obsolete.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-004 | Resolved (ARCH-REV-004) | Superseded. There is no new migration. Its released-migration dependency concern now applies to the frozen strict-classifier module, which I verified | SR-007 "Released migrations after this revision" | Disposition table and the `agent-org-history-candidate-plan.ts:86` classifier check |
| AR-001, AR-002, AR-003, AR-005 | Resolved | Still resolved | SR-007 "everything else stands" | Unchanged sections |

- New or remaining finding IDs: None (non-blocking R-5, R-6, R-7, R-11, R-12, R-13, R-14)
- Material classification changes: persisted-data decision now `Directly Usable — No Migration`; P-05 moot; P-07 and P-08 Not Reachable
- Recommended recipient: `/implementation_engineer` (primary), then `/solution_designer` (informational)
- Remaining risks or uncertainty:
  - Pending: removal of the in-progress migration code, the rebase, and a re-run of the downstream gates on the rebased basis.
  - Validation obligations: SR-007 evidence items 1–5, AC-006/AC-007.
