# API/E2E Execution Coverage Report — `projects-always-on`

## Meta

- Package: see `api-e2e-coverage-investigation.md` (same folder).
- API/E2E revision: `API-REV-001`; round 1; direct route `Medium` / `Low` → `/delivery_engineer`.
- Test-code review: `Not Required — direct low-risk route`.

## Results

| Case | AC | What ran | Result |
| --- | --- | --- | --- |
| Server build | — | `pnpm -C autobyteus-server-ts prebuild && build` on `0fd265652` | Pass |
| PMU-001..016 (full probe) | AC-006..011 + regression of all board/root journeys | `pnpm -C autobyteus-web test:e2e:project-manager-ux` (real built backend, scripted AGY, Chrome) | **16/16 Pass** (`api-e2e-evidence/pmu-full/`) |
| PMU-016 (new) | AC-006, AC-009, REQ-006 | Team and Org conversations: Projects is the first tab; a worker opened from the tab shows in the center and the tab stays selected. Constrained width (1100 px): strip order and drawer order both start with Projects; the drawer board has no horizontal overflow | Pass |
| PT-E2E-001..016 | AC-001, 002, 003, 005, 011 | `pnpm -C autobyteus-web test:e2e:projects --skip-server-build` (two real nodes) | Run 1: 9 failures (cascade, below). Final run after the test fix: **16/16 Pass** (73 s) (`api-e2e-evidence/projects-feature-probe/`) |

## PT-E2E Intermittent (test problem, not product)

- **Run 1:** PT-E2E-005 failed "Form/actions fit wide and narrow layout". Then PT-E2E-006..011 and 015 failed as a knock-on.
- **Cause of the cascade:** `inspectTaskPresentation` switches to zh-CN and 390 px inside its loop and restores en/1512 px only after the loop. A failed check skipped the restore, so later cases ran in zh-CN at 390 px. This is the knock-on the implementer saw starting from PT-E2E-006.
- **Fix (durable, test code):** the restore now runs in `finally`, and the failing check now records its measurements (scroll widths, button boxes, the elements past the viewport).
- **The single check itself:** it is intermittent. The implementer saw 1 failure in 2 runs; I saw 1 in 2.
  - The screenshot at failure shows the form fitting correctly at 390 px.
  - The check measures right after `setViewportSize`, so the likely cause is measuring before layout settles. That is unproven: it did not recur in the instrumented run.
  - It is reported, not chased with repeated runs (user-agreed).
  - Next occurrence: the new diagnostics will show the cause.
- **Not product behavior:** the form renders correctly, and the check passes on the same code.

## Observations

- **Baseline-fix commit `82960e903` changes product code** (token statistics `px` → `rem`). It renders identically at the default font size and is tiny, but the new TESTING.md rule 9 says product fixes are reported, not fixed in-branch. Noted for delivery.
- **In an Org conversation, the "Org" (team members) tab appears only once the run has communication messages.** This is existing behavior, unrelated to this change.

## Not Run (proportionate)

- Full web/server unit suites: unchanged since the implementer's passing run (3,900 web tests; server Projects suites).
- Navigation probe: run twice by the implementer; this change is also covered by PT-E2E-001.
- Two-node picker memory, the mobile runtime and a packaged desktop: unit-covered or no shell change.

## Durable Coverage Changed (uncommitted)

| Path | Change |
| --- | --- |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` | Added PMU-016 |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | `inspectTaskPresentation` restores locale/viewport in `finally`; the layout assertion records its measurements |

## Cleanup

All probe stacks closed their browser and processes and removed their data roots.

## Latest Authoritative Result

- Result: `Pass`
- Confidence: 95%
  - All ACs are proven against real backends in a browser.
  - Residuals: the PT-E2E-005 timing check, and the two-node picker memory (unit-covered only).
- Next: `/delivery_engineer`
