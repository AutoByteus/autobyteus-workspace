# Implementation Plan

## Status
- Finalized (pre-implementation)

## Scope Classification
- `Medium`

## Design Basis
- `tickets/in-progress/port-team-memory-layout-to-superrepo/proposed-design.md` (`v1`)
- `tickets/in-progress/port-team-memory-layout-to-superrepo/future-state-runtime-call-stack.md` (`v1`)
- Review gate: `Go Confirmed`

## Planned Changes
1. `P-001` (`Modify`) `autobyteus-ts/*` from source commit `8b7470a`.
2. `P-002` (`Modify/Add`) `autobyteus-server-ts/*` from source commit `60a113d`.
3. `P-003` (`Modify/Add`) `autobyteus-server-ts/*` from source commit `02317b8`.
4. `P-004` (`Add`) ticket artifact updates in `tickets/in-progress/port-team-memory-layout-to-superrepo/*`.

## Port Method
- Apply source commit patches with path prefixing:
  - `autobyteus-ts@8b7470a` -> `autobyteus-ts/`
  - `autobyteus-server-ts@60a113d` -> `autobyteus-server-ts/`
  - `autobyteus-server-ts@02317b8` -> `autobyteus-server-ts/`
- Resolve any rejected hunks manually to source parity.
- Run parity check over touched files.

## Verification Strategy
- Source parity check: touched files in super repo must match source file contents.
- Unit/integration checks:
  - `autobyteus-ts`: memory + agent factory + snapshot restore suites.
  - `autobyteus-server-ts`: run-history unit suites and team-run-history e2e suites.
- Scope guard: review final `git status` for non-team-memory files.

## Requirement Traceability
| requirement_id | planned changes | tests |
| --- | --- | --- |
| REQ-001 | P-002,P-003 | run-history e2e + unit |
| REQ-002 | P-001,P-002 | memory unit/integration + run-history e2e |
| REQ-003 | P-002 | team-member projection unit/e2e |
| REQ-004 | P-002 | continuation unit/e2e |
| REQ-005 | P-002 | manifest store unit + e2e checks |
| REQ-006 | P-003 | team-member-run-id unit + integration |
| REQ-007 | P-002 | run-history delete e2e |
| REQ-008 | P-001,P-002,P-003 | parity + scope guard commands |
