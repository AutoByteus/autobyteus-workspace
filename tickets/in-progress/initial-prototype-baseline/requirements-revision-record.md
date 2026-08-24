# Initial Prototype Baseline — Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial user request and bootstrap-scope framing | N/A | Draft | BEH-001–BEH-003; REQ-001–REQ-007 | Coherent baseline requirements recorded; selected frontend remains a blocking open decision. |
| RER-002 | User clarification: latest source and prototype-only terminal scope | Draft | Draft / Prototype Needed | BEH-001; REQ-001; AC-001; SCN-001; DEC-001–DEC-002 | `autobyteus-web` selected, latest `origin/personal` kickoff snapshot required, and downstream architecture/production engineering excluded. |
| RER-003 | PPA-001, completed parity evidence, and explicit user approval | Draft / Prototype Needed | Approved / Prototype-Only Complete | BEH-001–BEH-003; REQ-001–REQ-007; AC-001–AC-006 | Approved UI/UX package and final references integrated; all acceptance criteria met; no architecture handoff authorized. |
| RER-004 | User rejects standalone prototype repository; placement correction required | Approved / Prototype-Only Complete | Draft / Prototype Needed | BEH-004; REQ-008–REQ-009; AC-007–AC-009; SCN-004; DEC-003 | UI/UX approval preserved; terminal completion reopened until owning-repository relocation, path rewrite, validation, and commit succeed. |
| RER-005 | Corrected owning-repository prototype package returned and verified | Draft / Prototype Needed | Approved / Prototype-Only Complete | BEH-004; REQ-008–REQ-009; AC-007–AC-009; SCN-004; DEC-003 | Repository placement correction passes; approved observable baseline and evidence remain unchanged; terminal completion restored. |

## Revision Entries

### RER-001 — Initial prototype baseline requirements

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User requested an initial prototype baseline without identifying the source frontend application.
- Prior authoritative status (`N/A` for `RER-001`): N/A
- Current authoritative status: Draft
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-001–BEH-003; REQ-001–REQ-007; AC-001–AC-006; SCN-001–SCN-003; DEC-001.
- Why this baseline or revision was recorded: Establish the governing parity, technology, mock-boundary, isolation, and evidence requirements while making the missing application selection explicit.
- Canonical artifact sections changed: All sections initialized.
- Supplemental artifacts added, changed, or removed: Investigation notes and this revision record created.
- Prototype evidence or product decisions incorporated: Shared Product Prototype Principles incorporated; no prototype evidence is available yet.
- User approval impact: Explicit approval not yet requested; `DEC-001` must be resolved first.
- Downstream architecture impact: None; package is not architecture-ready.
- Remaining gaps, assumptions, or blocked decisions: Selected source frontend application; its roles/configurations, run prerequisites, inventory, canonical prototype root, and parity evidence.
- Next action or recipient: User selects the source frontend. Requirements Engineering then investigates that application and routes a focused `Prototype Needed` packet.

### RER-002 — Latest `autobyteus-web` prototype-only scope

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User required the captured baseline to use the latest source and confirmed that the ticket should be completely fulfilled by the product prototype without software architecture or production engineering.
- Prior authoritative status (`N/A` for `RER-001`): Draft
- Current authoritative status: Draft / Prototype Needed
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-001; REQ-001; AC-001; SCN-001; DEC-001–DEC-002.
- Why this baseline or revision was recorded: Resolve application/freshness scope and prevent an unauthorized downstream architecture handoff.
- Canonical artifact sections changed: Problem; current/desired behavior; scope guardrail; REQ-001; AC-001; SCN-001; UI; dependencies; assumptions; decisions; downstream input; readiness.
- Supplemental artifacts added, changed, or removed: Investigation notes updated with source revision and application evidence.
- Prototype evidence or product decisions incorporated: `autobyteus-web` selected; latest `origin/personal` snapshot required and must be pinned exactly at kickoff; prototype-only completion confirmed. Remote verification on 2026-08-22 resolved to `8ef282ba77705180d985e7000d801f0e0068cdc1`.
- User approval impact: Core scope decisions are approved; explicit review/approval of the completed runnable baseline is still required.
- Downstream architecture impact: Architecture design and production engineering are explicitly out of scope for this ticket.
- Remaining gaps, assumptions, or blocked decisions: Bootstrapper inventory, parity evidence, product-prototyper acceptance, and user review.
- Next action or recipient: Route `Prototype Needed` to the product prototyper under dynamic handoff rules.

### RER-003 — Approved complete current-state prototype baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: Product Prototyper returned a corrected, accepted baseline under PPA-001 with explicit user confirmation **“approved”** on 2026-08-22 and a committed canonical prototype package.
- Prior authoritative status (`N/A` for `RER-001`): Draft / Prototype Needed
- Current authoritative status: Approved / Prototype-Only Complete
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-001–BEH-003; REQ-001–REQ-007; AC-001–AC-006; SCN-001–SCN-003; DEC-001–DEC-002.
- Why this baseline or revision was recorded: Integrate authoritative UI/UX approval and parity evidence, close all prototype acceptance criteria, and record terminal completion of the user-authorized scope.
- Canonical artifact sections changed: Document status; problem framing; stakeholders; acceptance outcome; UI/UX; data continuity; contracts; supplements; assumptions; traceability; downstream boundary; readiness.
- Supplemental artifacts added, changed, or removed: Added the approved `ui-ux-spec.md`, final visual inventory/manifest, PPA-001 review, parity inventory, bootstrap/comparison/evidence reports, mock-boundary record, runbook, and scenario catalog from `/home/autobyteus/workspace/autobyteus-web-prototype`.
- Prototype evidence or product decisions incorporated: Source pin `8ef282ba77705180d985e7000d801f0e0068cdc1`; prototype commit `7ab23b60aa6fd85ff7ce62720a2fbc5ea41e01a6`; 347/347 rendered/matrix rows; 49/49 journeys; 369/369 retained presentation files; 179 source test files/925 cases classified; 15/15 final references; 7/7 prototype tests; 13/13 boundary checks; 73/73 final-package consistency checks; no known missing, discrepant, unknown, or unsubstantiated UI inventory ID.
- User approval impact: Explicit approval is recorded and applies to the complete corrected current-state baseline only. No future-state delta, production architecture, or production engineering was approved.
- Downstream architecture impact: None. This ticket is terminal at the approved product prototype; any later production implementation requires a separate user request.
- Remaining gaps, assumptions, or blocked decisions: None for the approved prototype boundary. Two unchanged source unit-harness failures remain documented and are non-blocking because their observable obligations pass JRN-047 and JRN-049.
- Next action or recipient: Complete the prototype-only ticket and return the cumulative approved package to the user/calling workflow. Do not route to architecture.

### RER-004 — Correct prototype repository ownership and placement

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: Product Prototyper reported the user’s explicit rejection of `/home/autobyteus/workspace/autobyteus-web-prototype` as a standalone Git repository and the requirement that the project be tracked through `/home/autobyteus/workspace/autobyteus-workspace`.
- Prior authoritative status (`N/A` for `RER-001`): Approved / Prototype-Only Complete
- Current authoritative status: Draft / Prototype Needed
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-004; REQ-008–REQ-009; AC-007–AC-009; SCN-004; QR-004; DEC-003.
- Why this baseline or revision was recorded: The prior external canonical-root selection did not authorize a standalone repository and conflicts with the user’s ownership requirement. Repository placement and provenance are material operational requirements even though observable UI/UX remains approved.
- Canonical artifact sections changed: Document status; problem/success boundary; current/desired behavior; scope; requirements; acceptance criteria; scenarios; UI/UX artifact locators; quality; data continuity; supplements; decisions; traceability; readiness; completion classification.
- Supplemental artifacts added, changed, or removed: Added the corrected pending root `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype`; retained the intact external root only as the corrective source until successful relocation.
- Prototype evidence or product decisions incorporated: User mandates existing-workspace repository ownership. Requirements Engineering selects repository-relative path `ui-prototypes/autobyteus-web-prototype` in the existing isolated ticket worktree on branch `codex/initial-prototype-baseline`. Standalone branch `main` and commit `7ab23b60aa6fd85ff7ce62720a2fbc5ea41e01a6` are rejected as canonical history.
- User approval impact: PPA-001 and the approved observable UI/UX remain valid. No new visual/interaction approval is required if correction changes only path/provenance references and all parity/final-reference evidence remains intact. Any observable change requires renewed user review.
- Downstream architecture impact: None. Architecture and production engineering remain outside this prototype-only ticket.
- Remaining gaps, assumptions, or blocked decisions: Relocate/copy all project content excluding standalone `.git`; remove nested Git provenance; rewrite active absolute paths; preserve evidence/hashes; rerun prototype/package validations; commit through the owning workspace ticket branch; return corrected absolute paths and commit evidence.
- Next action or recipient: Reclassify the focused update as `Prototype Needed` and route to Product Prototyper for correction. Do not route to architecture.

### RER-005 — Verified owning-repository placement correction

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: Product Prototyper returned the corrected package at owning-repository commit `6ed910fc6859e4f3620d08968ecedf49a24a41ed` with clean status and complete repository-placement evidence.
- Prior authoritative status (`N/A` for `RER-001`): Draft / Prototype Needed
- Current authoritative status: Approved / Prototype-Only Complete
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-004; REQ-008–REQ-009; AC-007–AC-009; SCN-004; QR-004; DEC-003.
- Why this baseline or revision was recorded: Verify that the approved prototype is now ordinary tracked content of the existing `autobyteus-workspace` repository, restore correct canonical paths, and close the reopened terminal package without altering UI/UX approval.
- Canonical artifact sections changed: Document status; approval state; acceptance outcome; UI/UX locators; supplements; traceability; readiness; completion classification; investigation prototype findings and risk status.
- Supplemental artifacts added, changed, or removed: Added `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/repository-placement-correction.md` and its linked ownership, stale-path, hash-preservation, correction-validation, recapture, and placement-validation evidence. Removed the rejected external root from the canonical package because it no longer exists.
- Prototype evidence or product decisions incorporated: 1,934 ordinary tracked prototype files; no nested `.git`, submodule, or gitlink; zero rejected active-root matches; 1,924/1,924 copied files verified before rewrites; 808/808 approved evidence/reference image hashes and 15/15 final-reference hashes preserved; 31/31 placement checks; 73/73 final-package checks; HTTP 200 at the corrected-root review server. Synthetic evidence capture now freezes its approved clock so the originally approved relative-time pixels reproduce exactly without changing runnable behavior.
- User approval impact: PPA-001 and explicit UI/UX approval remain authoritative because observable behavior and approved visual hashes are exactly preserved. No renewed UI review is required for this non-observable provenance correction.
- Downstream architecture impact: None. Architecture and production engineering remain out of scope.
- Remaining gaps, assumptions, or blocked decisions: None for the prototype-only package.
- Next action or recipient: Complete the prototype-only ticket and return the corrected cumulative package to the user/calling workflow. Do not route to architecture.
