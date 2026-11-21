# Solution Revision Record — managed-ubuntu-immediate-restart (autobyteus-16)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-16 (user's direction, 2026-11-21) | N/A | N/A | Approved | BEH-001..004, REQ-001..006, AC-001..007 | Approved by Solution Designer within the user's direction, user informed |
| SR-002 | Design | Design on approved SR-001 | N/A | No design | Ready | DS-001, DS-002 | Medium / Low; Architecture Design Complete; direct implementation route |

## Revision Entries

### SR-001 — Restart as soon as ready, like Mac

- Classification: `Initial Baseline`. Trigger: Project Task autobyteus-16 and its user comment.
- Intended behavior changed: `Yes` relative to autobyteus-15 (its REQ-002 wait and waiting copy are replaced, at the user's direction).
- Approval: Solution Designer within the direction (the direction is the user's own; DEC-001..003 are details); reference: message informing the user, 2026-11-21.
- Remaining gaps: ASM-001 (validated on the guest). Next: design.

### SR-002 — Design

- Design: `design-spec.md`; investigation A-F01..A-F03.
- Classification: task_size `Medium` (mostly removal across Electron, server, renderer copy, docs, tests); architectural_risk `Low` (no new owner, contract, persistence, privilege or concurrency; reviewed admission/settlement reused unchanged; dead same-release route removed).
- Handoff: see `handoff-implementation.md`.
