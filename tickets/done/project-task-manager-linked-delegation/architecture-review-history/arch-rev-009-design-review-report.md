# Design Review Report — ARCH-REV-009 (SR-023 Task Runs / REQ-BL-009)

This report is authoritative for the latest result. Prior reports are archived byte-exact in `architecture-review-history/`:
- ARCH-REV-005: SR-014
- ARCH-REV-006: SR-021
- ARCH-REV-007: SR-022
- ARCH-REV-008: SR-021 + SR-022a, sha1 `0a84f6b2…`

Those reviewed the superseded lifetime design. They remain authoritative only for the sections SR-023 explicitly carries forward: DI-001/DI-002 provider ownership, DS-008, the SR-014 business Manager, and the single composition binding. Their N2 note (process-instance release) is absorbed into the SR-023 composition row.

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`. **REQ-BL-009 Approved (SD-AP-003)**; it replaces REQ-BL-008 where they differ (C-1–C-3, B-1–B-7, Q-1, Q-2).
- Upstream Investigation Notes: `investigation-notes.md`, E-084–E-093.
- Upstream Solution Revision Record: `solution-revision-record.md`, the SR-023 entries, including the two "SR-023 refinement (user, 2026-10-05)" bullets on the unreadable-file policy.
- Reviewed Design Spec: `design-spec.md` (rewritten for SR-023). Behavior-defining supplement: `data-model-draft.md` (approved, authoritative). Carried-forward authority: `solution-history/sr-023-prior/design-spec.sr-022a-final.md`, named sections only.
- Triggering evidence: `code-review-report.md` CRR-026 (data-model review, Design Impact).
- Relevant Solution Revision IDs: **SR-023**.
- Current Architecture Review Revision ID: **ARCH-REV-009**. Round 9.
- Prior round: ARCH-REV-008 (Pass on the superseded SR-021 + SR-022a design; not applicable to SR-023's new boundary).
- Current-State Evidence Basis: I independently read source at HEAD `4b04d9097` (IR-012) and base `10fb69504f`:
  - the released `ProjectStore`: `readJsonArrayFile` with an `isValidProject` row filter, so a non-Project `{taskLifetimes}` row is dropped
  - `store-utils` `readJsonFile`: throws on invalid JSON and falls back only on ENOENT
  - `updateJsonFile`: lock, atomic replace, then a synchronous `onCommitted`
  - the tree record schemas: tolerant parse that projects known fields only, so dropping `taskLifetime` needs no migration
  - `ActiveCollaborationRootDirectory` and the three managers' `unregister`: a root is unregistered only on termination; a Team stays registered if its stop is incomplete
  - adapter `taskExecutionChainFor`: index only today
  - the registries' `release`: exact operation release when retained, otherwise the handle's `releaseRuntime`, else `EXACT_RELEASE_AUTHORITY_UNAVAILABLE`
  - `isLive`/`hasLiveDirectTaskExecution`
  - `ConfiguredAgentExecutionHandle`: `assertInputAllowed` runs in `ensureReady`, `prepareActivation`, `reserveInput`, `postMessage` and approvals
  - the lifecycle `withLiveLease`/`acquireLiveLease`

  I ran no tests and made no source, test or Git changes.

## Routing Classification Review

- Task size **Large**, architectural risk **High**: confirmed. The change replaces the persisted ownership authority and the Task ↔ runtime contract across the closed-forever fence, startup-race ordering and cross-file DONE ordering. Independent review required: **Yes**.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**, with one package-coherence correction (AR9-F03) that does not change approved intent.
- Approved intent understood:
  - The tree is Task-free (C-1). `task_runs.json` is the sole Task ↔ run record (C-2). Released `projects.json` is used with no migration (C-3).
  - Roles are assigned/delegated/broughtIn. A run belongs to at most one Task; borrowed runs and @ collaborators never belong (B-1). There is one host root per assignment (B-2).
  - DONE closes every open run forever, then stops exactly those runs (B-3). Reopen creates new open runs (B-4). Delete is unchanged and records are kept (B-5). The link is written before resources (B-6).
  - Q-1: no shutdown state on disk; repeated DONE retries; failures are logged and kept in memory.
  - Q-2: global list with open `assigned` runs.
  - User refinement (SRR): an unreadable `task_runs.json` never blocks the app; only the run-ownership actions error; the fix is to repair the file and restart.
- Scope guardrail: provider/private activation (DI-001/002), DS-008 public projection and the SR-014 Manager prompt are carried forward unchanged. Out of scope: pruning, per-Project folders, self-repair and background retry.

| Behavior ID | Design Alignment | Trigger / Current Evidence | Target Path Coherence | Status | Action |
| --- | --- | --- | --- | --- | --- |
| BEH-003/004/005 (linked dispatch, link before resources, Q-2 read) | Pass | Pass (E-091 dispatch order; lifecycle `delegate`) | Pass. DS-A: identity plan → serialized status-checked link → register only if `isOpen` at queue head → prepare/commit/seed with `isOpen` after each await → `markStarted`. | Confirmed | — |
| BEH-006/007 (DONE close forever, exact stop, repeated DONE retry, restart) | Pass | Pass | **Needs Correction**. The rule "non-live → stopped:true with no work" is not tied to the exact release authority (AR9-F02b). | Needs Correction | AR9-F02 |
| BEH-009 (delegated/broughtIn inherit; no sharing; per-Task helper) | Pass | Pass (E-084/E-090) | **Needs Correction**. The place where the creator-open and close-set decisions are evaluated is unspecified (AR9-F02a). | Needs Correction | AR9-F02 |
| BEH-008 (Delete unchanged, records kept) | Pass | Pass | Pass (`task_runs.json` untouched by Delete; fences survive) | Confirmed | — |
| BEH-010 (business-only contract) | Pass | Pass | Pass (Q-2 projection; stop results never returned) | Confirmed | — |
| Unreadable-file policy (user refinement; governs preserved unlinked AC-005 under that condition) | Pass (intent) | Pass (`readJsonFile` throws; fences are synchronous) | **Fail**. The "still works" list contradicts the DS-D fence for fresh unlinked copies, and `list_project_tasks` behavior is unspecified (AR9-F01). | Needs Correction | AR9-F01 |
| C-1/C-3 no migration | Pass | Pass (released row filter; tolerant tree parser verified) | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Action |
| --- | --- | --- | --- | --- | --- | --- |
| data-model-draft.md | Pass | Pass | Pass | Pass with note: the "checked on every read and write" rule for "delegated/broughtIn added only while creator open" is write-time only, because lineage is not stored. | Pass | Non-blocking wording |
| requirements-doc.md vs SRR user refinement | Pass | **Fail** | **Fail** | **Fail** | Pass (approval exists) | AR9-F03 |
| Archived design (carried-forward sections) | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

Pass. The design names a Boundary Or Ownership Issue, evidence-backed by E-084–E-093 and my reads: two homes for ownership plus copied runtime outcomes, with reconciliation machinery that existed only to keep them consistent. Refactor now, with one owner per fact and net deletion. The decision is reflected in the Ownership, Removal, File and Sequence sections.

## Spine / Ownership / Boundary / Dependency Verdicts

| Area | Verdict | Notes |
| --- | --- | --- |
| Spine inventory (DS-A … DS-G; DS-007/008 carried) | Pass | Spans from the Manager tool to linked worker / exact stop / list projection; bounded local spines named. |
| Ownership | Pass | TaskRunService is the sole `task_runs.json` authority with its own in-memory view (no second holder). ProjectTaskService is the Task boundary implementing the neutral port. Runtime adapters, indexes and trees are Task-free. RootTaskRunScope is stateless. |
| Boundary encapsulation | Pass | Tools, GraphQL and the runtime reach run facts only through ProjectTaskService; Projects reaches roots only via the composition-bound request. |
| Dependency direction | Pass | Runtime → neutral `task-run-port.ts` only; Projects → neutral types only; one composition. Greps specified, including `run-history`. |
| Interfaces | Pass | Tagged run reference; role-discriminated `linkRun`; synchronous view queries separated from asynchronous writes; `TaskRunStopResult` in memory only. Note: an owned worker calling `delegate_task(task_id = own Task)` would create an `assigned` run with `assignedBy` = the worker, listed as a current assignment. The port allows it; the design should say so explicitly (non-blocking). |
| Reuse | Pass | Released ProjectStore; `readJsonFile`/`updateJsonFile`; existing lifecycle, registries and directory. |
| Data model tightness | Pass | Tagged unions, no optional error/cleanup soup, no runtime facts. |
| File mapping / placement | Pass | `projects/{stores,domain,services,runtime}` and the neutral port in `agent-collaboration/execution/task`. |
| Removal | Pass | Complete inventory: gate, listener, admission, reports, recordCleanup, stamp, acceptance recording, lifetime schema/store, Task adapter/index methods. |
| Legacy / compat | Pass | No stamp fallback, no conversion, no treating an unreadable file as empty. |
| Persisted data | Pass | `projects.json` Directly Usable (released row filter verified); trees Directly Usable (tolerant projection verified); `task_runs.json` new; context not affected. |
| Change sequence | Pass | Realistic; tests retargeted; docs owned by Delivery. |
| Examples | Pass | Same-root two-Task, restart, reopen and delete examples. |

## Material Premise Validation

### RV-MP-019 — Unreadable `task_runs.json` while an unowned sender creates a fresh unlinked copy

- Basis: Contract. User refinement (SRR, 2026-10-05): the app stays usable; only run-ownership actions error.
- Trigger: a damaged or invalid file at startup → view `unavailable`. The Manager (empty chain) calls `delegate_task` without `task_id`, which the design lists as "still works".
- Forward path:
  1. DS-A for unlinked work: plan → register → prepare.
  2. During preparation `ConfiguredAgentExecutionHandle.prepareActivation`/`ensureReady` calls `assertInputAllowed` → root `assertExecutionInputAllowed` → RootTaskRunScope.
  3. The chain is non-empty: the copy itself, with pre-commit registrations included per E-090/design. So `port.ownerOf` throws `TASK_RUNS_UNAVAILABLE`.
  4. If preparation survives, the seed `postMessage` hits the same fence. Every later message or wake to that copy, and the copy's own `send_message_to` sender check, fail the same way.
- **Reachable** under the governing contract.
- Consequence: the design's promise is false. Resources may be acquired and then released through the failure path; after commit, an unreleased cleanup becomes `TaskDispatchIndeterminateError`. The Manager receives a dispatch failure or uncertainty instead of the clear upfront error the policy promises. → AR9-F01.

### RV-MP-020 — Owned worker bring-in/delegation racing DONE (AC-011)

- Basis: System, supported. An owned Team member calls `send_message_to(newAddress)` or `delegate_task` while the Manager or user sets DONE.
- Forward path: DS-B `ownerOf(chain)` reads the view as open → `linkRun({creator})`. Meanwhile DS-C `closeTask` writes `closedAt` for the open runs. Both are `task_runs.json` transactions serialized only by the file lock; inherited linking is deliberately not under `serialize(taskId)`.
- Under the lock: if the creator-open check or the close set is computed from the pre-transaction view rather than the file read inside the same `updateJsonFile` updater, this order is possible:
  1. the link commits after the close, as an open run of a closed Task;
  2. its queue-head `isOpen` returns true, so it registers;
  3. DONE's release, already computed, does not name it.

  That breaks B-3/AC-011 ("no new helper can escape").
- **Reachable.** The design states the rule ("links only if the creator run is open") but not its evaluation point. → AR9-F02a.

### RV-MP-021 — Repeated DONE after a failed shutdown (Q-1 retry)

- Basis: Contract (Q-1): "Runs already stopped are skipped; runs still live are retried"; "A failed shutdown is kept in memory"; AC-015 "never reports a shutdown it did not achieve".
- Forward path: the first DONE's exact stop fails, and DI-001/002 retain the exact operation/receipt (registries `release`: retained `operation.release()`). The handle may no longer satisfy `isLive`/`hasLiveDirectTaskExecution`. On the second DONE, root `releaseTaskRuns` follows the design rule "non-live runs return `stopped: true` with no work".
- Result: a retained failed release is never retried and is reported stopped.
- **Reachable** under Q-1. → AR9-F02b.

### RV-MP-022 — "Root not active (`null`) ⇒ nothing live there"

- Basis: System. The root directory unregisters only via the termination paths (standalone `onTerminated`; Team `completeStoppingRoot` throws and keeps it registered when stop is incomplete; Org likewise).
- **Supported.** Logging at debug level is proportionate. No finding.

## Findings

### AR9-F01 — Unreadable-file policy is internally inconsistent (Design Impact, Medium)

- Protected authority: user refinement (SRR SR-023: "only the run-ownership actions show a clear error"); REQ-BL-009 C-2/B-3; design "no fallback that treats an unreadable `task_runs.json` as empty"; preserved REQ-003/AC-005 unlinked delegation. Scope: Within Approved Scope. It does not change approved behavior, unless the designer's resolution narrows the user's "still works" wording; then confirm with the user.
- Evidence: RV-MP-019.
  - The "Still works" list includes "fresh delegation by unowned senders", but every fresh copy's own preparation, seed and messages pass DS-D, which fails closed for any non-empty chain. Under C-1 the runtime cannot distinguish linked from unlinked copies.
  - `list_project_tasks` (Q-2 assignments from the view) is not specified while the view is unavailable. "Browsing still works" combined with "never treat unreadable as empty" leaves the tool's observable result undefined, and a silent empty `assignments` would defeat Q-2's duplicate-work purpose.
- Required update: make the failure policy one consistent, explicit list.
  1. Creating any task copy (`delegate_task` in either mode, and helper bring-in) while unavailable is rejected upfront with `TASK_RUNS_UNAVAILABLE`, before planning or resources. This is the direct consequence of "message/wake delegated copies" being rejected. If you instead keep unlinked creation working, specify how its copy's inputs pass the fence without new runtime Task state.
  2. Specify `list_project_tasks` while unavailable: reject with the clear error, or return Tasks with an explicit unavailable marker, but never an empty assignment list.
  3. Add both to the verification intent.
- Proportionality: a design-text decision plus an early check at existing entry points. No new state.

### AR9-F02 — Two correctness-critical evaluation rules are unstated or mis-stated (Design Impact, Medium)

- Protected authority: B-3 (closed forever; stop exactly), B-6/AC-011 (never miss a startup), Q-1 (repeated DONE retries live runs; failures kept in memory), AC-008/AC-015 (never report a shutdown not achieved). Scope: Within Approved Scope. Changes behavior: No.
- **(a) Transaction-local decisions** (RV-MP-020). State that TaskRunService evaluates, inside the same `updateJsonFile` updater, from the file content read under the lock:
  - the inherited-link preconditions (creator linked, open, same Task)
  - the assigned link's uniqueness
  - `closeTask`'s set of open runs to close

  Never use the pre-transaction view for these. The view is replaced synchronously at commit (the existing `onCommitted` hook), so no post-commit window shows a closed run as open. Add a race control: an owned bring-in link versus DONE, in both orders, yields either a rejected link or a closed run that never registers.
- **(b) Release is driven by exact authority, not liveness** (RV-MP-021). For every closed run named in the request, the root always:
  1. cancels synchronously;
  2. invokes the exact release (registration operation and/or the registry's exact runtime release; DI-001/002 success-memoized and idempotent);
  3. reports `stopped: true` only when that release is accepted, or when the exact owner holds no authority at all (never acquired, or already released / root-terminated).

  Replace "Non-live runs return `stopped: true` with no work" with that rule. Add a control: a failed first stop, then repeated DONE, retries the same retained receipt and logs truthfully.
- Proportionality: two precise rules and two tests, with no new state. Both are realizable with the existing lock/updater and the retained DI-001/002 receipts.

### AR9-F03 — Requirements authority does not carry the approved unreadable-file policy; superseded rows are unmarked (Package coherence, Low)

- Evidence:
  - The user refinement exists only in `solution-revision-record.md` (SR-023 refinement bullets). `requirements-doc.md` REQ-BL-009 has no unreadable-file statement, although `solution-design-handoff.md` says it is recorded there.
  - REQ-BL-009 Q-1 says "AC-015 is reworded accordingly", but the AC-015, AC-008 and REQ-009 rows still require persisted pending/failed/released diagnostic state.
  - The REQ-005/AC-006 rows still carry the old projection.

  The precedence sentence makes authority technically resolvable, but downstream API/E2E needs the approved failure behavior in the requirements authority.
- Required update:
  - Add the unreadable-file policy (as finally resolved by AR9-F01) to REQ-BL-009.
  - Reword AC-015, or mark AC-008/AC-015/REQ-009/REQ-005/AC-006 as superseded by Q-1/Q-2.
  - Correct the handoff statement.

  No new approval is needed if the policy matches the user's direction. If AR9-F01's resolution changes what the user approved, obtain confirmation.

### Non-blocking notes

- N1: in the data model, "delegated/broughtIn only while creator open" is a write-time invariant; it cannot be re-checked on read without lineage. Word it that way.
- N2: state whether an owned worker may `delegate_task` its own Task ID, which yields an `assigned` run listed with `assignedBy` = the worker. The port permits it.
- N3: the containment chain "including pre-commit registrations" (E-090) is new adapter behavior. Today `taskExecutionChainFor` is index-only, so name it in the adapter Modify row (`registrationFor` / chain).

## Classification

**Design Impact** (AR9-F01, AR9-F02), plus package coherence AR9-F03. There is no Requirement Gap, provided AR9-F01's resolution stays within the user's stated direction.

## Recommended Recipient

`/solution_designer`

## Residual Risks

- The single-writer process assumption (existing).
- `task_runs.json` grows without pruning (out of scope).
- `isOpen` check discipline after awaits in dispatch, relying on race tests.
- The fail-closed behavior for all delegated copies while the file is unreadable, accepted by the user, must be visible in the requirements (AR9-F03).
- Provider-private teardown is carried forward unchanged and not re-traced.
- DR-002 must not finalize `ccb5fbe3` / `4b04d9097`. The IR-012 API/E2E recheck is paused.

## Latest Authoritative Result

- Review Decision: **Fail — Design Impact** (AR9-F01, AR9-F02; coherence AR9-F03)
- Material-Premise Gate: **Pass**. RV-MP-019/020/021 are Reachable under supported or governing contracts and drive the findings. RV-MP-022 is supported with no finding.
- Notes: the overall SR-023 architecture holds up: one authority, a Task-free runtime, no migration (verified), and large deletion. The findings are bounded rule and text corrections with no structural rework, and I expect a quick re-review.
