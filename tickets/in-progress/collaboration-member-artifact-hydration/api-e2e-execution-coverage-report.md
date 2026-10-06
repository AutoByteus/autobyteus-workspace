# API/E2E Execution Coverage Report

`<T>` = `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration`

## Execution Round Meta

- Requirements Doc: `<T>/requirements-doc.md` (SR-003)
- Investigation Notes: `<T>/investigation-notes.md`
- Solution Revision Record: `<T>/solution-revision-record.md`
- Design Spec: `<T>/design-spec.md`
- Supplemental Task Artifacts: `<T>/design-principles-recheck.md`; predecessor folder (evidence only)
- Design Review Report: `<T>/design-review-report.md` (ARCH-REV-001)
- Architecture Review Revision Record: `<T>/architecture-review-revision-record.md`
- Implementation Handoff: `<T>/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `<T>/implementation-revision-record.md`
- Code Review Report: `<T>/code-review-report.md` (CRR-001)
- Code Review Revision Record: `<T>/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `<T>/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `<T>/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `<T>/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: CRR-001 Pass
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` by route. API/E2E changed no durable test code; review covers the evidence/harness only.

## Investigation And Execution Basis

- Coverage investigation: `<T>/api-e2e-coverage-investigation.md`
- Investigation completed before final execution: `Yes`. It was finalized after the run with the observed results.
- Plan followed: `Yes`
- Coverage decisions revised during execution: none
- Reroute required: `No`

## Test-Case Ledger Reconciliation (When Applicable)

- Ledger path: `<T>/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes` (planned cases)
- Every completed case recorded immediately: `Yes`
- Checkpoints recorded: `Yes` (setup, logs)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 14 (cleanup)
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-001 | Pass | 1 | `web-changed-specs.log` | the known pre-existing failure is excluded |
| B-001 (AC-001) | Pass | 3 | `browser/ac001-team-active-reload-creator.png` | — |
| B-002 (RU-001) | Pass | 4 | DOM | — |
| B-003 (AC-003) | Pass | 5 | `browser/ac003-org-active-reload-eng-creator.png` | — |
| B-004 (AC-006) | Pass | 6 | DOM | — |
| B-005 (AC-005, best effort) | Pass | 7 | `browser/send-c.out` | exact interleave stays unit-proven |
| B-006 (REQ-003, RU-002) | Pass | 8 | `browser/send-d.out` | — |
| B-007 (AC-002) | Pass | 9 | `browser/ac002-team-historical-creator.png` | — |
| B-008 (AC-004) | Pass | 10 | `browser/ac004-org-historical-eng-creator.png` | — |
| M-001 | Pass (defect detected on base; restored) | 12, 13 | DOM | — |

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No` (renames with no aliases; `activityReplacements` removed)
- Persisted-data transition: `N/A` (frontend in-memory only)
- Durable coverage retained only for compatibility: `No`
- Reroute: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001..AC-007 | hydration owner + paths (Apollo doubles) | Vitest | Durable (implementation's) | Pass | `web-changed-specs.log` |
| B-001 | BEH-001, REQ-001, AC-001 | Team open (non-focused member) → owner → store | Browser, real stack | Browser | Pass | `ac001-*.png` |
| B-002 | RU-001 | per-member isolation | Browser | Browser | Pass | DOM |
| B-003 | BEH-003, REQ-002, AC-003 (incl. nested) | Org staging → owner → staged `commit()` | Browser | Browser | Pass | `ac003-*.png` |
| B-004 | BEH-004, REQ-004, AC-006 | standalone open with the shared `fetchRunFileChanges` | Browser | Browser | Pass | DOM |
| B-005 | BEH-005, REQ-003, AC-005 | merge vs. live stream around the open | Browser (near-concurrent) | Browser | Pass | `send-c.out`, DOM timeline |
| B-006 | BEH-005, REQ-003 | live rows after hydration | Browser | Browser | Pass | `send-d.out`, DOM timeline |
| B-007 | BEH-002, REQ-001, AC-002 | historical Team member | Browser | Browser | Pass | `ac002-*.png` |
| B-008 | BEH-003, REQ-002, AC-004 (incl. nested) | historical Org members | Browser | Browser | Pass | `ac004-*.png` |
| M-001 | defect detection | base vs. fix | Browser | Temporary | Pass | DOM |

## Additional Repository Coverage Execution

None beyond the investigation's table.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 97% | +12 | AC-001..AC-004 and AC-006 proven in the real UI, incl. a nested-Team Org member, active and historical. AC-005 is unit-proven plus real near-concurrent and live-after-hydration runs. AC-007 is unit only (MP-001, not a supported scenario) | — |
| Changed-boundary execution directness | 80% | 97% | +17 | Real Apollo `GetRunFileChanges` for real member IDs, real stores, every changed member path except stream recovery | Stream recovery not browser-forced (unit) |
| Cross-boundary integration realism and mock gap | 75% | 96% | +21 | Built worktree backend + Nuxt dev; only the AGY CLI is emulated (project fixture) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 94% | +9 | Owned SQLite/HOME; definitions and runs through public GraphQL; turns through the real WebSockets | Fake CLI |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 93% | +3 | Reload, history, coordinator isolation, live-after-hydration, near-concurrent live, mutation check on base | Exact in-flight interleave unit-only; stream-recovery path unit-only |
| User-surface, browser, and desktop-shell confidence | 60% | 96% | +36 | All in-scope journeys rendered (list rows, blob previews, no "File not found") | Packaged Electron not run (no shell change) |
| Durable regression coverage quality and relevance | 95% | 95% | 0 | Implementation specs fail on base; the browser journeys also fail on base (M-001) | Browser journeys are temporary |

- Overall post-repository confidence: 81%
- Overall final confidence: 95% (simple average 668/7 = 95.4%)
- Calculation method: simple average, with each category checked against the 90% floor
- Confidence change from broader validation: +14. It removed the real-UI and real-server uncertainty for every in-scope path.
- Every critical acceptance criterion directly proven: `Yes`. AC-005 has a deterministic unit proof plus real-stack corroboration. AC-007 is unit-only by design (MP-001).
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the exact in-flight interleave and stream recovery are unit-only

## Broader Validation Decision And Execution

- Decision: `Required`, Browser (web-equivalent) on an owned real stack
- Deviation: none. I drove the journeys interactively with the AutoByteus browser tools and asserted DOM state with `run_script`.
- Startup:
  - `pnpm -C autobyteus-server-ts prebuild && build` (exit 0)
  - then `node harness/launch.mjs <worktree> main`: `prisma migrate deploy` → `dist/app.js` (`/rest/health` 200) → `nuxt dev` (ports 35065/34871)
- Environment:
  - `ANTIGRAVITY_CLI_COMMAND` = `harness/agy-member-wrapper.mjs` (wraps the project fixture `tests/fixtures/agy-failure-cli.mjs`; per-process conversation, distinct-colour PNGs; gate only when `gates/ENABLE` exists at launch)
  - `AGY_FAKE_CASE=image_done`, `AGY_FAKE_IMAGE_STEPS=1,2,3`
- Fixtures: through public GraphQL (`harness/setup.py`):
  - Team `Content Team b` (`lead` coordinator, `creator`)
  - Org `Studio Org b` (`designer`, nested Team `eng`: `lead`, `creator`)
  - standalone run
  - gated Teams `c` and `d`
  - Image turns go through the real WebSockets (`harness/send.mjs`): `/ws/agent-team`, `/ws/agent-org` (the web client's `SEND_MESSAGE` root shape) and `/ws/agent`.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| AC-001: fresh load, active Team `b`, select `creator` (non-coordinator), Artifacts | 3 listed, previews | 3 listed; 3/3 rendered (blob, 64 px); path conversation `2a24c09e` = creator's own; no "File not found" | `ac001-team-active-reload-creator.png` | Pass |
| RU-001: select `lead` | none | "No touched files yet" | DOM | Pass |
| AC-003: fresh load, active Org `b`, `/designer` | 3 listed, previews | 3/3 (`8069ad62`) | DOM | Pass |
| AC-003: expand nested `eng`, `/eng/creator` | 3 listed, previews | 3/3 (`d45671f8`); URL `mode=active&memberAddress=/eng/creator` | `ac003-org-active-reload-eng-creator.png` | Pass |
| AC-006: standalone fresh load | 3 listed, previews | 3/3 (`86cacb0b`) | DOM | Pass |
| AC-005 (best effort): Team `c` gated, image 1 recorded; reload with image 2 released 4 s before the open, then reload with image 3 released 367 ms before the open (first list render 108 ms after the open click) | complete, no duplicates | after each: correct rows, no duplicates; final 3 rows, Idle | `send-c.out`, DOM timeline | Pass |
| RU-002: Team `d` gated; fresh load; creator hydrated with image 1 (Running); release images 2, 3 | live rows appended | timeline `1` → `2,1` → `3,2,1`; 3/3 preview; turn completed | `send-d.out`, DOM | Pass |
| AC-002: terminate Team `b` (server `isActive: false`, 3 entries); fresh load; creator | 3 listed, previews | Offline; 3/3 (`2a24c09e`) | `ac002-team-historical-creator.png` | Pass |
| AC-004: terminate Org `b` (inactive, entries intact); fresh load; `/designer`, `/eng/creator` | 3+3 | Offline; 3/3 and 3/3; URL `mode=history` | `ac004-org-historical-eng-creator.png` | Pass |
| Backend log | no content errors | 0 `file-change-content` warnings | `main-backend.log` | Pass |
| M-001: `git checkout db39803d4 -- autobyteus-web` (Nuxt hot reload), repeat AC-002 and AC-004 nested | empty (old defect) | both "No touched files yet", 0 rows | DOM | Pass (detects defect) |
| M-001: restore `git checkout HEAD -- autobyteus-web` (0 diff), repeat AC-002 | 3 rows | 3 rows | DOM | Pass |

## Platform / Runtime Targets

- Linux 6.12 (container); Node v22.23.3; Nuxt dev; headless Chromium (AutoByteus browser tools); default desktop viewport; English UI

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Persisted-data decision: `Not Affected` (frontend)
- Lifecycle exercised: page reload (fresh load), terminate → historical open, active vs. history modes for Org
- Version-specific branch or fallback observed: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed by API/E2E: `No`
- Implementation-owned durable coverage (already code-reviewed in CRR-001): the 17 spec files and `test-support/agentOrgApolloFixture.ts`. R-001 re-ran them.
- Added or updated paths attached for test-code review: `Not Applicable` (none by API/E2E)

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `<T>/api-e2e-evidence/browser/*.png` | screenshots (supporting) | Retained | DOM assertions are the proof |
| `<T>/api-e2e-evidence/browser/main-*.log`, `main-agy-launches.jsonl`, `send-c.out`, `send-d.out` | stack logs, AGY launch log, turn results | Retained | — |
| `<T>/api-e2e-evidence/harness/{launch.mjs,agy-member-wrapper.mjs,send.mjs,setup.py}` | temporary harness | Retained as evidence | Not product code; candidate for a future durable probe |
| `<T>/api-e2e-evidence/web-changed-specs.log` | R-001 output | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Owned stack (`harness/launch.mjs`) | real renderer + built backend | journeys above | `CLEANED /tmp/cmah-browser-main-PvRbmp`; no owned processes left |
| Fake-CLI wrapper | per-member distinct conversations/images; optional gate | `main-agy-launches.jsonl` | gone with the owned dir |
| `git checkout db39803d4 -- autobyteus-web` (M-001) | defect detection | base empty, fix 3 rows | restored; 0 diff vs HEAD |
| Server `prebuild`/`build` in this worktree | built backend | exit 0 | build outputs untracked or ignored; nothing staged |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI + model | project fixture via the temporary wrapper | deterministic, no quota; frontend-only change | none for this boundary |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-001, B-001..B-008, M-001 | Team and Org members (including a nested-Team member) list and preview every artifact after a reload and on historical runs. Live updates are kept without duplicates. Standalone is unchanged. The base frontend shows the old empty state |
| Not Tested (by design) | AC-007 browser | infrastructure-fault trigger (MP-001); unit-covered |
| Out Of Scope | REQ-006/AC-008; pre-existing `workspaceSelectionComposition` spec failure; predecessor RSK-001; stale-seed server integration test | — |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Stack `/tmp/cmah-browser-main-*` (backend, Nuxt, fake CLIs) | mine | launcher SIGTERM by exact PID → process group → rm | `CLEANED`; none remain |
| Browser tab | mine | `close_tab` | closed |
| `autobyteus-web` base checkout | mine | restored to HEAD | 0 diff |
| Stray Team run `a` (first setup attempt) | mine | terminated, then removed with the owned dir | gone |
| User's server `:8000` / `/home/autobyteus/data` | user | none | untouched |
| `/tmp/cmah` scratch (scripts, logs) | mine | copied to `<T>/api-e2e-evidence/` | scratch left (logs/scripts only) |

## Preliminary Classification

N/A (Pass).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` target met: `Yes`
- Any final applicable category below `90%`: `No`
- Broader validation decision: `Required`; executed (Browser)
- Critical acceptance criteria lacking direct proof: none. AC-007 is unit-only by design (MP-001).
- Preliminary classification: N/A
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Pass, High risk)
- Notes:
  - No durable test changes by API/E2E.
  - Residual: the exact in-flight interleave and the stream-recovery path are unit-only.
  - REQ-006 is pending with the user.
