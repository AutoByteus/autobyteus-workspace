# API/E2E Test-Case Ledger — collapsed-left-panel-expand-keeps-run

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run`
- Coverage investigation: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-revision-record.md`
- Ledger scope and reason: multiple browser journeys, long probes and a desktop build (API-REV-001).
- Last updated: 2026-10-08

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-FOCUSED | Changed specs | AC-006/007/010/011, REQ-003/004/009 | Vitest/jsdom | `pnpm -C autobyteus-web test:nuxt <specs> --run` | 1 | |
| UNIT-FULL | Full web unit suite | regression | Vitest | `pnpm -C autobyteus-web test:nuxt --run` | 2 | |
| PMU-017 | Task card (Agent/Team/Org hosts) → Workspaces; drawer; short window; New chat | AC-001/003/005/008/009/010/011/012 | Browser + real backend | `test:e2e:project-manager-ux --cases PMU-017` | 3 | tightened |
| PMU-018 | Nested non-coordinator task-Team member; first send; far-down Org; slow start with/without user scroll; route highlights; page icon | AC-002/004/006/011, REQ-005 | Browser + real backend | `--cases PMU-018` | 4 | new |
| NAV-PROBE | `projects-primary-navigation` probe (reads the strip's page-icon order) | AC-010, REQ-001 | Browser, renderer-only | `test:e2e:projects-navigation` | 4b | found during investigation |
| PMU-FULL | PMU-001..PMU-018 regression | REQ-007 preserved | Browser | `test:e2e:project-manager-ux` | 5 | |
| CDR-LIVE | chat-draft-rows-live D00–D14 (D02/D11 updated) | REQ-008, R-002 | Browser + Codex | `test:e2e:chat-draft-rows-live` | 6 | Codex quota |
| DSK-001 | Isolated desktop: collapse → Task card worker → Workspaces | AC-001 (+AC-002 if seedable) | Packaged Electron | `isolated-app start --build` + control port | 7 | temporary |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UNIT-FULL | 2026-10-08 | Started | `pnpm -C autobyteus-web test:nuxt --run` | all pass | running | — | `api-e2e-evidence/web-unit-full-run.log` | |
| 2 | UNIT-FULL | 2026-10-08 | Completed | same | all pass | 589 files passed / 2 skipped; 4016 tests passed / 5 skipped; EXIT=0 (includes every changed spec, so UNIT-FOCUSED is covered by this run) | Pass | `api-e2e-evidence/web-unit-full-run.log` | |
| 3 | PMU-017 | 2026-10-08 | Completed | `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir …/pmu-017-018-r1 --cases PMU-017,PMU-018` (tightened PMU-017) | 3 hosts: exact worker row selected/visible/focused, only selected row, route+selection unchanged; drawer; short window; New chat nothing selected | All assertions held | Pass | `api-e2e-evidence/pmu-017-018-r1/` | PMU-018 failed in the same run: probe selector (right Team tab is messages-only) |
| 4 | PMU-018 | 2026-10-08 | Checkpoint | r2–r4 | — | r2: same old step (edit not applied); r3: nested member rows carry the host Team run id → selector fixed; r4: A/B/C pass, D precondition false (Org worker row is rendered from the live Org projection when the panel appears) → D reworked to a slow app start | — | `api-e2e-evidence/pmu-018-r2..r4/` | Probe-only corrections; no product defect |
| 5 | PMU-018 | 2026-10-08 | Completed | `--cases PMU-018` (r5) | A nested non-coordinator member; B first send; C far Org large scroll; D1 slow start + user scroll → no jump; D2 slow start → revealed; E highlight; F page icon | All assertions held | Pass | `api-e2e-evidence/pmu-018-r5/` | |
| 6 | NAV-PROBE | 2026-10-08 | Completed | `pnpm -C autobyteus-web test:e2e:projects-navigation` r1 | B-001..B-005 | r1 B-001 Fail: page-icon selector also matched Workspaces (stale assertion) | Fail (stale test) | `api-e2e-evidence/projects-navigation-r1/` | Selector narrowed + Workspaces-after-page-icons assertion |
| 7 | NAV-PROBE | 2026-10-08 | Completed | r2 / r3 after update | B-001..B-005 | r2 B-003 Fail during Nuxt "optimized dependencies changed. reloading" (cold cache); r3 all 5 pass, no reload | Pass | `api-e2e-evidence/projects-navigation-r2/`, `-r3/` | |
| 8 | PMU-FULL | 2026-10-08 | Started | `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir …/pmu-full-r1` | PMU-001..PMU-018 pass | running | — | `api-e2e-evidence/pmu-full-r1/` | |
| 9 | PMU-FULL | 2026-10-08 | Completed | same | all pass, cleanup clean | PMU-001..PMU-018 Pass (PMU-017 21 s, PMU-018 46 s); backend/frontend terminated, browser closed, data root removed | Pass | `api-e2e-evidence/pmu-full-r1/evidence.json` | |
| 10 | CDR-LIVE | 2026-10-08 | Started | `pnpm -C autobyteus-web test:e2e:chat-draft-rows-live --output-dir …/chat-draft-rows-r1` (Codex default) | D00–D14 pass | running | — | `api-e2e-evidence/chat-draft-rows-r1/` | |
| 11 | CDR-LIVE | 2026-10-08 | Completed | r1 | D00–D14 pass | 13 pass; D04 Fail (tree "+" clicked by position `nth(1)` hits the group Archive-all button added on the base by `9faa6bc75` → baseline test failure); D11 Fail "Keyboard order differs" (same controls, same order; the collapse control is now identified by its new `data-test` instead of its title → stale expectation). D11 stopped before the changed Workspaces reopen | Fail (test-side) | `api-e2e-evidence/chat-draft-rows-r1/` | D04 baseline fix (select "+" by its name); D11 expectation updated; rerun |
| 12 | CDR-LIVE | 2026-10-08 | Started | r2 after the two probe fixes | D00–D14 pass | running | — | `api-e2e-evidence/chat-draft-rows-r2/` | |
| 13 | CDR-LIVE | 2026-10-08 | Completed | r2 | D00–D14 pass | 15/15 Pass; D02 on-run Chat row not lit; D11 Workspaces reopen: route `/chat?id=daily_assistant_…` unchanged, 7 rows, panel shown; no browser errors; processes stopped, root removed, ports free | Pass | `api-e2e-evidence/chat-draft-rows-r2/chat-draft-rows-live-evidence.json` | |
| 14 | DSK-001 | 2026-10-08 | Checkpoint | `pnpm -C autobyteus-web build:electron:mac` | packaged build | EXIT=0 | — | `api-e2e-evidence/isolated-desktop/build-electron-mac.log` | |
| 15 | DSK-001 | 2026-10-08 | Checkpoint | `isolated-app start --from-worktree --data-root /tmp/clp-dsk-root-osxQ` (restricted PATH), `.env` + `restart` | instance ready on the scripted CLI | `iso-58732-348d`, control 58732, server 58733; workers started via the scripted CLI | — | `isolated-desktop/start-1.json`, `restart-1.json` | |
| 16 | DSK-001 | 2026-10-08 | Checkpoint | `dsk-001.mjs` run-1..run-3 | — | Driver issues: workspace locator substring matched "Temp Workspace"; unconditional strip click while docked; leftover window state / hidden tab-list duplicate | — | `isolated-desktop/run-1..run-3/` | Driver fixed (exact locator, conditional click, fresh reload, `:visible`) |
| 17 | DSK-001 | 2026-10-08 | Completed | `dsk-001.mjs` run-4 | Agent + Team journeys; New chat focus on the Workspaces section | Agent Pass, Team Pass; New chat Fail: focus on the stale Team row on `#/chat` | Fail (FAIL-001) | `isolated-desktop/run-4/evidence.json` | Instance stopped, data root removed |
| 18 | PMU-018 | 2026-10-08 | Completed | `--cases PMU-018` r6 with step G (in-app New chat after a Team run) | Focus on `app-left-panel-run-history` | Focus on `workspace-team-member-<team>-/manager`, tree scrolled 773→844; route/text/selection unchanged | Fail (FAIL-001) | `api-e2e-evidence/pmu-018-r6/` | Routed for failure-origin review |

## Re-entry And Reconciliation

- Last durably recorded event: 18
- Last completed case and result: PMU-018 r6 Fail (FAIL-001)
- Cases still running, interrupted, or not started: none
- Reconciled into execution coverage report: `Yes` — § Test-Case Ledger Reconciliation
- Rerun plan after rework: PMU-018 (A–G), PMU-017, UNIT-FULL, DSK-001 New chat step (the driver is reusable)
- Next case or recovery action: DSK-001 after CDR-LIVE (the desktop build rebuilds shared server/SDK outputs)
- Reconciled into execution coverage report: `No`
