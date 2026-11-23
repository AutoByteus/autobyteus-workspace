# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; `/code_reviewer` CRR-001 Pass (Large / High), tree `255a0b0ada`, tested with my test changes (commit given in the handoff)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why: FS-1 is `Next Round`: the round fails (F-1) and the fix changes node code. SE-1's two failures led to an added base comparison (fresh clone of `f2c0d2a902`).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609/evidence/api-e2e/` (paths inside shortened to `<tmp>` and `~`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (on a Pass); on this `Fail`, the failure-origin review sees the added cases

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `255a0b0ada` + my test changes | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1 | server `dist`, phone bundle built from this tree; Nuxt dev desktop frontend; Chrome (Playwright): phone 390×844 touch, desktop 1440×1000 | clean env `env -i PATH HOME=<tmp>/home TMPDIR=<tmp>/tmp/`; probe-owned nodes (alpha, beta, epsilon) and data roots; scripted AGY CLI |
| ENV-2 | `255a0b0ada` + my test changes | same | server unit/integration/E2E suites (vitest, test-owned servers and databases) | clean env as above |
| ENV-3 | base `f2c0d2a902` (fresh `git clone --no-local`, `pnpm install --frozen-lockfile`, server build) | same | the two failing migration E2E files; `check:contract-dist` (script copied in) | clean env as above |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS-1 | AC-A | node source | `rg contextText autobyteus-server-ts/src` | ENV-1 | Pass | — | 0 files | the web: one doc sentence saying the row carries no `contextText` |
| CD-1 | AC-B | contract `dist/` check | branch: `pnpm check:contract-dist`; base clone: `node scripts/check-contract-dist.mjs` | ENV-1, ENV-3 | Pass | `evidence/api-e2e/CD-1/branch.log`, `base-f2c0d2a902.log` | branch `PASS: the tracked dist/ of 3 contract packages matches their source.`, `git status` shows only my test files; base `FAIL: … (2 files):`, `M autobyteus-team-stream-contracts/dist/team-stream-server-message.d.ts` (and `.map`) | — |
| SI-1 | AC-A, AC-E, AC-J; regression | whole server integration | `pnpm -C autobyteus-server-ts build`; `test:integration:prepare`; `test:integration` | ENV-2 | Pass | `evidence/api-e2e/SI-1/summary.log` | `Test Files  91 passed | 21 skipped (112)`; `Tests  518 passed | 71 skipped (589)` | includes `workspace-content-after-restart.integration.test.ts` |
| SE-1 | AC-A, AC-E, AC-J; regression | whole server E2E | `pnpm test:e2e` | ENV-2 | Fail (outside this ticket) | `evidence/api-e2e/SE-1/` | `Test Files  2 failed | 126 passed | 160 skipped (288)`; `Tests  2 failed | 573 passed | 759 skipped (1334)`; RRB-1 and SID-2 `Error: Unknown system error -102 … open '…/node-access/local-control.sock'` | Both reproduce alone on the branch and on the base (`migrations-alone-base-f2c0d2a902.log`). Cause: the tests' byte-identical `snapshot()` (`tests/fixtures/app-data-migrations/skill-improvement-data-fixtures.ts:160-166`) reads every non-directory entry as a file while the built node still runs (`snapshot` at `remove-skill-improvement-data-startup.e2e.test.ts:168`, `stop` at `:186`); since autobyteus-437 (2026-11-08) the running node keeps a Unix socket `node-access/local-control.sock` in its data root, and macOS refuses `open()` on a socket (EOPNOTSUPP, -102). The tests are unchanged since 2026-10-23; this branch touches neither. Follow-up candidate. Every other E2E file passes, including `recent-run-projection-graphql` (`summaryArgs` JSON) |
| FX-1 | (fixture) | AGY fixture keyword `AGENT_TOOL_STEPS` | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts --no-watch` | ENV-2 | Pass | — | `Tests  19 passed (19)` | — |
| U-1 | all (unit) | web suite, server unit, both typechecks, guards | Reused: IMP-07 | — | Pass (reused) | — | — | No code change after `d4af72998f` (`git diff --name-only d4af72998f 255a0b0ada` lists only `tickets/`) |
| CC-1 | AC-C | prepare-server failure path; release run's Windows job | Reused: IMP-03, IMP-09 | — | Pass (reused) | — | — | `prepare-server.mjs` unchanged since |
| MSP-91 | AC-J | a real node restart (epsilon killed mid-download, started again), then the first read of the run's folder; an unknown folder ID | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/new-2 --cases=MSP-89,MSP-90,MSP-91,MSP-101,MSP-102` | ENV-1 | Pass | `evidence/api-e2e/MSP-89-91-restart-read/` | `readsAfterRestart: [[5, 200]]`; `unknownFolderWithKey: {"status":404}`; `climbingWithKey: {"status":400}`; `workspaceNoKey: {"status":401}` | MSP-89, MSP-90 Pass in the same run |
| MSP-101 | AC-H1 | a Team member and a delegated run, each in its own folder, desktop and phone | `--cases=MSP-101 --output-dir=<tmp>/new-3` | ENV-1 | Pass | `evidence/api-e2e/MSP-101-member-and-delegated-links/` | desktop and phone: member `ownShown: true` for `MATE-609-BODY`, `othersShown: []`; delegated `ownShown: true` for `HOST-609-BODY` (its folder is the host's, `ws-609-host`), `othersShown: []` | The probe's main workspace and the lead's folder hold their own copies (MAIN, LEAD), so a wrong folder would show another marker. Two earlier attempts failed on my harness (a member's folder is not readable through `getAgentRunResumeConfig`; the Team row's selector) |
| MSP-102 | AC-D, AC-E | real AGY run: four tool steps, then `HOLD_TURN` stopped with the desktop composer's Stop; desktop card, desktop Activity, phone row and detail; after 50 echo turns (110 page events) a reload and the wheel to the top: earlier-trace cards; the page's GraphQL answer | `--cases=MSP-89,MSP-90,MSP-91,MSP-101,MSP-102 --output-dir=<tmp>/new-2` | ENV-1 | Fail | `evidence/api-e2e/MSP-102-stopped-and-page-cards/` (`result.json`, 6 PNGs) | Pass parts: live card `stopped: true`; desktop Activity `run_command` chip `Stopped`; AC-E: each page card's summary equals the live card's (`→ /release_notes_writer`, `autobyteus-609`, `ls -la docs`, `docs/notes-609.md`); page `summaryArgs` `{"recipient_address":…}`, `{"task_id":…}`, `{"CommandLine":"cd /agy/probe-609 && ls -la docs"}`, `{"AbsolutePath":…}`. **Fail parts:** the phone (opened after the stop) `phoneRow: {"status":"error","word":"Failed"}`, detail `Failed` with Error `Tool execution interrupted.` (`MSP-102-phone-detail-stopped.png`); the stopped call's page card has the red error icon (`MSP-102-desktop-page-cards.png`) and the page answers `"statusKey":"error"` | F-1 below |
| WS-1 | all phone criteria; regression | whole `test:e2e:mobile-shell` | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/ws-1` | ENV-1 | Fail (F-1, and MSP-61 outside) | `evidence/api-e2e/WS-1-whole-phone-probe/` | 100 cases, 98 Pass; `MSP-102 Fail` (F-1, as above); `MSP-61 Fail: REQ-006 another runtime clears the model; Save waits for a model` (FU-006, red on the base); `MSP-98 skipped` (its live gate); unknown browser errors 0 | MSP-44/45/46 (F), MSP-55 (G), MSP-59, MSP-99 (I), MSP-96 (D, live), MSP-100, MSP-101 (H), MSP-89/90/91 (J) Pass |
| FS-1 | build inputs | Fresh-start build | — | — | Next Round | — | — | after the fix (IMP-10 holds for the reviewed tree) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-A | Yes | CS-1, SI-1, SE-1 (all but the two outside failures), U-1 | Proven | — |
| AC-B | Yes | CD-1 (base fails, branch passes), U-1 (IMP-01) | Proven | — |
| AC-C | Yes | CC-1 (IMP-03 failure path on macOS, IMP-09 Windows job) | Proven | — |
| AC-D | Yes | MSP-102 (live parts pass; read-back parts fail), MSP-96 (live), U-1 | Not Proven | — (F-1: after a reread the stopped call reads "Failed" on the phone and shows the error icon on its earlier-trace card) |
| AC-E | Yes | MSP-102 (page cards = live cards; page `summaryArgs`), SE-1 (`recent-run-projection-graphql`), U-1 | Proven | — |
| AC-F | Yes | WS-1 (MSP-44, MSP-45) | Proven | — |
| AC-G | Yes | WS-1 (MSP-55; unknown browser errors 0) | Proven | — |
| AC-H1 | Yes | MSP-100, MSP-101 (Team member, delegated run; desktop and phone), U-1 | Proven | — |
| AC-H2 | Yes | MSP-100 (outside, missing), U-1 ("on node X", no folder) | Proven | — |
| AC-I | Yes | WS-1 (MSP-99 lost update, MSP-59), U-1 | Proven | — |
| AC-J | Yes | SI-1 (integration test), MSP-91 (real restart: first read 200, unknown ID 404, climbing 400) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 85% | every AC but AC-D proven | AC-D read-back (F-1) | F-1 fixed; MSP-102 passing |
| Changed-boundary execution directness | 92% | 95% | built nodes, production phone bundle, a real restart, real stored traces | — | — |
| Cross-boundary integration realism and mock gap | 90% | 93% | scripted AGY with real step shapes through the node's trace store and page projection | real AGY binary not used | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 93% | clean env, own nodes and folders; base clone for comparisons | FS-1 next round | FS-1 |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 88% | restart, lost updates, outside links, missing files | the stopped call after a reread (F-1) | F-1 fixed |
| User-surface, browser, and desktop-shell confidence | 90% | 87% | desktop window and phone screenshots | F-1 on the phone and the earlier-trace card; physical phone | F-1 fixed |
| Durable regression coverage quality and relevance | 92% | 95% | MSP-101, MSP-102, MSP-91, `AGENT_TOOL_STEPS` | — | — |

- Overall post-repository confidence: 90.9%
- Overall final confidence: 90.9% (mean of the seven final scores)
- Calculation method: mean of the final category scores
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `No` (AC-D)
- Any final applicable category below `90%`: `Yes`: requirement proof (85%), failure evidence (88%), user surface (87%)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1; FS-1 not run on the final tree

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (desktop window and production phone bundle), `Lifecycle` (a real node restart), server suites
- Confidence gap or residual risk it addresses: the Downstream Coverage Hints 1–5
- Browser validation needed: yes; D, H, I are user surfaces on desktop and phone
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed: the probe's desktop window (Nuxt dev frontend against built alpha), the desktop conversation, Activity panel, Files panel and run list; packaging reused from IMP-09/IMP-10.
- Cases proving web-equivalent behavior: MSP-100, MSP-101, MSP-102. Shell-specific: none changed.
- Effect on any already-running desktop application: `None` (the user's AutoByteus app on port 29695 and `~/.autobyteus` were not touched)
- Behavior not directly proven: —

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/desktop-stopped-call-trace-cases.mjs` (new; registered in `mobile-shell-probe.mjs`) | Added | MSP-102 | — |
| `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` MSP-101 (`sendOver` passed in by `mobile-shell-probe.mjs`) | Added | MSP-101 | — |
| `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` MSP-91 (first read after the restart 200; unknown folder 404; the stale comment) | Updated | MSP-91 | — |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` `AGENT_TOOL_STEPS` and its routing test | Added | FX-1, MSP-102 | — |

- Added or updated paths attached for proportional test-code review: `Yes` (failure-origin review)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | scripted `agy-failure-cli.mjs` (`linked_skills`, `HOLD_TURN`, `ECHO_INPUT`, `AGENT_TOOL_STEPS`) | no real AGY account in tests | the step shapes the fixture replays (AGY 1.2.14) |
| Phone | headless Chrome 390×844 on the production phone bundle | no device | WebView rendering |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/api609` (HOME, TMPDIR, logs, probe outputs, the base clone `base/`) | Yes | kept until the ticket closes; removed when the Solution Designer asks | kept |
| Probe nodes, Nuxt dev, browsers; test-owned servers of the suites | Yes | stopped by the probe and the suites | stopped |

## Preliminary Classification (On `Fail`)

- **F-1 (AC-D, REQ-D, BEH-D): a stopped call reads "Failed" once the run is read back from the node.** Preliminary: `Design Impact` (an implementation-owned Local Fix is possible; the failure-origin review decides).
  - Live, it is right: the card's stop icon and the desktop Activity's "Stopped" (MSP-102), the phone detail open while the call stops (MSP-96).
  - Read back, it is wrong: the phone opened after the stop (projection hydration), a reloaded conversation, and the earlier-trace card. All three read `error` ("Failed", the red icon) with the error text `Tool execution interrupted.`; the page answers `"statusKey":"error"`.
  - Cause (Read): the trace store persists an interrupted call as a tool result with no result and the error `extractError(payload) ?? extractReason(payload) ?? "Tool execution interrupted."` (`agent-memory/services/runtime-tool-trace-sequencer.ts:134-160`). The replay maps any stored error to `error` and has no `interrupted` (`run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:88-93`; `rg '"interrupted"' src/run-history` finds only the type unions and the page's `statusKey()` allow-list). So the page's new `interrupted` key and the web's hydration support for it (`runProjectionActivityHydration.ts:84-93`) are never fed.
  - The design's D-D change list (presentation builders, the card key, the page's `statusKey`) does not include the stored trace's replay status, and the notes list hydration as a source of `interrupted` (`investigation-notes.md` D). Which fix to use is a design choice: record the interruption distinctly in the stored result, or read it from the stored error (the work journal already does that, `interruptedFromError`, texts `user_interrupt` and `Tool execution interrupted.`). The choice also decides traces stored before the change. The case that proves the fix is MSP-102.
- Outside this ticket (follow-up candidates for the Solution Designer):
  - SE-1: RRB-1 and SID-2 read the running node's Unix socket `node-access/local-control.sock` in their data-root snapshot; red on the base `f2c0d2a902`.
  - MSP-61 is FU-006, already recorded.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: AC-D (F-1)
- Evidence decisions requested: `None`
- Preliminary classification and recommended owner: F-1 `Design Impact` (Solution Designer), or a Local Fix by the implementation engineer if the failure-origin review finds the fix within the reviewed design
- Next recipient from `get_handoff_rules`: `/code_reviewer` (failure-origin review)
- Notes: the Downstream Coverage Hints 1–5 are covered: 1 MSP-101 Pass; 2 MSP-102 (F-1); 3 MSP-91 Pass; 4 WS-1 98/100 with MSP-61 per FU-006; 5 SI-1 Pass, SE-1 Pass apart from two base failures. Next round: MSP-102 and the whole phone probe after the fix, FS-1 on the final tree, and the server suites if node code changes.
