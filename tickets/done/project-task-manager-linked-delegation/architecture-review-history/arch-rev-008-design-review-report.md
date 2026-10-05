# Design Review Report — ARCH-REV-008 (SR-022a: SR-022 without Change 3, layered on SR-021)

This report is authoritative for the latest result: a cumulative design Pass for SR-021 + SR-022a. Earlier detail is archived byte-exact and still applies where not superseded:
- `architecture-review-history/arch-rev-006-design-review-report.md` (sha1 `3040064c…`): full SR-021 structural review, RV-MP-014–016, implementation notes N1–N3
- `architecture-review-history/arch-rev-007-design-review-report.md` (sha1 `6f7234e4…`): SR-022 Change 1–2 structural review, RV-MP-017/018, AR7-F01

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`. REQ-BL-008 is Approved and unchanged.
- Upstream Investigation Notes: `investigation-notes.md` (E-079–E-083).
- Upstream Solution Revision Record: `solution-revision-record.md`, entries SR-021, SR-022 and **SR-022a**.
- Reviewed Design Spec: `design-spec.md`, sections "SR-021 Lifetime Authority, Membership And Composition" and the revised "SR-022 Accepted-Message Recording".
- Supplemental: `solution-design-handoff.md` (SR-022a). Triggering evidence: `code-review-report.md` CRR-024 (F01–F08).
- Relevant Solution Revision IDs: SR-021, SR-022, **SR-022a**.
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: **ARCH-REV-008**. Current Review Round: 8.
- Trigger: Solution Designer "Architecture Design Complete (revised)" for SR-022a, resolving AR7-F01.
- Prior Review Round Reviewed: ARCH-REV-007 (Fail — Design Impact AR7-F01 on the SR-022 delta; SR-021 Pass retained).
- Current-State Evidence Basis: I verified the revised SR-022 text and searched the core artifacts for residual Change 3 language:
  - The only "store no-change" mention is the withdrawal note in design-spec.md.
  - The `project-store.ts` mention at design-spec line 348 is the pre-existing SR-011 persistence mapping, unrelated to this delta.
  - Solution-revision-record line 402 is the historical SR-022 entry, superseded by SR-022a at line 407.

  The source facts from ARCH-REV-007 (`withLiveLease` sites, monotonic `delivered`, `updateState` → `updateJsonFile`, non-serializing root gates) were checked at HEAD `ccb5fbe3` and are unchanged. I ran no tests and made no source, test or Git changes.

## Routing Classification Review

Cumulative Large / High; Reviewed route required. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**. The behavior rows for BEH-003/005/006/007/009/010 confirmed in ARCH-REV-006 and ARCH-REV-007 are unchanged:
  - seed acceptance and a helper's first received message still record `delivered`
  - operator posts record
  - sender leases and non-message commands do not record
  - DTOs, fences and indeterminate mapping are unchanged

## SR-022a Delta Verdict

| Check | Result | Evidence |
| --- | --- | --- |
| AR7-F01 required update applied | **Pass** | Change 3 is withdrawn. The store no-change mode and the `recordDispatch` equal-state no-op are removed. The SR-022 file list now states "No Projects service or store change". The "unchanged recordDispatch performs no write" verification line is removed. |
| Changes 1–2 unchanged and correct | Pass | Same receiver opt-in site list and lock-free first-transition pre-read reviewed in ARCH-REV-007 |
| RV-MP-017 recorded as accepted and immaterial | Pass | Recorded in the design's "Accepted race" bullet |
| RV-MP-018 recorded; no sender recording re-added | Pass | Recorded in the design's "Accepted limit" bullet |
| Verification intent coherent | Pass | "0 writes once delivered (non-concurrent case); exactly 1 for a helper's first message; a sender lease never changes the sender link; existing helper/seed/indeterminate tests green" |
| Ownership, dependency, persisted data, removal | Pass | No new owner or state. Persisted data Not Affected. The default-true boolean is replaced, not kept beside the new option. |

## Cumulative Structural Verdict (SR-021 + SR-022a)

The SR-021 verdicts from ARCH-REV-006 are retained without change: spines, boundary encapsulation, dependency direction with grep enforcement, interfaces, reuse, file mapping, removal, legacy and transition, change sequence and examples. SR-022a only reduces scope relative to SR-022.

## Material Premise Validation

The following are carried forward unchanged:
- RV-MP-014 (process-wide `assertOpen` divergence): Not Reachable.
- RV-MP-015: Reachable for already-released unrequested refs; Not Reachable for an unlinked stamp, which gets a log only.
- RV-MP-016: Not Reachable in production.
- RV-MP-017: Reachable but not material, and accepted with no machinery.
- RV-MP-018: out of scope (infrastructure failure), note only.

No in-scope machinery depends on an unsupported premise.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass**: cumulative SR-021 + SR-022a is ready for implementation.

## Findings

None open. AR7-F01 is resolved in design.

Implementation guidance carried from ARCH-REV-006 (non-blocking):
- **N1** (F01 staging): applied to SR-021 §5 as a factual correction.
- **N2**: pair `initializeProjectTaskServiceProcessInstance` with a release on host close and startup rollback, and compose before any `getProjectTaskService()` call.
- **N3**: the `recordCleanup(report)` change also touches the dispatch catch path and the `releaseTaskLifetime` return types.

## Classification

N/A (Pass).

## Recommended Recipient

Primary: the Implementation Engineer, per post-result handoff rules. Then an informational Pass notice to the Solution Designer.

## Residual Risks

- All SR-021/SR-022a controls are unimplemented. That includes the §6 self-checks and dependency greps, plus the SR-022 write-count controls: 0 writes once delivered, 1 for a helper's first message, sender link unchanged.
- Independent source re-review and a changed-build API/E2E recheck (DONE fence, retry, restart-closed, helper scope, Task-team messaging) are required.
- Accepted residuals: the RV-MP-017 identical rewrite, the RV-MP-018 out-of-scope healing limit, one unlocked `projects.json` read per receiver-side Task message, and pending cleanup records for unregistered roots.
- Provider-private teardown was not re-traced in these rounds.
- **DR-002 must not finalize HEAD `ccb5fbe3`.**

## Latest Authoritative Result

- Review Decision: **Pass — cumulative SR-021 + SR-022a (ARCH-REV-008)**
- Material-Premise Gate: **Pass**
- Notes: Large/High preserved. This is a design Pass, not source or API acceptance.
