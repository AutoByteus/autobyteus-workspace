# API/E2E Revision Record

One entry per API/E2E round. The current report is `api-e2e-execution-coverage-report.md`; the plan is `api-e2e-coverage-investigation.md`.

## API-REV-001: round 1, `Pass`

- Date: 2026-11-23
- Trigger: implementation handoff IR-001 (Medium / Low, direct route)
- Code tested: `233f813d19` (HEAD `99a45cc1a0`, this stage's TESTING.md commit)
- On a fresh build, in a clean environment: the 11 non-live files the changes reach pass (both AC-001 upgrade files, the faithful-ledger users, `memory-collaboration-graphql`, six `restoreByMemberMessage` users); the live AGY user not run.
- Reused: IMP-01…IMP-15, including two clean whole server suites (AC-003).
- TESTING.md: the faithful-ledger rule (`99a45cc1a0`); FU-004 for the startup files not yet on it.
- Result: `Pass`, confidence 95.3%; route: delivery.

## API-REV-002: round 2, `Pass`

- Date: 2026-11-23
- Trigger: delivery Local Fix IR-002 (DEL-05/DEL-08: `removed-skill-access-mode-history-graphql` compared the modeled release's ledger with the whole release record, which v1.5.14-beta.8 extended with autobyteus-29's conversion and its follow-ups)
- Code tested: `35d8134148` on delivery's merge `540d5c0f6e` (`origin/personal` `390179a50f`)
- The fix reviewed: the modeled install is the release before 29; the ledger now equals the released migrations before `20261122_agent_org_units_own_runs_v1`, and the test asserts that migration is released. No other test models a release against the record.
- Fresh build, `env -i`: the fixed file 1/1; round 1's 7 ungated files 28/28; the 3 gated users 6/6; registry order 6/6. Control: delivery's DEL-08.
- Result: `Pass`; route: delivery (its whole merged-state run follows).
