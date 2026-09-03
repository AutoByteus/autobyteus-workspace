# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial investigated baseline for Gemini 3.8 Flash replacement | N/A | Ready for Approval | BEH-001–BEH-005; REQ-001–REQ-013; AC-001–AC-011; SCN-001–SCN-006 | Exact latest-only replacement, provider-valid request behavior, metadata/pricing, preservation boundaries, and preliminary architecture route defined. |
| RER-002 | User scope confirmation and explicit approval | Ready for Approval | Approved | BEH-001–BEH-005; REQ-001–REQ-013; AC-001–AC-011; SCN-001–SCN-006; DEC-001 | User confirmed the simple product outcome—remove 3.7 and replace it with 3.8—and approved the package; readiness passed and architecture routing was completed. |

## Revision Entries

### RER-001 — Gemini 3.8 Flash replacement baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User requested replacing current Google 3.7 Flash with newly published 3.8 Flash and then asked the workflow to continue. Requirements investigation consulted the current product paths and official Google AI/Cloud 3.8 documentation dated 2026-09-02/03.
- Prior authoritative status (`N/A` for `RER-001`): N/A
- Current authoritative status: Ready for Approval
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-001–BEH-005; REQ-001–REQ-013; AC-001–AC-011; SCN-001–SCN-006; DEC-001.
- Scenario-basis or scenario-validity changes: Established supported catalog-selection, normal invocation, tool-continuation, stale-selection, token-pricing, and operational-validation scenarios. Explicitly excluded direct/synthetic malformed trailing-model histories as unsupported/contrived rather than promoting them into scope.
- Why this baseline or revision was recorded: A correct 3.8 replacement is broader than a model-name substitution because Google's migration contract changes required outbound request fields and publishes a known future standard price.
- Canonical artifact sections changed: Initial creation of every canonical section in `requirements-doc.md` and `investigation-notes.md`.
- Supplemental artifacts added, changed, or removed: Created this revision record; no product prototype or UI/UX artifact applies.
- Prototype evidence or product decisions incorporated: None; Product Design was not requested and is not needed for the schema-driven existing surface.
- User approval impact: Explicit approval is required. The package asks the user to approve latest-only removal/no alias, the 3.8 provider request contract, and effective-dated pricing.
- Downstream architecture or direct-implementation route impact: Preliminary `Medium` / `High` with a confirmed external-contract structural trigger. Expected route after approval is Requirements-to-Architecture-Design; Architecture Designer owns the final production-path design and risk classification.
- Remaining gaps, assumptions, or blocked decisions: User approval only. Live model entitlement and installed dependency setup are downstream validation risks, not product requirement gaps.
- Next action or recipient: Present RER-001 to the user and request explicit approval or requested revisions.

### RER-002 — User-approved simple replacement and routing completion

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: After the RER-001 summary was presented, the user asked, "basically remove 3.7 with 3.8 right=" and then replied, "cool. its simple. approved".
- Prior authoritative status (`N/A` for `RER-001`): Ready for Approval
- Current authoritative status: Approved
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: Approval state for BEH-001–BEH-005, REQ-001–REQ-013, AC-001–AC-011, SCN-001–SCN-006, and resolution of DEC-001. Intended behavior did not change.
- Scenario-basis or scenario-validity changes: None; the user confirmed that the intended visible outcome is the simple latest-only 3.7-to-3.8 replacement.
- Why this baseline or revision was recorded: Capture explicit approval, close the requirements decision, pass the readiness gate, and record the post-approval routing assessment.
- Canonical artifact sections changed: Document Status, approval reference, assumptions/decision state, readiness check, Architecture Design Routing Assessment, investigation approval evidence, and revision index.
- Supplemental artifacts added, changed, or removed: None.
- Prototype evidence or product decisions incorporated: No prototype applies. The user confirmed removal of 3.7 and replacement by 3.8.
- User approval impact: Package is explicitly approved as of 2026-09-03.
- Downstream architecture or direct-implementation route impact: Architecture Design selected because the supporting provider-valid migration changes an external request contract in the shared Gemini adapter. Preliminary task size is Medium and architectural risk High; these are routing inputs, not final architecture classifications.
- Remaining gaps, assumptions, or blocked decisions: No requirements blocker. Dependency setup and live entitlement are downstream validation risks.
- Next action or recipient: Apply dynamic handoff rules for `Approved Architecture-Ready` with route `Requirements-to-Architecture-Design`.
