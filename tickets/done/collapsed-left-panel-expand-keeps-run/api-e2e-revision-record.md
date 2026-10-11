# API/E2E Revision Record — collapsed-left-panel-expand-keeps-run

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer handoff IR-001 / round 1 | SR-004 (requirements SR-003), IR-001 | N/A | Fail / 89% |
| API-REV-002 | implementation_engineer handoff IR-002 (Local Fix CR-001) / round 2 | SR-004, IR-002, CRR-001 | Fail / 89% | Pass / 95% |
| API-REV-003 | implementation_engineer handoff IR-003 (reopened SR-006, new base) / round 3 | SR-006 (SR-003/SR-004 unchanged), IR-003 | Pass / 95% (old base) | Pass / 95% (new base) |

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

### API-REV-002 — Re-validation of the CR-001 fix; FAIL-001 resolved

- Triggering role, report path, and round: implementation_engineer, `implementation-handoff.md` (IR-002, `d0bf3db82`), round 2
- Triggering finding or case IDs: FAIL-001 → CR-001 (`code-review-report.md`, CRR-001; FO-SCN-001/002)
- Related revision IDs: SR-004, IR-002, CRR-001
- Why recorded: rework validation after a failure
- Coverage decisions or durable test paths changed: `project-manager-ux-probe.mjs` PMU-018 gains step H (`/agents` after an Agent run, `/projects` after a Team run) and a `scrollTop` check in G
- Cases added, changed, removed, or rechecked: UNIT-FULL, PMU-018 (A–H), PMU-FULL, DSK-001 (driver extended with an Org host). NAV-PROBE and CDR-LIVE carried forward with rationale.
- Commands, environment, fixture, or broader-validation delta:
  - rebuilt worktree app; new isolated instance `iso-63466-7dc1`
  - the OS window is resized to 1512×913 (the default 1200×768 docks no right panel)
  - the driver's New-chat assertion is aligned with REQ-009 (the stale highlight predates this change)

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| FAIL-001 (PMU-018 G; DSK-001 run-4) | Local Fix (confirmed by CR-001) | Resolved: focus on the Workspaces section, `scrollTop` 0, no row focus; also on `/agents` and `/projects` (H) | `api-e2e-evidence/r2-pmu-018/`, `r2-pmu-full/`, `isolated-desktop/r2-run-6/` |

- Canonical artifacts and sections updated: execution coverage report (full rewrite to round 2), coverage investigation (round-2 delta), ledger (events 19–25)
- Prior result and confidence: Fail, 89%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: delivery_engineer
- Remaining risks, blocked evidence, or untested scope:
  - history loads > 3 s are not scrolled (spec permits)
  - drawer, short window and zh-CN not rerun in the packaged app
  - the right Team-tab member open has no product trigger

### API-REV-003 — Re-validation of the reopened package on the new base

- Triggering role, report path, and round: implementation_engineer, `implementation-handoff.md` (IR-003, `95120f4d0`; merge `0604a9586` of `origin/personal` `d28c56d5d`), round 3
- Triggering finding or case IDs: none (reopening after cancellation, SR-006); the implementation reported a PMU-017 baseline race
- Related revision IDs: SR-006, IR-003; prior CRR-001, API-REV-002, DR-001..DR-003
- Why recorded: the same feature on a new base
- Coverage decisions or durable test paths changed (test-only baseline fixes):
  - `project-manager-ux-probe.mjs` PMU-017 settle wait (`4fb0259dd`)
  - `projects-primary-navigation-probe.mjs` dev-server warm-up (`c708178d3`)
- Cases rechecked: UNIT-FULL, PMU-FULL (PMU-001..PMU-019), PMU-017 ×4, NAV-PROBE (cold + warm), CDR-LIVE, DSK-001 (rebuilt app). REAL-001 carried forward (feature byte-identical; same path re-exercised by PMU-018 and DSK-001).
- Environment delta: rebuilt worktree app at `c708178d3`; instance `iso-62032-1caa` (restricted PATH, scripted AGY CLI in its own `.env`, 1512×913 window)

#### Prior Failure Resolution

None. API-REV-002 had no open failures.

- Canonical artifacts and sections updated: execution coverage report (round-3 section, latest result), coverage investigation (round-3 delta), ledger (events 27–35)
- Prior result and confidence: Pass, 95% (old base)
- Current result and confidence: Pass, 95% (new base)
- New or remaining failure IDs: none
- Recommended owner: delivery_engineer
- Remaining risks, blocked evidence, or untested scope: unchanged from API-REV-002
