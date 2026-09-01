# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial investigation and live Codex App Server failure probe | N/A | Ready for Approval | BEH-001-BEH-003; REQ-001-REQ-006; AC-001-AC-009; SCN-001-SCN-003 | Confirmed AutoByteus converter mapping gap and produced a testable requirements baseline. |

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
