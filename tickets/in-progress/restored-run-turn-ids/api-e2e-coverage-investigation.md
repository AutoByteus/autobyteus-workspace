# API/E2E Coverage Investigation — autobyteus-526 round 1 (`restored-run-turn-ids`)

## Basis

- Requirements `requirements-doc.md` (SR-001: REQ-001..003, AC-001..003, DEC-001..003), design `design-spec.md`, implementation handoff IR-001 (`10217e9a0b`, `cbea910d08`; docs `238be7dbc0`), direct route (Medium / Low).
- To prove at the real boundaries:
  - **AC-002:** a native run restarted twice keeps one id per turn; each reminder and reply shows once, on desktop and phone, live and after a reload; before/after on base `2e9ac1e65b`.
  - **DEC-003:** what a run restored before the fix shows.
  - **AC-003:** the card's local time on the real surfaces, with the agent's text still in UTC.

## Existing coverage

- Unit tests (IMP-00..IMP-03): `TurnTracker.continuingAfter`, `MemoryManager` seeding (fails on base), the card helper and component.
- `restart-reminder-built-server.e2e.test.ts` (autobyteus-448): real restarts of the built server, but no assertion on turn ids. RR-01 only records them as evidence.
- The phone probe has node stop/start (MSP-09) but no native run; the desktop has no restart probe.

## Planned cases

| Case | Covers | Surface | Kind | Notes |
| --- | --- | --- | --- | --- |
| V-R01 | AC-001, unit and component levels, typechecks | — | Reused IMP-00..IMP-04 | ran at `cbea910d08` |
| V-01 | AC-002 server: stored ids, live turn ids, the conversation the app loads (the reload path) | built server, scripted model, two graceful restarts | Durable: new RR-10 | run on this build and on base `2e9ac1e65b` (before) |
| V-02 | DEC-003 | a run restarted twice on base, then opened and continued on this build (same data root) | Durable: new RR-11 (needs `RESTART_REMINDER_BASE_SERVER_DIR`) | old ids kept; next turn continues; what the old turns show |
| V-03 | AC-002 and AC-003 on the phone: production phone bundle, a native run, the node restarted twice, live and after a reload, viewer zone Europe/Berlin | phone probe | Durable: new MSP case | — |
| V-04 | AC-002 and AC-003 on the desktop: a real model, the app's Restart server twice, live and after a reload, machine zone CET | isolated desktop instance | Journey | before = autobyteus-448 API-15 (the same numbering code as base) |
| V-05 | regression of part 1 | RR-01..06 | Existing durable | the suite's file changed |
| V-06 | typecheck | server | Existing | new test code |

## Outcome

- Executed as planned. Fail: F-1, see `api-e2e-execution-coverage-report.md`.

## Round 2 (SR-002)

- Plan, by impact:
  - Rerun round 1's cases.
  - Prove the identity on every route: agent stream, team stream, Org view / collaboration presentation, Claude.
  - Prove each Team, Org and Claude notice shows once, live and after a reload.
- New durable tests: `platform-notice-identity.e2e.test.ts` (PNI-01..04) and phone cases MSP-76 and MSP-77.
- Outcome: Pass. See the report.
