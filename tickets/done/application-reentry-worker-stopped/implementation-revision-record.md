# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer pass (`design-review-report.md`, ARCH-REV-002) on SR-002 | N/A | `Initial Baseline` | SR-001, SR-002, ARCH-REV-001, ARCH-REV-002 | Implemented; all checks pass; ready for source review |

## Revision Entries

### IR-001: reentry returns applications ACTIVE with the worker stopped; quarantine names the reason

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` (ARCH-REV-002, Pass), initial implementation
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation at `6950a24e1b`; IMP-01…IMP-05 pass; IMP-00 shows the new tests fail without the change
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001…004 (and MP-001); REQ-001…005; AC-001…008
- Implementation delta:
  - The reentry order is recover → ACTIVE → dispatch → tools open, with no worker start; the launcher is `Pick<"stop">`.
  - The transition→reentry contract carries setup-required details in a map, replacing the recoverable IDs.
  - Readiness owns the setup text through `getSetupRequiredDetail`; `getDiagnosticsByApplicationId` is removed, and startup uses the new method.
  - `stopEngine` (renamed from `stopAttachedEngine`) always ends in `stopped`, and the guard anchor follows.
  - Tests: a durable e2e, a new invoker unit, and updated units.
  - The two module docs are corrected.
- Changed files or areas: see the handoff's Key Files Or Areas (17 files)
- Local validation and result: see the handoff's Checks Run
- Next recipient or routing: Code Reviewer (`get_handoff_rules`: Medium/High → source review)
- Remaining limitations or risks: the residual risks accepted by the design; no project typecheck covers test files
