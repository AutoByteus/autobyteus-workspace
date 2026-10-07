# API/E2E Coverage Investigation — `projects-always-on`

## Meta

- Package (all in this folder):
  - requirements-doc.md (SR-003; SR-002 user-approved 2026-10-07; tab at the user's direction)
  - investigation-notes.md
  - solution-revision-record.md
  - design-spec.md
  - implementation-handoff.md (IR-001)
  - implementation-revision-record.md
- Design review, architecture review and code review: `N/A — not applicable` (direct route).
- Round 1 (API-REV-001). Trigger: IR-001 from `/implementation_engineer`.
- Ledger: not used.

## Routing

- `Medium` / `Low`; direct low-risk → `Delivery`
- Test-code review: `Not Required — direct low-risk route`

## Basis

- **SR-002:** the `ENABLE_PROJECTS` flag and its capability API are removed. Projects is always on in desktop and hidden in the mobile runtime. A stored value is ignored and shows as an ordinary custom setting (DEC-001, no migration).
- **SR-003:** a Projects tab is first in the right panel (tab row, strip, drawer; desktop only). It has a remembered per-node picker and the live board, compact with stacked lanes. Workers open in the center and the tab stays. Cards open details in the tab.

## Proportionate Plan

The change is UI wiring and a flag removal; there is no data, contract or concurrency change. So:

- **Re-run** the suites that exercise what changed:
  - the PMU probe (board/row components gained compact and activation modes);
  - the Projects feature probe (flag removal, stored `false`, Settings);
  - the server build.
- **Add** only what PMU-015 does not cover:
  - Team and Org conversations (the tab, and a worker opened with the tab kept);
  - the constrained-width strip and drawer order (REQ-006).
- **Not added:**
  - Two-node picker memory: unit-covered (store keyed by node); rare in real use.
  - A packaged desktop: no shell change; the probes use real built backends.
  - The mobile runtime: unit-covered gate.
- **Watch:** PT-E2E-006, the intermittent the implementer reported.

## Existing Coverage Decisions

| Path | Decision |
| --- | --- |
| PMU-001..015 | Still Valid; re-run |
| PT-E2E-001..016 (001/010/015 rewritten for always-on + stored `false`) | Still Valid: they assert AC-001..003 against a real backend. **Needs Update:** `inspectTaskPresentation` (PT-E2E-005) restores locale and viewport only after its loop, so one failed check cascades into the later cases |
| Implementer unit/web suites (3,900 tests) | Still Valid; not re-run (unchanged since their run) |
