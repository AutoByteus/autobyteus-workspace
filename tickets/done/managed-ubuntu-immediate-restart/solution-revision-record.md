# Solution Revision Record — managed-ubuntu-immediate-restart (autobyteus-16)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-16 (user's direction, 2026-11-21) | N/A | N/A | Approved | BEH-001..004, REQ-001..006, AC-001..007 | Approved by Solution Designer within the user's direction, user informed |
| SR-002 | Design | Design on approved SR-001 | N/A | No design | Ready | DS-001, DS-002 | Medium / Low; Architecture Design Complete; direct implementation route |
| SR-003 | Evidence | API/E2E clarification request (2026-11-21) on AC-003 timing | N/A | Approved | Approved (wording only) | AC-003 | AC-003 split into Quit before verification (stays on N, no install) and Quit after admission (installs N+1, stays closed) |

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

### SR-003 — AC-003 wording clarified

- Classification: evidence-only clarification. Trigger: `/api_e2e_engineer` question while validating (IR-001 discards a verification result arriving after Quit).
- Change: AC-003 now names both boundaries: Quit before the stage is verified stays closed on N with nothing installed; Quit after automatic admission installs N+1 and stays closed. This is autobyteus-15's preserved behavior (REQ-004: only a verified stage installs), which REQ-003 keeps.
- Intended behavior changed: `No`; approval unchanged; design unchanged.
