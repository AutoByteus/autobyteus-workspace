# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial investigation and live Codex App Server failure probe | N/A | Ready for Approval | BEH-001-BEH-003; REQ-001-REQ-006; AC-001-AC-009; SCN-001-SCN-003 | Confirmed AutoByteus converter mapping gap and produced a testable requirements baseline. |
| RER-002 | User approval, AutoByteus `run_bash` return clarification, readiness, and routing assessment | Ready for Approval | Approved — Direct Implementation Ready | BEH-001-BEH-003; REQ-001-REQ-006; AC-001-AC-009; SCN-001-SCN-003; DEC-001 | Captured explicit approval, retained return-shape parity as bounded technical context, passed readiness, and selected the Small/Low direct implementation route. |

## Revision Entries

### RER-001 — Initial failed-command diagnostic requirements baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User reported that a Codex-runtime failed Bash command shows only `Tool execution failed.` and requested a direct App Server experiment to determine the loss boundary.
- Prior authoritative status (`N/A` for `RER-001`): N/A
- Current authoritative status: Ready for Approval
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-001 through BEH-003; REQ-001 through REQ-006; AC-001 through AC-009; SCN-001 through SCN-003; DEC-001.
- Scenario-basis or scenario-validity changes: Established the ordinary supported agent-command failure as SCN-001, normal local replay as SCN-002, and the provider's nullable failure fields as supported contract edge SCN-003.
- Why this baseline or revision was recorded: The live Codex 0.152.0 probe proved that the provider supplied combined diagnostic output and exit code; source tracing proved AutoByteus' Codex error resolver ignored both and emitted the generic fallback.
- Canonical artifact sections changed: Initial creation of all requirements, scenario, scope, traceability, readiness, and investigation sections.
- Supplemental artifacts added, changed, or removed: Added the live probe script, retained raw JSONL, probe summary, and linked the user screenshot.
- Prototype evidence or product decisions incorporated: No Product Design request or prototype. Existing UI layout is preserved.
- User approval impact: Explicit approval is still required. No approval was inferred from the request to investigate.
- Downstream architecture or direct-implementation route impact: Routing assessment is intentionally deferred until approval; preliminary investigation found no required contract-shape or UI-structure change.
- Remaining gaps, assumptions, or blocked decisions: DEC-001—user approval of diagnostic precedence and live/local-replay scope.
- Next action or recipient: Present the baseline to the user for approval; after approval, complete the Architecture Design Routing Assessment and apply the dynamic handoff rules.

### RER-002 — Approved diagnostic mapping and direct route

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user asked whether the Codex payload could be mapped to the AutoByteus `run_bash` return, then stated, “anyways, i approved. you can route now,” and identified the exact technical mapping as downstream responsibility.
- Prior authoritative status (`N/A` for `RER-001`): Ready for Approval
- Current authoritative status: Approved — Direct Implementation Ready
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-001 through BEH-003; REQ-001 through REQ-006; AC-001 through AC-009; SCN-001 through SCN-003; DEC-001.
- Scenario-basis or scenario-validity changes: None. The approved supported command-failure, replay, and nullable-contract scenarios remain SCN-001 through SCN-003.
- Why this baseline or revision was recorded: Explicit approval resolved the only requirements decision and made the readiness/routing assessment eligible. Source inspection also clarified that native AutoByteus `TerminalResult` is not exactly equivalent to the observed Codex item because it separates stdout/stderr and includes additional fields.
- Canonical artifact sections changed: Document status and approval reference; UI confirmation; assumptions and decision state; downstream input; readiness; Architecture Design Routing Assessment; investigation intake/source log/structural inventory/downstream notes.
- Supplemental artifacts added, changed, or removed: None; all RER-001 probe and screenshot evidence remains authoritative.
- Prototype evidence or product decisions incorporated: No prototype. Existing error UI remains approved as-is; only diagnostic content changes.
- User approval impact: Explicit approval received on 2026-09-01. No material product decision remains open.
- Downstream architecture or direct-implementation route impact: Readiness passed. Preliminary task size `Small`, preliminary architectural risk `Low`, and no structural-impact trigger found for the approved existing-contract mapping. Route: direct Requirements-to-Implementation. Exact native return-contract parity is not authorized scope and must be escalated if it would require structural behavior.
- Remaining gaps, assumptions, or blocked decisions: No requirements blocker. Implementation must not fabricate stdout/stderr separation from combined Codex output or reclassify the approved failed command as success.
- Next action or recipient: Apply dynamic handoff rules for `Approved Direct-Implementation`; Implementation Engineer rechecks the route, implements and validates the bounded mapping, and returns `Design Impact` or `Requirement Gap` if production evidence contradicts the approved basis.
