# API/E2E Revision Record — `projects-always-on`

## Revision Index

| Revision ID | Trigger / Round | Upstream | Prior | Current |
| --- | --- | --- | --- | --- |
| API-REV-001 | IR-001 from `/implementation_engineer`; round 1 | SR-002, SR-003, IR-001 | N/A | Pass / 95% |

## API-REV-001 — Always-on Projects and the Projects tab validated; PT-E2E cascade contained

- Coverage changed:
  - PMU-016 added (Team/Org conversations, strip and drawer);
  - `projects-feature-probe.mjs` restores locale/viewport in `finally` and records layout measurements.
- Cases: PMU-001..016 (16/16); PT-E2E-001..016 (final 16/16; run 1 cascade explained).
- Prior failure resolution: none (first round).
- Remaining:
  - The PT-E2E-005 layout check is timing-sensitive (likely measured before layout settles). It is reported with diagnostics now in place.
  - Baseline-fix commit `82960e903` is product code, against TESTING.md rule 9 (observation).
