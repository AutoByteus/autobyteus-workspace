# Design Review Report — ARCH-REV-010 (SR-023 Task Runs, revised after ARCH-REV-009)

This report is authoritative for the latest result. The full structural review of the SR-023 boundary is in ARCH-REV-009, archived byte-exact at `architecture-review-history/arch-rev-009-design-review-report.md` (sha1 `bf749da8…`). Its passing verdicts and evidence still apply unless superseded below:
- spines, ownership, boundary encapsulation and dependency direction
- interfaces, reuse, data-model tightness, file mapping, removal and legacy handling
- persisted data: no migration (verified), change sequence and examples
- RV-MP-022

Earlier reports (ARCH-REV-005–008) covered the superseded lifetime design and remain authoritative only for the carried-forward DI-001/002, DS-008 and SR-014 sections.

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`. REQ-BL-009 is Approved (SD-AP-003), plus new explicit user decisions recorded there:
  - **C-2 amended:** one file per Task, `task_runs/<taskId>.json`.
  - **Q-3:** damaged Task run file policy.
  - **N2:** owned runs may not pass any `task_id`.
- Upstream Investigation Notes / Solution Revision Record: SR-023 entries (revised).
- Reviewed Design Spec: `design-spec.md` (SR-023 revised). Diffed against the reviewed basis `solution-history/sr-023-prior/design-spec.sr-023-arch-rev-009-basis.md`. Requirements diffed against `requirements-doc.before-arch-rev-009-revision.md`. Data model: `data-model-draft.md` (per-Task file).
- Current Architecture Review Revision ID: **ARCH-REV-010**. Round 10.
- Prior round: ARCH-REV-009, Fail — Design Impact (AR9-F01, AR9-F02, AR9-F03).
- Current-State Evidence Basis: ARCH-REV-009 source reads at `4b04d9097` / base `10fb69504f` remain valid:
  - `updateJsonFile`: per-file lock, atomic replace, synchronous `onCommitted`
  - `readJsonFile`: throws on invalid JSON
  - registry exact release retains failed operations
  - handle fences in `ensureReady`/`prepareActivation`/`postMessage`
  - root directory unregisters only on termination

  No source changed between rounds. I ran no tests and made no source, test or Git changes.

## Routing Classification Review

Large / High confirmed; Reviewed route. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- New approved items are reflected consistently across the requirements, data model, design and handoff:
  - **C-2:** a per-Task file, kept on Delete, never migrated.
  - **Q-3:** a damaged file never blocks the app. It causes:
    - rejection of that Task's assign and DONE;
    - a list marker `assignmentsUnavailable` instead of an empty assignment list;
    - while any damage exists, up-front rejection of description-only delegation by non-owned senders, and rejection of waking or messaging copies unknown to the view;
    - recovery by fixing the file and restarting, with no self-repair.
  - **N2:** owned senders get `TASK_RUN_OWNED_SENDER` for any `task_id`.
- Superseded REQ-005/REQ-009/AC-006/AC-008/AC-015 rows are marked with their Q-1/Q-2 replacements. The handoff statement is now true.

| Behavior | Status | Evidence |
| --- | --- | --- |
| BEH-003/004/005 (DS-A) | Confirmed | Unchanged from ARCH-REV-009 Pass. The linked mode is now explicitly non-owned only (N2). |
| BEH-006/007 (DS-C, retry, restart) | **Confirmed**, previously Needs Correction | AR9-F02b rule adopted (below) |
| BEH-009 (DS-B, inherited, helper) | **Confirmed**, previously Needs Correction | AR9-F02a rule adopted (below) |
| BEH-008 / BEH-010 / C-1 / C-3 | Confirmed | Unchanged |
| Damaged-file behavior (Q-3) | **Confirmed**, previously Fail | AR9-F01 resolved (below) |

## Re-Review Of Prior Findings

| Finding | Required | Current design text | Verdict |
| --- | --- | --- | --- |
| AR9-F01 | One consistent failure policy; reject task-copy creation up front; define the list behavior; tests | "Failure policy for a damaged Task run file" covers scoped rejection (the damaged Task's assign/DONE), up-front rejection of description-only delegation "before planning or any resources", and a three-way `ownerOf` (known → owner; none known and no damage → `null`; none known and damage → throw). `list_project_tasks` shows `assignmentsUnavailable: true` (never empty). Unowned root-wide collaborator bring-in is correctly excluded, because it is not a task copy. Owned delegation and bring-in for readable Tasks still work through the known chain. The verification line covers zero planning/resources. Q-3 records the user's confirmation of the narrowed wording. | **Resolved in design** |
| AR9-F02a | Preconditions evaluated in the locked updater; view swapped at commit; race test | "All write preconditions are evaluated inside the Task file's `updateJsonFile` updater …": creator present and open, in-file uniqueness, the `closeTask` open set. The view only selects the file and is swapped in `onCommitted`. The consequence is stated: an owned bring-in is either closed by DONE or rejected, never open after close. A both-order race test is added. | **Resolved in design** |
| AR9-F02b | Release driven by exact retained authority; truthful `stopped`; retry test | Root release always invokes `release()` on the registration and the exact copy/retained-receipt release regardless of liveness. `stopped` only when every release is accepted or no authority exists. A failed stop is retried by every repeated DONE. Root not active = no authority in this process (consistent with Q-1 "Root Stop or restart also ends it"). The test covers fail → repeat DONE → success → memoized no-op. | **Resolved in design** |
| AR9-F03 | Policy in REQ-BL-009; rows marked; handoff corrected | Q-3 and N2 are recorded with the user's words. C-2 amended. The rows are marked. The handoff is corrected. | **Resolved** |
| N1 | Write-time wording | Stated, with a sound rationale: DONE closes all of a Task's open runs atomically per file, so no open run has a closed creator. A closed but still-executing creator is rejected under the lock. | Resolved |
| N2 | Own `task_id` rule | User-confirmed rejection for owned senders | Resolved |
| N3 | Name the pre-commit chain | New `ownershipChainFor` (index chain + pre-commit registrations) named in the adapter rows. `taskExecutionChainFor` stays index-only for idle/restore. DS-D uses `ownershipChainFor`. | Resolved |

## Delta Structural Check (per-Task files)

| Check | Verdict | Notes |
| --- | --- | --- |
| Authority / ownership | Pass | TaskRunService is still the sole authority, now over a directory of per-Task files, with one view and a damaged set. |
| Concurrency | Pass | The per-file lock now matches the per-Task decision scope. Assigned linking vs DONE keeps `serialize(taskId)` for the cross-file status check. Inherited links and closes are decided under the same Task file's lock. |
| Cross-Task run uniqueness | Pass | Linked runs are freshly planned copies, and the view asserts uniqueness on link. Only an invariant check, not a correctness dependency. |
| Persisted data | Pass | A new folder, never shipped; a missing file means no runs; kept on Delete; no migration. |
| Startup work | Pass | One read per Task that ever had runs, needed for the synchronous fences. This is not unrelated discovery (DESIGN.md rule 3). Damage is non-fatal. |
| Failure surfaces | Pass | Existing ProjectError → UI alert, tool result and rejected command; no new UI. |

## Material Premise Validation

- RV-MP-019 (unreadable file + unowned fresh delegation): the premise holds. The consequence is now handled by up-front rejection before planning (Q-3). **No finding.**
- RV-MP-020 (owned bring-in vs DONE): Reachable; handled by the lock-local evaluation and `onCommitted` swap. **No finding.**
- RV-MP-021 (repeat DONE after a failed stop): Reachable; handled by authority-driven release. **No finding.**
- RV-MP-022: unchanged, Supported.
- No in-scope machinery depends on an unsupported premise.

## Findings

None blocking.

Non-blocking implementation notes:
- **N4 (port surface for Q-3's up-front check):** the `TaskRunPort` sketch has no synchronous query for "the damaged set is non-empty". The lifecycle `delegate` needs one for description-only delegation by a non-owned sender before `planActivation`. Add one, such as `assertRunDataReadable()`, to `task-run-port.ts`, implemented by ProjectTaskService over the view. `resolveAssignment`'s `sender.ownerTaskId?` is vestigial under N2: owned senders are rejected before it. Drop it or use it only for that rejection.
- **N5 (per-Task filename safety):** derive `task_runs/<taskId>.json` only from Task IDs already resolved through `projects.json` or the view. At load, keep the filename ↔ `taskId` check and ignore names that are not Task-ID-shaped, so no path is built from raw tool input.
- **N6:** the `assignmentsUnavailable` marker is part of the Manager's business read. Keep the error wording business-level ("assignments unavailable"), consistent with REQ-013.

## Classification

N/A (Pass).

## Recommended Recipient

Primary: `/implementation_engineer`, then an informational Pass notice to `/solution_designer`, per post-result rules.

## Residual Risks

- All SR-023 controls are unimplemented. That includes:
  - invariants and atomic writes;
  - the damaged-file behavior, with zero planning or resources;
  - the both-order race;
  - the own-ID rejection;
  - assignment-link vs DONE;
  - DONE before register / after register / after commit;
  - inherited links from a closed creator;
  - two-Task helper isolation;
  - message-scope conflict;
  - restart, reopen and Delete fences;
  - failed stop → repeat DONE;
  - Task-free trees;
  - released `projects.json` round-trip and dev lifetime-row tolerance;
  - the dependency greps.
- Independent code review, then API/E2E on a changed build (the IR-012 recheck stays paused), then Delivery docs resync.
- Accepted: the single writer process; accumulating per-Task files (no pruning); fail-closed behavior for unknown copies while any file is damaged (Q-3); root Stop/restart ends retry authority (Q-1).
- Provider-private teardown is carried forward and not re-traced.
- **DR-002 must not finalize `ccb5fbe3` / `4b04d9097`.**

## Latest Authoritative Result

- Review Decision: **Pass — SR-023 revised (ARCH-REV-010)**
- Material-Premise Gate: **Pass**
- Notes: Large/High preserved. AR9-F01/F02/F03 are resolved in design. This is a design Pass, not source or API acceptance.
