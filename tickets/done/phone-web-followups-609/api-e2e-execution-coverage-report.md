# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 2; `/code_reviewer` CRR-003 (Full Re-Audit Pass) on IR-002: `70f3d8d410` (D-D2), `e78a539dfe` (SR-005); tree `9a4777b0eb`, tested with my test commits up to `3d49a60c82`
- Prior round reviewed: round 1 (API-REV-001, Fail: F-1). Round-1 rows are kept below with an `R1` prefix
- Deviations from the investigation's plan, and why: MSP-103 added (D-D2 changed the Team member reconciliation). MSP-103's first version broke MSP-14 in the whole probe (it reloaded the shared phone); found by running MSP-14 with and without it, fixed, and the whole probe run again (R2-WS-1 below)
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609/evidence/api-e2e/` (round-2 folders start with `R2-`; paths inside shortened to `<tmp>` and `~`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (the added and changed probe cases and the AGY fixture keyword)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 2: `9a4777b0eb` + my test commits (final `3d49a60c82`); round 1: `255a0b0ada` + my then test changes | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1 | server `dist` and phone bundle built from the round's tree; Nuxt dev desktop frontend; Chrome (Playwright): phone 390×844 touch, desktop 1440×1000 | clean env `env -i PATH HOME=<tmp>/home TMPDIR=<tmp>/tmp/`; probe-owned nodes (alpha, beta, epsilon) and data roots; scripted AGY CLI |
| ENV-2 | as ENV-1 | same | server integration and E2E suites (test-owned servers and databases) | clean env as above |
| ENV-3 | base `f2c0d2a902` (fresh clone) | same | round 1 only: two migration E2E files; `check:contract-dist` | clean env as above |
| ENV-4 | `3d49a60c82` | same | fresh `git clone --no-local` in `<tmp>/fs-1`, `pnpm install --frozen-lockfile`, the release job's macOS arm64 build and verify steps | the job's environment variables |

## Cases

Round 2:

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R2-MSP-102 | AC-D, AC-E | as round 1: four AGY tool steps; `HOLD_TURN` stopped with the desktop composer's Stop; desktop card and Activity; phone row and detail (opened after the stop, read back); 50 echo turns; reload, wheel to the top: earlier-trace cards; the page's GraphQL | in R2-WS-1, and alone (`--cases=MSP-102,MSP-103`) | ENV-1 | Pass | `evidence/api-e2e/R2-WS-whole-phone-probe/` (`mobile-shell-probe.json` `MSP-102`, `MSP-102-*.png`) | `phoneRow: {"status":"interrupted","word":"Stopped"}`, `phoneDetail: "Stopped"`; `browseHeld.stopped: true`; page `"statusKey":"interrupted"` for the stopped call; the four page summaries equal the live ones | F-1 resolved |
| MSP-103 | AC-D (D-D2) | a Team run open on the desktop on its coordinator; `/mate` holds a call; the phone opens `/mate` and presses Stop; the desktop opens `/mate` (the member loader reconciles live and read-back state); a second phone from the stored pairing opens `/mate`'s Activity (read back only) | in R2-WS-1, and alone | ENV-1 | Pass | `R2-WS-whole-phone-probe/` (`MSP-103`, `MSP-103-*.png`) | `phoneLive: {"status":"interrupted","word":"Stopped"}`; `deskCard: {"stopped":true,"error":false}`; desktop Activity chip `Stopped`; `conflicts: []`, `deskErrors: []`; `phoneReadBack: {"status":"interrupted","word":"Stopped"}`; node activity status `["interrupted"]` | New this round. Harness history: several attempts failed on my harness (the phone reload reopens `?row=<member>&screen=activity`; a page URL still carrying its pairing link's query). Final version reads back through a second phone |
| R2-MSP-14 | regression | MSP-14 with and without MSP-103 before it | `--cases=MSP-102,MSP-103,MSP-14` and `--cases=MSP-102,MSP-14` | ENV-1 | Pass (after the fix) | `evidence/api-e2e/R2-MSP-14-interaction/` | with MSP-103's first version: `MSP-14 Fail` (alone and in two whole runs: `the task agent is listed before`); without MSP-103: `MSP-14 Pass`; final: `MSP-14 Pass` in R2-WS-1 | Cause: MSP-103 reloaded the probe's shared phone, so the rows earlier cases had unfolded were folded again. Fixed in MSP-103 (`3d49a60c82`); MSP-14 itself is unchanged |
| R2-SI-1 | regression (node code changed; Codex files removed) | whole server integration | `test:integration:prepare`; `test:integration` | ENV-2 | Pass | `evidence/api-e2e/R2-SI-SE/r2-integration-summary.log` | `Test Files  91 passed | 21 skipped (112)`; `Tests  518 passed | 71 skipped (589)` | — |
| R2-SE-1 | regression | whole server E2E | `pnpm test:e2e` | ENV-2 | Fail (outside this ticket) | `R2-SI-SE/r2-e2e-summary.log` | `Test Files  2 failed | 126 passed | 160 skipped (288)`; the two failures RRB-1 and SID-2 | the same two base failures as round 1 (FU-007) |
| R2-WS-1 | all phone criteria; regression | whole `test:e2e:mobile-shell` | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/r2-ws-3` | ENV-1 | Pass for this ticket (MSP-61 outside) | `evidence/api-e2e/R2-WS-whole-phone-probe/` | 101 cases, 100 Pass; `MSP-61 Fail: REQ-006 another runtime clears the model; Save waits for a model` (FU-006, red on the base); unknown browser errors 0; MSP-98 skipped (live gate); MSP-14, 44, 45, 55, 59, 91, 96, 99, 100, 101, 102, 103 Pass | run on `2c1a0a3b93` plus a temporary diagnostic line in MSP-103's cleanup, removed in `3d49a60c82` (a `console.log` only) |
| FS-1 | build inputs | Fresh-start build | fresh clone of `3d49a60c82`; `pnpm install --frozen-lockfile`; `cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; the job's verify steps | ENV-4 | Pass | `evidence/api-e2e/FS-1-fresh-start-build.log` | `commit 3d49a60c82…`; `test-file errors: 86 in 36 files (baseline 86 in 36 files)`; `build exit 0`; `verify prisma exit 0`; `[terminal-runtime] ok: node-pty spawn probe`; `stage left: none`; `script exit 0`; `AutoByteus_personal_macos-arm64-1.5.14-beta.7.dmg` | signing and notarization need the runner (IMP-15 built every target on `e78a539dfe`) |
| U-1 | unit | web suite, server unit, typechecks, guards | Reused: IMP-12 | — | Pass (reused) | — | — | no code change after `e78a539dfe` other than my test files (covered by FS-1's typecheck) |

Round 1 (kept as run; IDs prefixed `R1`):

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 CS-1 | AC-A | node source | `rg contextText autobyteus-server-ts/src` | ENV-1 | Pass | — | 0 files | the web: one doc sentence saying the row carries no `contextText` |
| R1 CD-1 | AC-B | contract `dist/` check | branch: `pnpm check:contract-dist`; base clone: `node scripts/check-contract-dist.mjs` | ENV-1, ENV-3 | Pass | `evidence/api-e2e/CD-1/branch.log`, `base-f2c0d2a902.log` | branch `PASS: the tracked dist/ of 3 contract packages matches their source.`, `git status` shows only my test files; base `FAIL: … (2 files):`, `M autobyteus-team-stream-contracts/dist/team-stream-server-message.d.ts` (and `.map`) | — |
| R1 SI-1 | AC-A, AC-E, AC-J; regression | whole server integration | `pnpm -C autobyteus-server-ts build`; `test:integration:prepare`; `test:integration` | ENV-2 | Pass | `evidence/api-e2e/SI-1/summary.log` | `Test Files  91 passed | 21 skipped (112)`; `Tests  518 passed | 71 skipped (589)` | includes `workspace-content-after-restart.integration.test.ts` |
| R1 SE-1 | AC-A, AC-E, AC-J; regression | whole server E2E | `pnpm test:e2e` | ENV-2 | Fail (outside this ticket) | `evidence/api-e2e/SE-1/` | `Test Files  2 failed | 126 passed | 160 skipped (288)`; `Tests  2 failed | 573 passed | 759 skipped (1334)`; RRB-1 and SID-2 `Error: Unknown system error -102 … open '…/node-access/local-control.sock'` | Both reproduce alone on the branch and on the base (`migrations-alone-base-f2c0d2a902.log`). Cause: the tests' byte-identical `snapshot()` (`tests/fixtures/app-data-migrations/skill-improvement-data-fixtures.ts:160-166`) reads every non-directory entry as a file while the built node still runs (`snapshot` at `remove-skill-improvement-data-startup.e2e.test.ts:168`, `stop` at `:186`); since autobyteus-437 (2026-11-08) the running node keeps a Unix socket `node-access/local-control.sock` in its data root, and macOS refuses `open()` on a socket (EOPNOTSUPP, -102). The tests are unchanged since 2026-10-23; this branch touches neither. Follow-up candidate. Every other E2E file passes, including `recent-run-projection-graphql` (`summaryArgs` JSON) |
| R1 FX-1 | (fixture) | AGY fixture keyword `AGENT_TOOL_STEPS` | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts --no-watch` | ENV-2 | Pass | — | `Tests  19 passed (19)` | — |
| R1 U-1 | all (unit) | web suite, server unit, both typechecks, guards | Reused: IMP-07 | — | Pass (reused) | — | — | No code change after `d4af72998f` (`git diff --name-only d4af72998f 255a0b0ada` lists only `tickets/`) |
| R1 CC-1 | AC-C | prepare-server failure path; release run's Windows job | Reused: IMP-03, IMP-09 | — | Pass (reused) | — | — | `prepare-server.mjs` unchanged since |
| R1 MSP-91 | AC-J | a real node restart (epsilon killed mid-download, started again), then the first read of the run's folder; an unknown folder ID | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/new-2 --cases=MSP-89,MSP-90,MSP-91,MSP-101,MSP-102` | ENV-1 | Pass | `evidence/api-e2e/MSP-89-91-restart-read/` | `readsAfterRestart: [[5, 200]]`; `unknownFolderWithKey: {"status":404}`; `climbingWithKey: {"status":400}`; `workspaceNoKey: {"status":401}` | MSP-89, MSP-90 Pass in the same run |
| R1 MSP-101 | AC-H1 | a Team member and a delegated run, each in its own folder, desktop and phone | `--cases=MSP-101 --output-dir=<tmp>/new-3` | ENV-1 | Pass | `evidence/api-e2e/MSP-101-member-and-delegated-links/` | desktop and phone: member `ownShown: true` for `MATE-609-BODY`, `othersShown: []`; delegated `ownShown: true` for `HOST-609-BODY` (its folder is the host's, `ws-609-host`), `othersShown: []` | The probe's main workspace and the lead's folder hold their own copies (MAIN, LEAD), so a wrong folder would show another marker. Two earlier attempts failed on my harness (a member's folder is not readable through `getAgentRunResumeConfig`; the Team row's selector) |
| R1 MSP-102 | AC-D, AC-E | real AGY run: four tool steps, then `HOLD_TURN` stopped with the desktop composer's Stop; desktop card, desktop Activity, phone row and detail; after 50 echo turns (110 page events) a reload and the wheel to the top: earlier-trace cards; the page's GraphQL answer | `--cases=MSP-89,MSP-90,MSP-91,MSP-101,MSP-102 --output-dir=<tmp>/new-2` | ENV-1 | Fail | `evidence/api-e2e/MSP-102-stopped-and-page-cards/` (`result.json`, 6 PNGs) | Pass parts: live card `stopped: true`; desktop Activity `run_command` chip `Stopped`; AC-E: each page card's summary equals the live card's (`→ /release_notes_writer`, `autobyteus-609`, `ls -la docs`, `docs/notes-609.md`); page `summaryArgs` `{"recipient_address":…}`, `{"task_id":…}`, `{"CommandLine":"cd /agy/probe-609 && ls -la docs"}`, `{"AbsolutePath":…}`. **Fail parts:** the phone (opened after the stop) `phoneRow: {"status":"error","word":"Failed"}`, detail `Failed` with Error `Tool execution interrupted.` (`MSP-102-phone-detail-stopped.png`); the stopped call's page card has the red error icon (`MSP-102-desktop-page-cards.png`) and the page answers `"statusKey":"error"` | F-1 below |
| R1 WS-1 | all phone criteria; regression | whole `test:e2e:mobile-shell` | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/ws-1` | ENV-1 | Fail (F-1, and MSP-61 outside) | `evidence/api-e2e/WS-1-whole-phone-probe/` | 100 cases, 98 Pass; `MSP-102 Fail` (F-1, as above); `MSP-61 Fail: REQ-006 another runtime clears the model; Save waits for a model` (FU-006, red on the base); `MSP-98 skipped` (its live gate); unknown browser errors 0 | MSP-44/45/46 (F), MSP-55 (G), MSP-59, MSP-99 (I), MSP-96 (D, live), MSP-100, MSP-101 (H), MSP-89/90/91 (J) Pass |
| R1 FS-1 | build inputs | Fresh-start build | — | — | Next Round | — | — | after the fix (IMP-10 holds for the reviewed tree) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-A | Yes | R1 CS-1, R2-SI-1, R2-SE-1 (all but the two outside failures), U-1 | Proven | — |
| AC-B | Yes | R1 CD-1 (base fails, branch passes; contract sources unchanged since) | Proven | — |
| AC-C | Yes | R1 CC-1 (IMP-03, IMP-09), IMP-15 (release run on `e78a539dfe`), FS-1 | Proven | — |
| AC-D | Yes | R2-MSP-102, MSP-103, R2-WS-1 (MSP-96 live), U-1 | Proven | — |
| AC-E | Yes | R2-MSP-102, R2-SE-1 (`recent-run-projection-graphql`), U-1 | Proven | — |
| AC-F | Yes | R2-WS-1 (MSP-44, MSP-45) | Proven | — |
| AC-G | Yes | R2-WS-1 (MSP-55; unknown browser errors 0) | Proven | — |
| AC-H1 | Yes | R2-WS-1 (MSP-100, MSP-101), U-1 | Proven | — |
| AC-H2 | Yes | R2-WS-1 (MSP-100), U-1 | Proven | — |
| AC-I | Yes | R2-WS-1 (MSP-99, MSP-59), U-1 | Proven | — |
| AC-J | Yes | R2-SI-1, R2-WS-1 (MSP-91: first read after a real restart 200, unknown ID 404) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | every AC proven on the real stack | — | — |
| Changed-boundary execution directness | 95% | 96% | built nodes, the production phone bundle, a real restart, real stored traces read back | — | — |
| Cross-boundary integration realism and mock gap | 92% | 94% | scripted AGY with real step shapes through the trace store, the replay and the page; native and Codex writers by IMP-11's unit test only | no real native runtime stopped mid-call in a probe | a gated live case |
| Environment, configuration, identity, and fixture fidelity | 94% | 97% | clean env, own nodes and folders, a second paired phone; FS-1 on the final tree | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | 95% | stop live and read back, a member's reconciliation, restart, lost updates, outside links | — | — |
| User-surface, browser, and desktop-shell confidence | 94% | 95% | desktop window and phone screenshots for every surface of D, H, I | physical phone | — |
| Durable regression coverage quality and relevance | 93% | 95% | MSP-101, MSP-102, MSP-103, MSP-91, `AGENT_TOOL_STEPS`; the whole probe green apart from FU-006 | MSP-103's harness complexity (two phones) | — |

- Overall post-repository confidence: 93.9%
- Overall final confidence: 95.6% (mean of the seven final scores)
- Calculation method: mean of the final category scores
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: native and Codex stopped calls are proven at the writer level (IMP-11), not by a live probe; physical phone

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (desktop window and production phone bundle), `Lifecycle` (a real node restart; a run stopped mid-call), server suites, `Project Desktop Validation` (FS-1)
- Confidence gap or residual risk it addresses: the Downstream Coverage Hints 1–5; F-1's read-back paths
- Browser validation needed: yes; D, H, I are user surfaces on desktop and phone
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed: the probe's desktop window (Nuxt dev frontend against built alpha): conversation, Activity panel, Files panel, run list, earlier-trace page; packaging by FS-1 (fresh clone, release job's build and verify steps).
- Cases proving web-equivalent behavior: MSP-100, MSP-101, MSP-102, MSP-103. Shell-specific: none changed.
- Effect on any already-running desktop application: `None` (the user's AutoByteus app on port 29695 and `~/.autobyteus` were not touched)
- Behavior not directly proven: —

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (D-D2 reads what writers already store; no dual path)
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/desktop-stopped-call-trace-cases.mjs` (round 1: MSP-102; round 2: MSP-103) | Added | MSP-102, MSP-103 | — |
| `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` MSP-101 | Added (round 1) | MSP-101 | — |
| `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` MSP-91 | Updated (round 1) | MSP-91 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (registers the new cases; passes `sendOver`, `openPhone`, `paired`) | Updated | MSP-101…103 | — |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` `AGENT_TOOL_STEPS` and its routing test | Added (round 1) | FX-1, MSP-102 | — |

- Commits: `54a305f690` (round 1), `23b813ce7c`, `2c1a0a3b93`, `3d49a60c82` (round 2; `2c1a0a3b93`'s MSP-14 change is reverted by `3d49a60c82`)
- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | scripted `agy-failure-cli.mjs` (`linked_skills`, `HOLD_TURN`, `ECHO_INPUT`, `AGENT_TOOL_STEPS`) | no real AGY account in tests | the step shapes the fixture replays |
| Phone | headless Chrome 390×844 on the production phone bundle | no device | WebView rendering |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/api609` (HOME, TMPDIR, logs, probe outputs, the base clone `base/`, the fresh clone `fs-1/`) | Yes | kept until the ticket closes; removed when the Solution Designer asks | kept |
| Probe nodes, Nuxt dev, browsers; the suites' servers | Yes | stopped by the probe and the suites; one probe run I started wrongly (`&`) was stopped with its child processes (`pkill -f mobile-shell-probe-zIPL1c`), none left | stopped |
| Logs of two debug runs whose temporary diagnostic printed a page URL carrying a used, expired pairing code | Yes | deleted; no remaining log or evidence holds one (`grep "pairing=ey"`: none) | deleted |

## Preliminary Classification (On `Fail`)

Not applicable. Round 1's F-1 is resolved (revision record). Outside this ticket: FU-007 (R2-SE-1's two base failures), FU-006 (MSP-61), FU-010 (the stored "Tool execution interrupted." shown as a red Error section; outside AC-D).

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: `None` (physical phone untested, as the requirements do not ask for it)
- Evidence decisions requested: `None`
- Preliminary classification and recommended owner (on `Fail`): —
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Pass, Large / High: proportional test-code review)
- Notes: for delivery's docs sync the code reviewer noted three server docs that still name the removed Codex files.
