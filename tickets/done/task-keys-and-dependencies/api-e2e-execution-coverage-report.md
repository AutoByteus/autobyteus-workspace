# API/E2E Execution Coverage Report — task-keys-and-dependencies

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies`)

## Execution Round Meta

- Requirements Doc: `…/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md`, VIS-001–015
- Design Review Report: `…/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-003)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Delivery Revision Record: `…/delivery-revision-record.md` (DR-001 Blocked → Local Fix → IR-004)
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: CRR-004 Pass (round 3, targeted delta of IR-004) from `/software_engineering_team/code_reviewer`: revalidate the integrated state at HEAD `c95e0138e8` (merged up to `origin/personal@66429d6f31`)
- Prior Round Reviewed: round 1 (API-REV-001, validated commit `d3686fd072`)
- Latest Authoritative Round: 2

## Round 2 — Rerun-By-Impact Plan (TESTING.md "Rerun by impact")

- Validated commit of round 1: `d3686fd072`. Current HEAD: `c95e0138e8`.
- `git diff --name-only d3686fd072 c95e0138e8` (excluding `tickets/`): 263 files.
- Shared foundations changed: the contract packages, `autobyteus-ts`, the E2E harness and fixtures (incl. `agy-failure-cli.mjs`), and the agent-tool contract (conflict-resolved).
- Decision: every case is **Rerun**, plus new cases: the combined Project + Task tool set (LIVE-001 extended with `update_project`), and the baseline fixes `fa49138794`, `9eeb58fb9d`, `361eea070d`. Per-case table: ledger, "Round 2 (API-REV-002)".
- Real-model runs: Claude Agent SDK + Claude Haiku 5.5 only (user instruction); no Codex.

| Area | Round 2 result at `c95e0138e8` |
| --- | --- |
| Builds | server dist and packaged app 1.5.5-beta.2 rebuilt; dist holds `create_project` / `update_project` and `depends_on` |
| Server typecheck / unit / architecture | Pass / 5811 pass / 44 pass |
| Web unit / guards | 4473 pass, 0 fail / Pass |
| Core Projects E2E (TKD-API-001) | 11 + 6 + 14 pass |
| Gated `tests/e2e/projects` (18 files, TKD-AGY-001) | 17/18; `task-copy-idle-lifetime` intermittent, cause below |
| `team-run-v1-production-upgrade` | 1/4. Fix `fa49138794` verified (ledger check passes with 12 new rows). 3/4: cause confirmed, below |
| Projects probe PT-E2E-001..017 | 17/17 (layout wait `361eea070d`) |
| PM-UX probe | 24/25; PMU-021 console error from a reload race (cause below); PMU-020/021 alone Pass ×2; PMU-008 now passes |
| Desktop DSK-001..006 | All Pass on the merged packaged app with release-written data |
| LIVE-001 (Haiku 5.5) | Pass, incl. `update_project` rename and `live-keys-5` after it |

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `…/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with these additions found during execution:
  - The whole gated `tests/e2e/projects` folder was run, not only the four suites the implementation ran: several more suites use the Task tools (`ad-hoc-task-delegation`, `collaboration-prompt-wording` and others).
  - The full PM-UX probe (25 cases) was run; it found one more outdated summary assertion (PMU-020 team host).
  - A real-model check (LIVE-001) was added at the user's direction: Claude Agent SDK runtime with Claude Haiku 5.5 only; no ChatGPT/Codex runtime was used anywhere in this round.
- Existing coverage decisions revised during execution:
  - `projects-feature-probe` PT-E2E-007/009 → `Needs Update` (they used the tool-returned `taskId`, now the key, as the board row id).
  - `ad-hoc-task-delegation` (update ack) and `collaboration-prompt-wording` CPW-R3 (fake `task_id` with wrong run IDs) → `Needs Update`.
  - `project-manager-ux-probe` PMU-008 → `Out Of Scope` (stale since `938933d8e2`).
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `…/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (desktop session split into DSK-001..006)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 23 (LIVE-001)
- Cases still running, interrupted, or not started: none
- Interruption or rerun note: the user interrupted once ("use claude agent sdk haiku 5 5 for testing. i dont have chatgpt credit left"). Nothing in this round had used Codex: its only reference, in `delegated-launch-config-defaults`, points at a deliberately missing command. The real-model check was then run on Claude Haiku 5.5.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R1–R3, R6, R7 | Pass (web: 1 known pre-existing failure) | 8–11 | `evidence/logs/server-*.log`, `web-*.log` | FU-API-001 |
| R4a/b, TKD-API-001 | Pass | 12–14 | `evidence/logs/server-e2e-*.log` | — |
| R5 (17 gated files), TKD-AGY-001 | Pass after test updates and solo reruns | 18–20 | `evidence/logs/server-e2e-projects-gated*.log`, `compare-*.log` | — |
| PT-E2E-001..017 | Pass (run 2) | 15–16 | `evidence/browser/projects-feature/` | — |
| PMU-001..025 | 24 Pass, PMU-008 out of scope | 21–22 | `evidence/browser/project-manager-ux-run1/`, `…-rerun/` | FU-API-003 |
| DSK-001..006 | Pass | 2–7 | `evidence/desktop/` | — |
| LIVE-001 | Pass | 23 | `evidence/live/` | — |
| R10a | Out of scope (pre-existing) | 17 | `evidence/logs/server-e2e-team-run-v1-production-upgrade.log` | FU-API-002 |

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility in scope: `No`. Long-ID inputs and URLs are approved behavior (REQ-019, REQ-022) through one resolver to the stored identity.
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without version-specific runtime fallback: `Yes`. Old shapes are read only by the migration; the desktop upgrade added exactly `taskKey` / `taskKeys` and nothing else.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Acceptance-Criteria Proof

- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/evidence/`

| AC ID | Critical | Proven By Case IDs | Evidence Files | Result |
| --- | --- | --- | --- | --- |
| AC-001 keys at creation (UI, tool), immutable | Yes | R3 (unit, incl. concurrent creates), API-010, TKD-API-001, PT-E2E-017, DSK-003d (`autobyteus-7` after upgrade), LIVE-001 (`live-keys-4`) | `logs/server-e2e-project-task-boundaries.log`, `browser/projects-feature/result.json`, `desktop/dsk-003-ui.json`, `live/live-001-claude-haiku.json` | Proven |
| AC-002 numbers never reused | Yes | R3, API-010, PT-E2E-017 (`keys-board-7` after deleting `-2`) | `browser/projects-feature/result.json` | Proven |
| AC-003 prefix kept on rename | Yes | R3, API-010 | `logs/server-e2e-projects-graphql.log` | Proven |
| AC-004 colliding prefix suffixed | Yes | R3, API-010, DSK-002 ("AutoByteus!" → `autobyteus-2`) | `desktop/dsk-002-upgrade-check.json` | Proven |
| AC-005 prefix rule | No | R3 (all five names), DSK-002 (`cafe-ops`, long name), PT-E2E-017 | `desktop/dsk-002-upgrade-check.json`, `logs/server-unit.log` | Proven |
| AC-006 upgrade keying, no lockout, second start no change | Yes | R3 (migration unit), R4b (real startup: unkeyable Project, retry, no-op), DSK-001/002/006 (data written by the released 1.5.5-beta.1 build, packaged worktree app) | `desktop/dsk-001-*`, `dsk-002-upgrade-check.json`, `dsk-006-restart-check.json`, `logs/server-e2e-projects-startup-migration.log` | Proven |
| AC-007 Temp task no key; `taskWorkerTasks.taskKey` null | Yes | R3, R6, DSK-005a/b | `desktop/dsk-004-005-agent.json`, `dsk-005b-tree-temp-row.png` | Proven |
| AC-008 set via Edit, stored on this Task only | Yes | PT-E2E-017, DSK-003b | `browser/projects-feature/result.json`, `desktop/dsk-003-ui.json` | Proven |
| AC-009 invalid dependencies rejected, nothing written | Yes | R3, API-010 (GraphQL), TKD-API-001 (tools: self, direct/indirect loop, unknown, other Project, snapshot unchanged) | `logs/server-e2e-project-task-boundaries.log` | Proven (editor error line: unit only, DEC-006) |
| AC-010 omitted keeps, `[]` clears | Yes | R3, API-010, TKD-API-001 | same | Proven |
| AC-011 feed carries fields, live update | Yes | R3, R5 `project-change-feed` (strict schema), PT-E2E-017 (live clear, no list request), DSK-004c (agent DONE clears a badge live) | `desktop/dsk-004c-*.png`, `dsk-004-005-agent.json` | Proven |
| AC-012 badges | Yes | R6, PT-E2E-017, DSK-003a–d/i, DSK-004 | `desktop/dsk-003d-board-keys-badges-1440x900.png`, `dsk-004a-first-load-after-restart.json` | Proven |
| AC-013 chip, copy, Dependencies card, rows | Yes | R6, PT-E2E-017 (clipboard read = key), DSK-003e (clipboard = key in Electron), DSK-004b | `desktop/dsk-003e-*.png`, `dsk-004b-*.png` | Proven |
| AC-014 picker | Yes | R6, PT-E2E-017, DSK-003b/f | `desktop/dsk-003f-picker-loop-1440x900.png` | Proven (OBS-001) |
| AC-015 new Task with dependency | Yes | PT-E2E-017, DSK-003d | `desktop/dsk-003d-*.png` | Proven |
| AC-016 tree summary with key | Yes | R6, DSK-005b, PMU-020/021/024/025 | `desktop/dsk-005b-*.png`, `browser/project-manager-ux-rerun/` | Proven |
| AC-017 long keys | No | R6, PT-E2E-017, DSK-003h | `desktop/dsk-003h-*.png` | Proven |
| AC-018 delete drops dependents | Yes | R3, API-010, PT-E2E-017 | `browser/projects-feature/result.json` | Proven |
| AC-019 blocked Task can be delegated/started/done | Yes | R3, TKD-API-001, TKD-AGY-001, DSK-005a, LIVE-001 | `logs/server-e2e-projects-gated-rerun.log`, `live/live-001-conversation.json` | Proven |
| AC-020 keys as tool Task IDs | Yes | R3, TKD-API-001, R5 suites, LIVE-001 (model never saw a long ID) | `live/live-001-conversation.json` | Proven |
| AC-021 isolated desktop journeys | Yes | DSK-001..006 | `desktop/` | Proven |
| AC-022 references by key (any case) / long ID, both delegate modes | Yes | R3, TKD-API-001, TKD-AGY-001, DSK-005a (`AUTOBYTEUS-5`), LIVE-001 | `logs/server-e2e-projects-gated-rerun.log` | Proven |
| AC-023 texts by key; "a deleted Task" | Yes | R3, R5 `task-existing-copy-assignment` (EXC-E2E-001..005), TKD-AGY-001 | same | Proven |
| AC-024 tool `depends_on` | Yes | R3, TKD-API-001, TKD-AGY-001 (Temp-task rules), LIVE-001 | same | Proven |
| AC-025 deleted Project prefix retired | Yes | R3, TKD-API-001 | `logs/server-e2e-project-task-boundaries.log` | Proven |
| AC-026 key URLs; long-ID URLs replaced | Yes | R6, PT-E2E-006/017, DSK-003g, DSK-004b, PMU-015 | `browser/projects-feature/result.json`, `desktop/dsk-003-ui.json` | Proven |
| AC-027 blocked Task via tools | Yes | R3, TKD-API-001, TKD-AGY-001, LIVE-001 | as above | Proven |

Round 2 (`c95e0138e8`): every row above was re-proven on the integrated state by the same cases.
- Desktop evidence: `evidence/desktop-r2/`.
- Live evidence: `evidence/live-r2/`, which also covers AC-003 (a model's `update_project` rename keeps the prefix: `live-keys-5`).
- Server and browser logs: `evidence/logs/r2-*`, `evidence/browser/*-r2*/`.

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| TKD-API-001 | REQ-018–020, AC-020/022/024/025/027 | Tool contract over MCP HTTP | Server E2E (scoped MCP session, native tool parity, file snapshots) | Durable | Pass | `logs/server-e2e-project-task-boundaries.log` |
| TKD-AGY-001 | REQ-018/019/020, AC-019/022/023/027 | `delegate_task` resolution, texts, Temp tasks | Gated server E2E, scripted AGY runtime | Durable | Pass | `logs/server-e2e-projects-gated-rerun.log` |
| PT-E2E-017 | REQ-009–014/022, AC-011–015/017/018/026 | Renderer ↔ GraphQL ↔ feed ↔ tools | Browser probe on a built backend | Durable | Pass | `browser/projects-feature/` |
| PT-E2E-001..016, PMU-001..025 | Preserved Projects behavior, AC-016/026 | Projects UI | Browser probes | Durable | Pass (PMU-008 out of scope) | `browser/` |
| DSK-001..006 | AC-006, AC-021 and the UI ACs | Packaged app, embedded server startup, upgrade of release-written data | Isolated desktop instances (installed 1.5.5-beta.1, then worktree build) | Desktop / Temporary | Pass (round 1 and round 2) | `desktop/`, `desktop-r2/` |
| LIVE-001 | REQ-018–021 with a real model; round 2 also the merged Project tools and AC-003 | Tool descriptions + contract as read by a model | Built server, Claude Agent SDK, Claude Haiku 5.5 | Live / Temporary | Pass (round 1 and round 2) | `live/`, `live-r2/` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prebuild && build`; `pnpm -C autobyteus-web build:electron:mac` | worktree | current dist and packaged app | Pass | `logs/server-build.log`, `logs/electron-build.log` |
| 2 | `pnpm -C autobyteus-server-ts typecheck` | worktree | types | Pass | `logs/server-typecheck.log` |
| 3 | `pnpm -C autobyteus-server-ts test:unit` | worktree | 710 files, 5753 tests pass, 7 gated skipped | Pass | `logs/server-unit.log` |
| 4 | `pnpm -C autobyteus-web test:nuxt --run` | worktree | 4448 pass, 1 pre-existing fail | Pass (in scope) | `logs/web-unit.log` |
| 5 | web guards | worktree | boundaries, localization | Pass | `logs/web-guards.log` |
| 6 | `env -i PATH HOME=<tmp> TMPDIR … vitest run tests/e2e/projects/{projects-graphql,projects-startup-migration,project-task-boundaries}.e2e.test.ts` | clean env | 11 + 6 + 12 tests | Pass | `logs/server-e2e-*.log` |
| 7 | same + `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs vitest run tests/e2e/projects` | clean env, scripted runtime | 17 files | Pass after updates (see ledger 18–20) | `logs/server-e2e-projects-gated*.log`, `logs/compare-*.log` |
| 8 | `pnpm -C autobyteus-web test:e2e:projects --output-dir=<fresh> --skip-server-build --ledger-file=<abs>` | probe-owned stack | PT-E2E-001..017 | Pass (run 2) | `browser/projects-feature/`, `browser/projects-feature-ledger.txt` |
| 9 | `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir <fresh> [--cases …]` | probe-owned stack, scripted runtime | PMU-001..025 | 24 Pass, PMU-008 out of scope | `browser/project-manager-ux-run1/`, `browser/project-manager-ux-rerun/` |
| 10 | `vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | clean env | pre-existing | 3/4 fail, out of scope | `logs/server-e2e-team-run-v1-production-upgrade.log` |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 97% | +12 | Every AC proven directly, most by two or more layers; AC-021 by the packaged app | AC-009's editor error line and AC-005's non-Latin names: unit level (pure presentation / pure rule) |
| Changed-boundary execution directness | 85% | 96% | +11 | Real MCP HTTP, real runtime delegation, real browser, packaged desktop, real model | — |
| Cross-boundary integration realism and mock gap | 80% | 96% | +16 | No mocks in the E2E layers; scripted runtime only replaces inference; LIVE-001 uses a real model | Only one model (Haiku 5.5) and one prompt shape tried |
| Environment, configuration, identity, and fixture fidelity | 80% | 96% | +16 | Upgrade data written by the installed released build (Projects code identical to base); owned data roots; packaged worktree app | — |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 93% | +5 | Restart no-op on the desktop; invalid inputs write nothing (snapshots); deleted Task / deleted Project / Temp task refusals; migration failure + retry in the startup E2E | Migration I/O failure not reproduced on the desktop (needs a fault; MP-001); concurrency only at unit level |
| User-surface, browser, and desktop-shell confidence | 70% | 96% | +26 | Browser probes + desktop at 1440×900 / 760×900, right-panel tab, tree, URLs; screenshots match VIS-001/003/006/008/011/012/013 | No Electron shell code changed; zh-CN in the desktop not separately checked (PT-E2E-016 + unit cover the strings) |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | Three new durable cases; outdated assertions in 6 existing probes/suites corrected to the approved behavior | — |

- Overall post-repository confidence: 82% (simple average)
- Overall final confidence: 95.6% (simple average); unchanged in round 2 (every case rerun at `c95e0138e8` with the same outcome for this ticket's behavior)
- Confidence change produced by broader validation: +13.6 points (desktop, browser, real model)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: migration I/O fault path only at E2E level on synthesized data; real-model behavior checked on one model.

## Broader Validation Decision And Execution

- Decision and mode: `Required`; Browser (durable probes) + Project Desktop Validation (isolated instances) + Live (real model, at the user's direction).
- Material deviation: the documented browser-automation CLI (`autobyteus-mcps/browser-automation/scripts/browser`) is not installed on this machine. I used `playwright-core` `connectOverCDP` on the instance's control endpoint (attach-only), as the repository's own desktop adapter does.
- Startup order and readiness:
  1. `pnpm --silent isolated-app start --app /Applications/AutoByteus.app --data-root <owned>` (iso-51714-eb1e, 1.5.5-beta.1, isolated-launch marker present). Seed through its GraphQL; set statuses and a context file with the release's own native tools; stop.
  2. `pnpm --silent isolated-app start --from-worktree --data-root <same>` (iso-52802-e5b4). Journeys; `restart`; checks; `stop`.
- Environment choices: the owned root's `server-data/.env` got `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` and `AGY_FAKE_CASE=linked_skills` (scripted runtime, no provider). The viewport is emulated via CDP at 1440×900 and 760×900.
- Seed data: 5 Projects in a known order ("AutoByteus", "Customer Onboarding Experience Redesign", "AutoByteus!", "Doomed Project" (then deleted), "Café Ops"); 12 Tasks; TODO / IN_PROGRESS / DONE / CANCELLED; 1 context file.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| DSK-002 first start on release-written data | Keys by creation order; prefixes by Project order; only key fields added; ledger SUCCEEDED once | Exactly that; `autobyteus-1..6`, `customer-onboarding-experience-redesign-1..3`, `autobyteus-2-1`, `cafe-ops-1`; no file added or removed; context bytes unchanged | `desktop/dsk-002-upgrade-check.json` | Pass |
| DSK-003 board / picker / Task page / copy / loop / URLs / long keys / narrow | VIS-001–009, 013–015 | 9/9 steps; screenshots match references; clipboard holds the key | `desktop/dsk-003-ui.json`, `dsk-003*.png` | Pass |
| DSK-004 right-panel tab | Keys + badges; tab Task view; dependency row opens in tab; key "Open in Projects"; live clear | As expected (first read failed on a harness bug, fixed and rechecked) | `desktop/dsk-004*.{json,png}` | Pass |
| DSK-005 tree summary | "<key> <summary>", key weight 500, tooltip/name with key; Temp without key | As expected | `desktop/dsk-005b-*.png` | Pass |
| DSK-006 restart | Nothing changes | No file changed; migration attempts still 1 | `desktop/dsk-006-restart-check.json` | Pass |
| LIVE-001 real model | Haiku 5.5 does the five steps with keys | Done in 6 tool calls, all by key; final reply names keys | `live/live-001-conversation.json` | Pass |

## Desktop Application Validation

- Approach executed: as planned. The released build wrote the upgrade data; the worktree packaged build ran the upgrade, the journeys and the restart.
- Web-equivalent behavior: all UI ACs, in the packaged renderer.
- Shell-specific / lifecycle behavior: embedded-server startup running the migration; restart. No Electron main or preload code changed.
- Effect on the user's running AutoByteus: `None` (separate instances, ports, data roots; only my own instance ids were stopped).
- Behavior not directly proven: none critical.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0), arm64; Node v22.23.1; Electron 42.4.1 (worktree build `AutoByteus_enterprise_macos-arm64-1.5.5-beta.1`); installed release 1.5.5-beta.1
- Browser probes: headless Google Chrome via playwright-core; locale en-US (PT-E2E-016 zh-CN)
- Claude Code 2.1.302 (Claude Agent SDK runtime) for LIVE-001, model `haiku` = Haiku 5.5 in the SDK catalog

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Migration Required` (keys); `Directly Usable` (`dependsOnTaskIds`, retired-prefix file).
- Representative existing data exercised: data written by the released build (DSK-001), plus the repository's synthesized released shapes (R4b, migration unit tests).
- Migration result: keys in creation order, marker last, only additive fields; second start no-op (DSK-006); FAILED Project preserved, retry completes (R4b).
- Version-specific runtime branch or compatibility fallback observed: `No`
- Residual untested persisted-data risk: an I/O fault during the desktop upgrade (outside operating assumptions, MP-001).

## Durable Coverage Changed In The Codebase

- Round 2: no durable test written by API/E2E. The baseline fixes made by implementation in IR-004 were validated and go to proportional test review:
  - `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (`fa49138794`): the ledger check runs and passes when reached.
  - `autobyteus-web/tests/e2e/projects-feature-probe.mjs` (`361eea070d`): PT-E2E-001..017 pass.
  - `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` (`9eeb58fb9d`): 44/44 pass.
- Repository-resident durable coverage added, updated, or removed in round 1: `Yes`

| Path / Test | Change | Requirement / Boundary, Or Obsolete Assertion And Upstream Evidence | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` TKD-API-001 | Added | REQ-018–020, AC-020/022/024/025/027 through MCP HTTP | Pass (12/12 file) |
| `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` TKD-AGY-001 | Added | AC-019/022/023/027, REQ-019/020 Temp-task rules, through the scripted runtime | Pass (7/7 run, 2 gated skips) |
| `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | Updated | Expected the long ID in the `update_task` result; REQ-018 makes it the key. Now asserts the key and no long ID | Pass 3/3 |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` CPW-R3 | Updated | M-34/35/36/38 used a fake `task_id`; with design REC-005 the Task is resolved first, so they now use a real Task key to reach the run-ID refusals | Pass 11/11 |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` PT-E2E-017 | Added | REQ-009–014/022 journey | Pass |
| same, PT-E2E-006 / 007 / 009, `TASK_FIELDS`, `setDependsOn`, `storedIdOf` | Updated | Edit route now the key URL (REQ-022); tool results carry the key, board rows the stored ID (REQ-018) | Pass |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (PMU-015) | Updated | "Open in Projects" href is the key URL (REQ-022) | Pass |
| `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` (PMU-020/021/024/025) | Updated | Tree summary leads with the key; title / aria-label "Show Task in Projects: <key> <summary>" (REQ-012, AC-016) | Pass |

- Added or updated paths attached for proportional test-code review: `Yes`
- Removed paths: none

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `evidence/scripts/dsk-*.mjs`, `dsk-001-*.mjs`, `dsk-004a-panel-*.mjs` | Desktop automation (temporary, ticket-owned) | Retained as evidence | Need an installed release and a packaged worktree build |
| `evidence/scripts/live-001-claude-haiku.mjs` | Real-model journey | Retained as evidence | Spends Claude usage; Haiku 5.5 only |
| `evidence/desktop/`, `evidence/browser/`, `evidence/live/`, `evidence/logs/`, `evidence/server-e2e/` | Evidence | Retained | 9 MB total |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Isolated instances iso-51714-eb1e (release), iso-52802-e5b4 (worktree) on owned root `tkd-desktop-root.*` | AC-021, AC-006 on release-written data | DSK-001..006 Pass | Both stopped (ports released); owned root removed; `isolated-app list` shows neither |
| Temporary base worktree `c600028072` (node_modules symlinked; no dependency or schema diff) | Rule 9 comparison for timing suites | Equal results base vs ticket | `git worktree remove` + temp dir removed |
| LIVE-001 probe server + root | Real-model check | Pass | Run terminated, server stopped, root removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent inference in E2E/probes/desktop | Scripted AGY CLI (`agy-failure-cli.mjs`) | Deterministic, no provider cost (TESTING.md) | Covered by LIVE-001 for the key-facing tool contract |
| Upgrade source data | Written by the installed released build on an owned root | Real user data must never be used | None material |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R1–R7, TKD-API-001, TKD-AGY-001, R5 (17 files), PT-E2E-001..017, PMU-001..025 except 008, DSK-001..006, LIVE-001 | All in-scope behavior proven |
| Out Of Scope | R10a `team-run-v1-production-upgrade` (FU-API-002), web `RightSideTabs.workspaceTarget` (FU-API-001), PMU-008 (FU-API-003) | Pre-existing; causes below |

### Round 2 failures and their causes (TESTING.md Rule 9)

- **`team-run-v1-production-upgrade` 3/4 (FU-API-002, updated).** Cause confirmed by a temporary, reverted probe of case 1:
  - `20260901_agent_org_flat_team_families_v1` converts the released nested Team root to `memory/agent_orgs/team-v1-supported-root/agent_org_run_execution_tree.json`;
  - the test still expects the Team V2 files under `agent_teams/…`, so it fails with ENOENT, the failed team-resume GraphQL call, and `restoreAgentTeamRun success:false`.
  - Not caused by this ticket; this ticket's ledger row is now asserted by name through `fa49138794`. Owner: the flat-team-families migration.
- **`task-copy-idle-lifetime` (FU-API-005).** Intermittent:
  - Results: ticket 4/7 solo (failures all within ~30 min after a load spike to 141); alternating series base 3/3, ticket 3/3; base 5/5 overall.
  - Failure points: AGY model discovery timing out (`SHORT_PROBE_TIMEOUT_MS` = 3 s for `agy --help`; 0.03 s when idle), a worker's idle wait, and an Org wake refused.
  - Cause: the suite's fixed timers and probe limits under CPU contention, as documented on the base in `45291d105f`. The suite, scripted CLI, `runtime-management`, `agent-execution` and e2e helpers are byte-identical to base, and the failing steps do not run this ticket's code. Owners: idle shutdown and AGY model discovery (already reported per `45291d105f`).
- **PMU-021 one run (FU-API-004).**
  - `[FileExplorerStreaming] WebSocket error` is logged by `FileExplorerStreamingService.ts:129` (`ws.onerror`). The case's `page.reload()` (`project-manager-ux-task-locator-cases.mjs:366`) aborts the file-explorer socket, and the probe fails on any console error.
  - File-explorer code is identical to base; PMU-020/021 pass alone twice.
  - Fix belongs to the file-explorer owner: ignore `onerror` during unload, or have the probe stop counting errors once the reload starts.

### Follow-ups (outside this ticket's Scope Guardrail; for the Task manager)

- FU-API-001 (resolved on the base by `66c61595d2`; passes at HEAD): `autobyteus-web/components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts:152` reads `FileExplorerTabs` vm `fileContent`. Commit `a3f65bfe6e` ("preserve unsaved drafts during peer refresh") removed that member, so the spec is stale. Fix: assert the draft through the current file-explorer state.
- FU-API-002: `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` fails 3/4 on base and ticket:
  - ENOENT on `memory/agent_teams/team-v1-supported-root/team_run_execution_tree.json`;
  - ledger rows: the test hardcodes `beforeRows.length + 4` = 19, but 25 rows exist. Six migrations run, not four; one of them is this ticket's `20261017_project_task_keys_v1`;
  - a run start returns `success:false`.

  Fix: derive the expected rows from the registry and update the team v1 layout expectations.
- FU-API-003 (passes on the merged base in round 2): `project-manager-ux-probe.mjs` PMU-008 waits for `workspace-team-member-<teamRun>-/worker`. Since `938933d8e2`, the probe's "Delivery Team" fixture has only a `manager` member, so the row cannot appear. Fix: open a member that exists.

### Observations (non-blocking)

- OBS-001: The picker's active option before any arrow key is the first listed option, even when it is a greyed loop option. Enter on it adds nothing; arrows skip loop options as specified. This matches the approved prototype (`1ff2edf`). It is the same class as code review CAND-005.
- OBS-002: The tree summary's text content is `<key><summary>` with no space character; the gap is CSS margin. The tooltip and accessible name have the space. Copying the visible text gives "autobyteus-5Write…".
- OBS-003: The copy row's own accessible name still reads ", Task: <summary>" without the key. The spec requires the key only in the summary's name, which is met.
- OBS-004: `TaskKeysAndDependencies.spec.ts` logs a Vue "Failed to resolve component: RouterLink" warning (the mount has no router). Tests pass.

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instances iso-51714-eb1e, iso-52802-e5b4 | Mine | `isolated-app stop` | Stopped; ports released; not listed |
| Owned desktop data root | Mine | Removed after copying evidence | Removed |
| Probe stacks (Nuxt, backends, Chrome, temp roots) | Probe-owned | Probe cleanup | Receipts complete |
| Base worktree, temp HOMEs, `/tmp/tkd-*` | Mine | Removed | Removed |
| `autobyteus-web/electron-dist/`, `autobyteus-server-ts/dist/` | Build outputs (untracked) | Kept | Not staged |

## Preliminary Classification

- N/A (Pass).

## Round 2 Cleanup

- Instances iso-54666-daa7 (release) and iso-54787-85d6 (worktree) are stopped and their ports released.
- The owned root `tkd-desktop-root.J8O5GovcWk` is removed; the desktop snapshots are archived as `.tar.gz` under `evidence/desktop-r2/`.
- The temporary base worktree `66429d6f31` is removed (`git worktree list` clean; this worktree's dependencies are intact).
- The temporary edit of `team-run-v1-production-upgrade.e2e.test.ts` is reverted (`git status` clean).
- The LIVE-001 server is stopped and its root removed. Temporary HOMEs are removed.

## Latest Authoritative Result

- Result: `Pass` (round 2, integrated state `c95e0138e8`)
- Final validation confidence: 95.6%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`, executed (browser, isolated desktop, real model)
- Critical acceptance criteria lacking direct proof: none
- Behavior only the user can check: none. The user's own check of a beta release is a delivery step, not a validation gap.
- Next recipient from `get_handoff_rules`: see handoff
- Notes:
  - All durable test changes are uncommitted in the worktree, like the implementation.
  - At the user's instruction, real-model testing used only the Claude Agent SDK with Claude Haiku 5.5; no ChatGPT/Codex runtime was used.
