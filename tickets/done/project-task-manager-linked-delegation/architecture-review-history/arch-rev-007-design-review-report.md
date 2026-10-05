# Design Review Report — ARCH-REV-007 (SR-022 Accepted-Message Recording, layered on SR-021)

This report is authoritative for the latest result. ARCH-REV-006 (Pass, SR-021) is archived byte-exact at `architecture-review-history/arch-rev-006-design-review-report.md` (sha1 `3040064c…`). Its SR-021 verdicts, premises RV-MP-014–016 and notes N1–N3 still apply and are not repeated here. N1 has since been applied as a factual correction to SR-021 §5 F01 (verified at design-spec line 795).

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`. REQ-BL-008 is Approved and unchanged.
- Upstream Investigation Notes: `investigation-notes.md`, E-083 (SR-022).
- Upstream Solution Revision Record: `solution-revision-record.md`, SR-022 entry (and SR-021).
- Reviewed Design Spec: `design-spec.md`, section "SR-022 Accepted-Message Recording (CRR-024 addendum F08)", plus the corrected SR-021 §5 F01 sentence.
- Supplemental Task Artifacts Reviewed: `solution-design-handoff.md` (SR-022). Triggering evidence: `code-review-report.md` CRR-024 addendum, **CR24-F08** (CAND-04 re-judged).
- Relevant Solution Revision IDs: **SR-022** (delta), SR-021 (ARCH-REV-006 Pass basis), SR-014 (semantic basis).
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: **ARCH-REV-007**. Current Review Round: 7.
- Trigger: Solution Designer "Architecture Design Complete (revised)" for SR-022.
- Prior Review Round Reviewed: ARCH-REV-006 (Pass, SR-021 only).
- Current-State Evidence Basis: I read these source files independently at HEAD `ccb5fbe3`:
  - `root-task-execution-lifecycle.ts`: `withLiveLease`/`recordMessageAccepted`, `recordMessage = true` default
  - every `withLiveLease(` call site: root facades `root-team-run.ts:324,328,343,350`, `agent-org-run.ts:226,230`, `standalone-agent-run-root.ts:270,274`; delivery services `team-run-message-delivery.ts:67,82`, `agent-org-run-message-delivery.ts:71,89,157,162`, `standalone-root-message-delivery.ts:203,207,233`
  - `ProjectTaskService.recordDispatch`
  - `ProjectStore.updateState` and the shared `persistence/file/store-utils.ts` `updateJsonFile` (15 non-test callers)
  - `RootOperationGate` / `RootTeamRunMaterializationGate`, which are counting barriers and do not serialize operations

  I ran no tests and made no source, test or Git changes.

## Routing Classification Review

- Cumulative package: Large / High. The SR-022 delta is small. Independent review required: **Yes**, because the cumulative package stays on the Reviewed route. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- Approved intent: a link's `delivered` state is the business "accepted" outcome. For seeded work that is seed acceptance (BEH-005/AC-002). For a seedless helper it is the first accepted message (BEH-009). DTO mapping: accepted / not_confirmed / failed (BEH-010).
- Existing behavior confirmed: `recordMessage` defaults to true. Root-facade sender leases wrap delivery-service target leases, so each accepted Task-owned message calls the locked whole-file `recordDispatch('delivered')` for the sender's innermost execution and again for the target's. `delivered` is monotonic: `recordDispatch` rejects a reset from it.
- Scope guardrail: in scope is removing unnecessary `delivered` rewrites (CR24-F08). No behavior, DTO, fence or persisted-shape change.

| Behavior ID | Kind | Design Alignment | Trigger / Current Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-005 seed acceptance → delivered | System | Pass | Pass: `dispatchTaskCopy` records delivered after `acceptSeed` | Pass: unchanged | Confirmed | — |
| BEH-009 helper first message → delivered | System | Pass | Pass: helper bring-in resolves inside `deliverToAddress`, then the **target** lease (`team-run-message-delivery.ts:67`, Org `:71`, standalone `deliverTo :233`) records | Pass: these are receiver sites and opt in | Confirmed | — |
| Operator post to an owned agent | User | Pass | Pass: `root-team-run.ts:350`, Org `:162`, standalone `:207` default-record today | Pass: opt in, preserved | Confirmed | — |
| BEH-010 business DTO | User | Pass | Pass | Pass: unchanged | Confirmed | — |

## Structural Review Of The SR-022 Delta

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Change 1: opt-in, receiver-only recording | **Pass** | The site list matches source exactly: team 67/82 + operator 350; Org 71/89 + operator 162; standalone 233 + operator 207. Non-recording: sender facades (team 324/328, Org 226/230, standalone 270/274) and non-message direct commands (team 343, Org 157, standalone 203, already `false`). Sender-side recording has no business meaning: the sender's own link was made `delivered` by its seed or first received message. Defaulting to false makes recording an explicit receiver decision. |
| Change 2: first transition only, lock-free pre-read | **Pass** | Sound because `delivered` is monotonic, so a stale read can only show "not yet delivered" and fall through to the existing locked, validating `recordDispatch`. This removes the steady-state write (the actual CR24-F08 consequence) with no new state or owner. |
| Change 3: `recordDispatch` no-op on unchanged + store "updater reports unchanged → skip serialize/replace" | **Fail → AR7-F01** | See Findings. |
| Ownership / boundaries / dependency direction | Pass | Recording stays in the root lifecycle (receiver decision) and the Task service (durable state). No new owner. |
| Persisted data | Pass (Not Affected) | No shape change. |
| Removal | Pass | The default-true `recordMessage` boolean is replaced, not kept beside the new option. |
| Verification intent | Pass for Changes 1–2 | "0 writes once delivered; exactly 1 for helper first message; sender lease never changes sender link". The "unchanged recordDispatch performs no write" line falls with AR7-F01. |

## Material Premise Validation

### RV-MP-017 — After Changes 1–2, `recordDispatch('delivered')` is still called on an already-`delivered` link

- Related contract: CR24-F08 (remove unnecessary work); DESIGN.md rules 1/5; design-principles P6 proportionality.
- Initiating basis: System. Two Task-owned messages to the same not-yet-delivered receiver are accepted concurrently. Example: two owned workers in one lifetime message a freshly brought-in helper address at the same time. `helperAttempts` dedupes creation, then both deliveries reach the target lease.
- Forward path: root facades enter `RootTeamRunMaterializationGate.run` / `RootOperationGate.run`. These are counting barriers for close/drain and do **not** serialize operations. Both target leases complete. Both lock-free pre-reads observe `admitted`. Both call locked `recordDispatch('delivered')`. The second runs under the file lock after the first commits and finds `delivered`.
- Reachability: **Reachable**, but rare.
- Material consequence: one extra atomic rewrite of byte-identical content under the existing lock. There is no correctness, fence, DTO or ordering impact, and no evidenced latency or contention. CRR-024 rejected even the far more frequent per-message rewrites on measured cost and promoted F08 only on business purpose.
- **Not material**, so it cannot justify new store machinery. See AR7-F01.

### RV-MP-018 — Indeterminate-seed healing after Change 1 (note only)

- Today a link left `admitted` by a failed seed-`delivered` record is healed by any accepted message involving the worker, including its own sends (sender lease). After SR-022, only a message it receives heals it.
- Initiating premise: a Projects write failure after the seed was actually accepted. This is an infrastructure I/O failure, outside scope by default, and it already surfaces as `TaskDispatchIndeterminateError`. No supported scenario depends on sender-side healing.
- Not a finding. SR-022's "still healed … by the receiver's next accepted message" is accurate for the receiver path only. Implementation must not re-add sender recording for this.

## Findings

### AR7-F01 — Store "no-change" transaction mode is unjustified machinery (Design Impact, Low; blocking for this delta)

- Type: Design Impact. Scope: **Within Approved Scope**. Changes approved behavior: **No**.
- Protected authority:
  - CR24-F08's own basis, DESIGN.md rule 5 ("Remove unnecessary work before adding complexity … New owners/state must have concrete responsibilities") and rule 1 (no speculative guards or layers)
  - design-principles P6 ("Require additional state, APIs, abstractions, coordination … only when they address a supported reachable material problem and are proportionate")
  - preserved BEH-006: `ProjectStore.updateState` is the sole physical authority and carries the DONE atomic commit plus the `onCommitted` latch callback
- Evidence:
  - After Changes 1–2, the only remaining same-state `recordDispatch` is the concurrent first-acceptance race in RV-MP-017. Its consequence is one identical rewrite.
  - Change 3 would add an "updater reports unchanged" mode to the store transaction. `ProjectStore.updateState` delegates to the shared `updateJsonFile` (`store-utils.ts:212-227`, 15 non-test callers), which always writes and calls `onCommitted`. A skip path would mean either widening that shared utility or duplicating its lock/atomic-replace logic inside ProjectStore. It would also force a decision on `onCommitted` and return-value semantics on the same seam the DONE latch uses.
  - The design leaves the exact signature to implementation, so it prescribes a new mode in the Projects transaction without defining it.
- Required update: remove Change 3 from SR-022:
  - drop the store "unchanged → skip serialize/replace" mode
  - drop the `recordDispatch` "no rewrite when equal" requirement
  - drop `projects/stores/project-store.ts` (and any store-utils change) from the file list
  - drop the verification line "recordDispatch with an unchanged state performs no write"

  Keep Changes 1 and 2 as written. Record the RV-MP-017 race as an accepted, immaterial identical rewrite.
- Why this is proportionate: it removes design text and code. Changes 1–2 alone fully address the CR24-F08 consequence (sender writes and steady-state repeat writes go to zero), and the remaining effect is non-material.
- Recommended recipient: `/solution_designer`.

## Classification

**Design Impact** (AR7-F01). SR-021 remains Pass (ARCH-REV-006) and its implementation may continue. Only the SR-022 delta needs this small revision.

## Recommended Recipient

`/solution_designer`

## Residual Risks

- All SR-021/SR-022 controls are unimplemented. Source re-review and the changed-build API/E2E recheck remain required.
- RV-MP-018: an indeterminate seed link that never receives a message stays `admitted` → not_confirmed. This needs infrastructure write failure and is out of scope.
- Each Task-owned message still costs one unlocked whole-file read and parse of `projects.json` at the receiver site. This is acceptable at current sizes and not evidenced as a problem.
- DR-002 must not finalize HEAD `ccb5fbe3`.

## Latest Authoritative Result

- Review Decision: **Fail — Design Impact (AR7-F01) on the SR-022 delta only.** SR-021 remains Pass (ARCH-REV-006).
- Material-Premise Gate: **Pass**. RV-MP-017 is Reachable but not material, so it cannot justify Change 3. RV-MP-018 is out of scope (infrastructure failure), note only.
- Notes: Large/High cumulative classification preserved. Changes 1–2 pass as written. On re-review I expect a quick confirmation once Change 3 is removed.
