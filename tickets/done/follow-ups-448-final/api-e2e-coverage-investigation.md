# API/E2E Coverage Investigation — autobyteus-526 round 2 (`follow-ups-448-final`)

## Basis

- Requirements: `requirements-doc.md`, REQ-001..003 / AC-001..003, with REQ-003 revised in SR-002.
- Design: `design-spec.md`, SR-002.
- Implementation: IR-002 (`c443fa09c1`, `7caf3f866c`, `04ba12409c`, `c65a971c90`; docs `8484072726`, `03d3ff8e04`).
- Route: direct (Small / Low).
- What must be proven: test and harness changes, plus the removal of an unmounted component. No product behavior changes:
  - FU-007: the two components, `TeamActivityDot` and the 8 keys are gone with no reference left, and everything that used to pass still passes;
  - FU-008: the two probes pass on HEAD;
  - FU-001: the watcher unit test is robust under load and still asserts every behavior; real OS delivery is still covered by the unchanged integration test.

## Planned cases

| Case | Covers | Surface | Kind | Notes |
| --- | --- | --- | --- | --- |
| V-01 | AC-001 search | repository | Static | the components, `TeamActivityDot`, the 8 keys |
| V-02 | AC-001 | web typecheck, `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Existing | typecheck baseline 86/36 |
| V-03 | AC-001 regression | web unit suite (full) | Existing | the implementer's known failure (`ServerSettingsBasicsPanel.spec.ts`) checked on base |
| V-04 | AC-001 | `test:e2e:team-activity-presentation` | Existing (changed) | — |
| V-05 | AC-002 | `test:e2e:background-contention` (BG-BROWSER-000..004), `test:e2e:agent-org-draft-retention` | Existing (changed) | — |
| V-06 | changed probe | `team-status-live-probe.mjs` (one line removed) | Existing (changed) | runs the live desktop rows against a built server |
| V-07 | AC-003 | `agent-package-folder-watcher.test.ts`, repeated runs under load; `tests/unit/agent-package-definitions` | Existing (changed) | plus a check that cases go red when the fake event is not delivered |
| V-08 | AC-003 (real OS still covered) | `tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts` | Existing (unchanged) | likely slow under `fseventsd` load |
| V-09 | server typecheck | — | Existing | the test file changed |
