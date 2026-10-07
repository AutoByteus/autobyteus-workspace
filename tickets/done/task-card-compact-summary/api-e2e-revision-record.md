# API/E2E Revision Record — `task-card-compact-summary`

## Revision Index

| Revision ID | Trigger / Round | Related Upstream Revision IDs | Prior | Current |
| --- | --- | --- | --- | --- |
| API-REV-001 | IR-001 from `/implementation_engineer`; round 1 | SR-002, IR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Compact cards proven in the rendered browser; short cards pixel-identical to the base

- Coverage changed:
  - added PMU-014 to `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs`;
  - made the shared `goto` wait for in-flight GraphQL (harness fix).
- Cases:
  - PMU-013 (its final file run for the first time);
  - PMU-014 (4/4);
  - PARITY (temporary);
  - web specs, localization checks, packaged build.
- Scope: proportionate to a presentation-only change (user-agreed). The PMU-001..012 regression and the desktop journey were not run.

#### Prior Failure Resolution

None.

- Prior: N/A. Current: Pass, 96%. No failures.
- Next: `/delivery_engineer`.
- Remaining: none material. The Product design copy of `ProjectTaskRow.vue` has the same class conflict (an informational note from the design spec).
