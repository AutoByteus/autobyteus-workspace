# API/E2E Execution Coverage Report

`<T>` = `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership`

## Execution Round Meta

- Requirements Doc: `<T>/requirements-doc.md` (SR-002, approved 2026-10-06: Option 2, split)
- Investigation Notes: `<T>/investigation-notes.md`
- Solution Revision Record: `<T>/solution-revision-record.md`
- Design Spec: `<T>/design-spec.md`
- Supplemental Task Artifacts: None
- Design Review Report: `<T>/design-review-report.md` (ARCH-REV-002)
- Architecture Review Revision Record: `<T>/architecture-review-revision-record.md`
- Implementation Handoff: `<T>/implementation-handoff.md` (IR-002; no source change since `061d4698b`)
- Implementation Revision Record: `<T>/implementation-revision-record.md`
- Code Review Report: `<T>/code-review-report.md` (CRR-003)
- Code Review Revision Record: `<T>/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `<T>/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `<T>/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `<T>/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: CRR-003 Pass (targeted delta review) from `/code_reviewer` after SR-002 narrowed AC-003/AC-004/ASM-001; HEAD `20258294c` (docs only on top of `061d4698b`)
- Prior Round Reviewed: Round 1 (API-REV-001, Fail 90%)
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. Round 2 passes, so the durable test changes go to `/code_reviewer`.

## Investigation And Execution Basis

- Coverage investigation artifact: `<T>/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes` for final execution. One exploratory run of the new E2E came before the write-up and shaped the fixture design.
- Investigation plan followed: `Yes`
- Existing coverage decisions revised during execution: the integration historical-team failure was classified `Out Of Scope` (pre-existing). E-004 shows the real historical Team-member path works, which points to a stale seed fixture.
- Reroute required before or during execution: `Yes`, during execution: ASM-001 is false for Team-member reload hydration (Requirement Gap)
- Notes: the server fix behaves correctly on every server boundary tested.

## Test-Case Ledger Reconciliation (When Applicable)

- Ledger path: `<T>/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes` for the browser cases. The repository cases were recorded from logs immediately after each run.
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 14 (cleanup)
- Cases still running, interrupted, or not started: none
- Interruption, context-compression, or rerun note: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-001 | Pass | 1 | console / `repo-broad.log` | the known pre-existing failure is excluded |
| E-001 | Pass | 3, 8 | `run3.log`, `final-*.log` | — |
| E-002 | Pass | 3, 8 | same | — |
| E-003 | Pass | 3, 8 | same | — |
| E-004 | Pass | 3, 8 | same | — |
| I-001 | Pass | 6, 8 | `repo-broad.log`, `final-integration.log` | — |
| E-005 | Pass (defect detected on base) | 4 | `base-source-run.log` | — |
| E-006 | Pass | 5, 8 | `repeat-*.log`, `final-*.log` | 8/8 stable |
| R-002 | Pass | 6, 7 | `agy-e2e.log`, `web-viewer.log` | — |
| B-001 | Pass | 10 | `browser/03..06*.png` | — |
| B-002 | Pass | 11 | `browser/10, 11*.png` | — |
| B-003 | Out Of Scope (SR-002) | 12 | `browser/12-team-after-reload.png` | Round 1 Fail. Team-member UI reload hydration moved to the follow-up ticket by SR-002 Option 2. Retained as evidence for that ticket |
| B-004 | Out Of Scope (SR-002) | 13 | `browser/13-team-historical-member-empty.png` | Same; follow-up ticket |
| E-001..E-004, R-001 (round 2 rerun) | Pass | 15, 16 | `round2-e2e.log`, `round2-repo.log` | rechecked on HEAD `20258294c` |
| B-005 | Pass | 17 | `browser/20-standalone-historical-reopen.png` | amended AC-004 (standalone UI, inactive run) |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The lazy singleton is gone, and there is no unbound fallback.
- Approved persisted-data transition followed: `Yes` (`Not Affected`). The existing `file_changes.json` is read directly on terminate and restore (E-003).
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| E-001 | BEH-001/002; REQ-001/002; AC-002, AC-003, AC-006 (server) | bound authority, attached cache, per-call reader | real Studio server, WS, GraphQL, REST; fake AGY | Durable | Pass | `run3.log`, `final-*.log` |
| E-002 | BEH-001/002; AC-001, AC-006 (server) | same, Team member | team WS | Durable | Pass | same |
| E-003 | BEH-003; REQ-003; AC-004; RU-001 | detach → disk read; restore re-attach | GraphQL terminate/restore | Durable | Pass | same |
| E-004 | BEH-003; AC-004 | inactive Team-member read | GraphQL terminate | Durable | Pass | same |
| I-001 | REQ-004; AC-005; RU-002 | attached cache status update | Fastify inject | Durable | Pass | `final-integration.log` |
| E-005 | defect detection | — | base `src` | Temporary | Pass (fails on base as expected) | `base-source-run.log` |
| R-001/R-002 | AC-001..AC-005, CTR-001, RU-003 | unit, architecture, routing | Vitest | Durable (existing) | Pass (pre-existing failure excluded) | logs |
| B-001 | AC-006, ASM-001, SCN-001/002 (standalone) | renderer + fixed server | Browser | Browser | Pass | `browser/05, 06*.png` |
| B-002 | AC-006, ASM-001, SCN-001 (Team member) | renderer + fixed server | Browser | Browser | Pass | `browser/11*.png` |
| B-003 | SCN-002 Team-member UI (out of scope under SR-002) | renderer Team hydration | Browser | Browser | Out Of Scope (round-1 Fail, follow-up ticket) | `browser/12*.png` |
| B-004 | SCN-003 Team-member UI (out of scope under SR-002) | renderer Team hydration | Browser | Browser | Out Of Scope (round-1 Fail, follow-up ticket) | `browser/13*.png` |
| B-005 | amended AC-004 (standalone UI), SCN-003, REQ-003 | fixed server read of an inactive run through the renderer | Browser | Browser | Pass | `browser/20-standalone-historical-reopen.png`, `browser/historical-backend.log` |
| E-001..E-004 (round 2) | amended AC-003 (API, Team member) and AC-004 (API, any run) | as round 1 | real Studio server | Durable | Pass | `round2-e2e.log` |

## Additional Repository Coverage Execution

None beyond the investigation's table.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | +2 (round 1: 85%) | Every SR-002 AC has direct proof. AC-001/AC-002/AC-005: E-001/E-002, I-001. AC-003: Team-member API (E-002), standalone API (E-001) and standalone UI reload (B-001). AC-004: API for any run (E-003, E-004) and standalone UI history (B-005). AC-006: live UI for both run kinds (B-001, B-002) | none in scope |
| Changed-boundary execution directness | 97% | 97% | 0 | Real Studio composition binds the real authority | — |
| Cross-boundary integration realism and mock gap | 95% | 97% | +2 | Real renderer + built backend; only the AGY CLI is emulated | Real `agy` and model not used (not a changed boundary) |
| Environment, configuration, identity, and fixture fidelity | 93% | 94% | +1 | Built worktree `dist`, real SQLite migrate, owned HOME | Fake CLI timing |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 94% | +1 | terminate (API and UI stop control), restore, 409 → 200, 404, close/new supervisor, base reproduction, 9× stable | Concurrent read vs. in-flight `handle()` (pre-existing property) |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | +10 (round 1: 70%) | Standalone: live mid-turn, reload, historical reopen. Team member: live mid-turn. Team-member reload/history UI is out of scope under SR-002 (follow-up ticket) | Packaged Electron shell not run (no shell change) |
| Durable regression coverage quality and relevance | 96% | 96% | 0 | E2E fails on base with the user's 404 and passes on the fix | — |

- Overall post-repository confidence: 93%
- Overall final confidence: 96% (simple average 670/7 = 95.7%). Round 1 was 90%.
- Calculation method: simple average, with each category checked against the 90% floor
- Confidence change produced by broader validation: round 1 proved the live UI for both run kinds and found the Team-member hydration gap. Round 2 applies the SR-002 scope and adds standalone UI history (B-005).
- Every critical acceptance criterion directly proven: `Yes` (AC-001..AC-006 as amended by SR-002)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none in scope. The Team-member UI hydration gap is tracked as the follow-up ticket.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required`, Browser (web-equivalent) on a test-owned stack
- Material deviation from the planned mode: none. I drove the journey interactively with the AutoByteus browser tools and asserted DOM state through `run_script`.
- Confidence gap addressed: AC-006 / ASM-001 in the Artifacts tab
- If `Not Required`: N/A
- If `Blocked`: N/A
- Startup order, commands, and readiness:
  - `pnpm -C autobyteus-server-ts prebuild && build` (exit 0)
  - then `node <T>/api-e2e-evidence/browser/launch.mjs <worktree> standalone|team`, which runs `prisma migrate deploy` → `dist/app.js` (`/rest/health` 200) → `nuxt dev` (`/` 200)
- Environment choices: private HOME/data/SQLite per stack; free ports (standalone 39095/45053, team 43527/45941); fake AGY CLI with `AGY_FAKE_IMAGE_STEPS=1,2,3` and a file gate before images 2 and 3
- Seed data / fixtures: `plant.py` writes three 64×64 PNGs (red/green/blue) and AGY step outputs. "Image Creator" and the "Marketing Team" (`content_creator`, `reviewer`) are created through GraphQL. The user message is sent through the real composer.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| B-001: send "Generate three images." (standalone) | image 1 row appears and previews | row `image_1_1.png`; viewer auto-selects it; red image rendered; status Running | `04-after-send.png` | Pass |
| B-001: release image 2 (this is the base-defect moment) | image 2 previews; image 1 still previews | both: `img` blob src, `naturalWidth` 64, no "File not found" | `05-image2-live-preview.png` | Pass |
| B-001: release image 3, turn completes | 3/3 preview | 3/3 rendered; status Idle | DOM result | Pass |
| B-001: reload page (run still active, `isActive: true`) | 3 listed (GraphQL hydration), 3/3 preview | 3 listed, 3/3 rendered | `06-after-reload-image3.png` | Pass |
| B-001: backend log | no 404 on the content route | 0 `file-change-content` warnings | `browser/standalone-backend.log` | Pass |
| B-002: Team member live, images 1 → 2 → 3 | each previews | 1, then 1–2 mid-turn (Running), then 1–3 after completion; all rendered | `11-team-image2-live-preview.png` | Pass |
| B-003: reload; reselect `content_creator`; Artifacts | 3 listed and previewable | "No touched files yet" (0 rows). Server: `getRunFileChanges(content_creator_7abc…)` returns 3 available entries | `12-team-after-reload.png`; curl output in the ledger | **Fail** |
| B-004: terminate team; reload; member Artifacts | 3 listed (historical) | 0 rows. Server: 3 entries; REST 200 image/png for each | `13-team-historical-member-empty.png` | Round 1 Fail; out of scope under SR-002 |
| B-005 (round 2): standalone send through the composer (gates pre-opened), turn completes | 3 listed | 3 listed; status Idle | DOM result | Pass |
| B-005: stop the run with the UI's `terminate-agent-run` control | run inactive | status Offline. Server: `isActive: false`; `getRunFileChanges` returns 3 available entries | GraphQL check | Pass |
| B-005: fresh page load; reopen the run from the sidebar; Artifacts | 3 listed from history, each previews | 3 listed; 3/3 rendered (blob, 64 px, no "File not found"); 0 content-route warnings in the backend log | `20-standalone-historical-reopen.png`, `historical-backend.log` | Pass |

Root-cause evidence for B-003/B-004 (frontend, pre-existing):
- `getRunFileChanges` is called only from the agent-run open path (`autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` → `services/runHydration/runContextHydrationService.ts`).
- No team-run or team-member hydration path (`teamRunOpenCoordinator.ts`, `teamMemberInspectionCoordinator.ts`, `teamRunContextHydrationService.ts`, `teamMemberProjectionHydrationService.ts`, `teamRunHydrationCommit.ts`) references file changes or artifacts.
- `git diff --stat 5c74fed71 HEAD -- autobyteus-web` is empty, so this ticket did not cause it.
- Team-member rows exist only from live `FILE_CHANGE` stream events.

## Platform / Runtime Targets

- Operating system / platform: Linux 6.12 (container)
- Runtime and relevant framework versions: Node v22.23.3; Vitest; Nuxt dev; fake AGY CLI reporting `agy version 1.2.11`
- Browser / engine: headless Chromium via the AutoByteus browser tools
- Device / viewport / locale: default desktop viewport; English UI

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: `file_changes.json` written by the real recorder, then read after terminate (E-003, E-004, B-004 server) and after restore (E-003)
- Direct-use result and evidence: Pass (E-003/E-004)
- Migration completion/recovery evidence: N/A
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (uncommitted in the worktree)

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts` | Added (E-001..E-004) | REQ-001..REQ-003, AC-001..AC-004, AC-006 server boundary, RU-001 | Pass 2/2 ×8 on the fix; fails on base with the user's 404 |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated: `image_done` + `AGY_FAKE_IMAGE_STEPS`/`AGY_FAKE_IMAGE_GATE` mode; the single-image path is unchanged | E2E support | Routing 14/14; existing AGY E2E pass |
| `autobyteus-server-ts/tests/integration/api/run-file-changes-api.integration.test.ts` | Updated (I-001: 409 → 200 completion) | REQ-004, AC-005, RU-002 | Pass |

- Added or updated paths attached for proportional test-code review: `Yes` (attached for awareness; the failure-origin review comes first)
- Diff or repository evidence supplied for removed paths: N/A

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `<T>/api-e2e-evidence/*.log` | Vitest logs (ANSI stripped) | Retained | `base-source-run.log` is the hardened base rerun |
| `<T>/api-e2e-evidence/browser/*.png` | Screenshots (supporting) | Retained | DOM assertions are the proof |
| `<T>/api-e2e-evidence/browser/launch.mjs`, `plant.py` | Temporary launcher/seed | Retained as evidence | Not product code |
| `<T>/api-e2e-evidence/browser/*-backend.log`, `*-migrate.log`, `*-frontend-tail.log`, `*-run.json` | Stack logs, run IDs | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `git checkout 5c74fed71 -- autobyteus-server-ts/src` (E-005) | prove the E2E detects the defect | fails at `image_2_1.png` → 404 | `git checkout HEAD -- autobyteus-server-ts/src`; `git status` clean for `src` |
| `launch.mjs` stacks (B-001..B-004) | real renderer + built backend | see journey table | stopped by SIGTERM; `CLEANED` both owned dirs |
| `pnpm -C autobyteus-web exec nuxt prepare` | web specs needed `.nuxt` | 19/19 | generated `.nuxt` (gitignored) |
| server `prebuild`/`build` | built backend for the browser stack | exit 0 | `dist/` outputs are untracked build output; nothing staged |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity (AGY) CLI and model | project fixture `tests/fixtures/agy-failure-cli.mjs` (documented in TESTING.md) | Deterministic, no quota; the change is server-internal | Real CLI timing and image generation are not exercised (not a changed boundary) |
| AGY brain image files | planted under an owned HOME in AGY's on-disk format | same | none for this change |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-001, R-002, E-001..E-006, I-001, B-001, B-002, B-005 (round 2 reruns included) | The server fix is correct on every tested boundary. It reproduces and fixes the user's defect (image 2+ → 404 on base, 200 on fix), live and after reload for standalone runs, and live for Team members |
| Out Of Scope (SR-002) | B-003, B-004 | Round 1 Fail: Team-member Artifacts tab empty after a reload and for historical Team runs, although the server returns every entry. This is a pre-existing frontend hydration gap. The user chose Option 2 (split), so it is the follow-up ticket |
| Out Of Scope | — | Pre-existing integration failure "hydrates historical AutoByteus team-member file changes" (fails on base; E-004 shows the real path works); RSK-001 wording |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Vitest temp HOMEs `/tmp/agy-multi-image-home-*` | mine | afterAll rm; one leftover from the first base run removed by hand | none remain |
| Orphan fake AGY CLI (pid 20278, from the first base run) | mine (args under my temp HOME) | `kill` | gone |
| Browser stacks `/tmp/rfc-browser-standalone-*`, `/tmp/rfc-browser-team-*`, `/tmp/rfc-browser-historical-*` (backend, Nuxt, fake CLI) | mine | launcher SIGTERM (by exact PID) → process-group kill → rm | `CLEANED` ×3; no owned processes remain |
| Browser tab | mine | `close_tab` | closed |
| `src` temporary base checkout | mine | restored to HEAD | clean |
| User's server (`node dist/app.js --port 8000 --data-dir /home/autobyteus/data`, pid 59) | user | none | untouched |
| `/tmp/rfc-e2e`, `/tmp/rfc-browser` scratch (logs/scripts) | mine | copied into `<T>/api-e2e-evidence/` | scratch left in /tmp (logs only) |

## Preliminary Classification

N/A. Round 2 passes. The round-1 `Requirement Gap` (ASM-001 for Team-member reload/history UI) was resolved upstream by SR-002 (Option 2, split into a follow-up ticket). No implementation defect was found in the reviewed server change.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`; executed (Browser, rounds 1 and 2)
- Critical acceptance criteria lacking direct proof: none (AC-001..AC-006 per SR-002)
- Preliminary classification and recommended owner: N/A (Pass)
- Next recipient from `get_handoff_rules`: `/code_reviewer` (proportional test-code review; Medium/High)
- Notes:
  - Out of scope and tracked elsewhere: Team-member UI hydration (follow-up ticket, evidence B-003/B-004), the stale-seed integration case "hydrates historical AutoByteus team-member file changes", and RSK-001.
  - The durable test changes are uncommitted in the worktree.
