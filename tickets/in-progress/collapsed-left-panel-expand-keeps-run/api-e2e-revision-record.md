# API/E2E Revision Record — collapsed-left-panel-expand-keeps-run

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer handoff IR-001 / round 1 | SR-004 (requirements SR-003), IR-001 | N/A | Fail / 89% |

## Revision Entries

### API-REV-001 — Baseline: browser + packaged-desktop validation; FAIL-001 (focus on New chat)

- Triggering role, report path, and round: implementation_engineer, `implementation-handoff.md` (IR-001, commit `1639cba95`), round 1
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: SR-004, IR-001; ARCH-REV/CRR/DR `N/A`
- Why recorded: first completed validation result
- Coverage decisions or durable test paths changed:
  - `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs`: PMU-017 tightened; PMU-018 added (steps A–G)
  - `autobyteus-web/tests/e2e/projects-primary-navigation-probe.mjs`: page-icon selector excludes Workspaces; Workspaces-after-page-icons assertion
  - `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs`: D11 control identity; D04 baseline fix (commit `db0ed1c3c`)
- Cases added, changed, removed, or rechecked: UNIT-FULL, PMU-001..PMU-018, NAV-PROBE, CDR-LIVE D00–D14, DSK-001
- Commands, environment, fixture, or broader-validation delta: see the execution coverage report (§ Broader Validation)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 89%
- New or remaining failure IDs: FAIL-001. Workspaces on New chat, reached in-app after a Team run, scrolls to and focuses the stale Team member row (REQ-009/REQ-006). Reproduced by PMU-018 step G and DSK-001.
- Recommended owner: implementation_engineer (`Local Fix`), pending code_reviewer failure-origin review
- Remaining risks, blocked evidence, or untested scope:
  - Org host, drawer and short window not rerun in the packaged app (browser-proven)
  - The right Team-tab member open has no product trigger
