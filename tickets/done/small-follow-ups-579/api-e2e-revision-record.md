# API/E2E Revision Record

One entry per API/E2E round. The current report is `api-e2e-execution-coverage-report.md`; the plan is `api-e2e-coverage-investigation.md`.

## API-REV-001: round 1, `Pass`

- Date: 2026-11-22
- Trigger: implementation handoff IR-001 (Medium / Low, direct route)
- Code tested: `4c77e3e78a` (HEAD `b6b8020bf5`, the TESTING.md commit of this stage)
- I-6 (AC-007): TESTING.md documents the test-owned Claude home and the CLI recorder rules (`b6b8020bf5`).
- AC-003: evidence decision requested (the busy-`fseventsd` regime was absent) and given, DEC-004: IMP-08, IMP-12, the review against DEC-002 and one calm whole server E2E run (API-06: 128 files, `ENOTEMPTY` 0); the eight I-2 files in the stalled regime are `Accepted Unverified Risk (DEC-004)`.
- Rendered: SMV-104 shows the viewer's error state for a semantic memory link to a missing file (API-04). Integration 517 pass (API-03).
- Not Tested: the packaged `event-monitor-file-preview` probe, broken on the base (FU-002).
- Result: `Pass`, confidence 95.0%; route: delivery.
