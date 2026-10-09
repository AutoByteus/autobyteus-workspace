# API/E2E Execution Coverage Report — token-meter-accuracy

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-spec.md`
- Supplemental Task Artifacts: `probes/` (P1–P9), `solution-handoff.md`, user screenshots 16/17
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: code reviewer CRR-002 Pass (HEAD `f78921e5f`)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1 (final branch HEAD `e7f9da408`; product source unchanged from `f78921e5f`, only tests and ticket artifacts added)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with these material deviations, all within scope:
  - **Base failures fixed (TESTING Rule 9).** Three base test failures blocked planned cases and were fixed as labelled baseline-fix commits: analytics isolation, the Org continuation fixture, and the live Claude harness.
  - **Live runtime suite reworked.** The opt-in runtime token-usage suite could no longer create definitions, so it now uses the real Studio server.
  - **Codex compaction suite replaced for AC-006.** The Codex interrupted-compaction suite is stale on base (`prepareNewAgentRun is not a function`). AC-006 was therefore proven by a new durable suite on the Studio server; the stale one was not used.
  - **Extra desktop round.** A second isolated desktop build was added to observe the Org member and delegated-copy meters mid-turn in the UI. Round 1 had observed them through the wire and fetched summaries only.
- Existing coverage decisions revised during execution, with evidence: `token-usage-analytics-graphql.e2e.test.ts` moved from `Still Valid` to a baseline fix. It is order-dependent: with `--sequence.shuffle.files --sequence.seed=3` it fails on base and passes on the branch.
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 17 (R-07 final gate, cleanup)
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| E2E-001 | Pass | 2 | `api-e2e-evidence/logs/R03-*.log`, `R07-final-e2e-gate.log` | — |
| E2E-002 | Pass | 5 | commit `0a5290aa8`; mutation check in ledger | — |
| E2E-003 | Pass | 3 | `R07-final-e2e-gate.log` | — |
| R-03..R-07 | Pass (except known base TeamRun V1 cases) | 16 | `api-e2e-evidence/logs/` | TeamRun V1 drift reported separately |
| LIVE-001 | Pass | 9, 10 | `logs/LIVE-001-*.log` | — |
| LIVE-002 | Pass | 13 | `logs/LIVE-002-runtime-token-usage-graphql.log` | — |
| LIVE-003 | Pass | 14 | `logs/LIVE-003-claude-auto-compaction-usage.log` | — |
| LIVE-004 | Pass | 15 | `logs/LIVE-004-*.log` | — |
| LIVE-005 | Pass | 15 | `live/LIVE-005-*.json`, `desktop/LIVE-005-agy-meter.png` | — |
| DESK-001 | Pass | 11 | `desktop/DESK-001-*` | — |
| DESK-002 | Pass | 12, 16 | `desktop/DESK-002-*`, `desktop/DESK-002b-*` | — |
| DESK-003 | Pass | 12 | `desktop/DESK-003-*` | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. Runtime code has no pre-fix branch. The released reconciler state is read through the design-approved tolerant decoder: a real released Claude record continued and rebaselined (DESK-003).
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`. The two stale Claude cases that asserted removed behavior (main-loop split; turn-sum reading with read-time percent derivation) were replaced.
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-001 | D-4, AC-009 | Payload contract → fold → SQL → GraphQL | Server E2E (deterministic) | Durable | Pass | 15 cases in 5 files |
| E2E-002 | AC-001, AC-002, AC-004, AC-008, D-3, D-10, DEC-005 | Real `ClaudeCallUsageTracker` + result builder → accumulator (catalog pricing) → SQL → GraphQL | Server E2E (P2/P3 probe frames) | Durable | Pass | `claude-sdk-selected-model-graphql.e2e.test.ts` |
| E2E-003 | DEC-005 (a), CR-F-001 | Real `TokenUsageRunRecordsV1AppDataMigration` → GraphQL | Server E2E | Durable | Pass | `token-usage-ledger-provider-semantics.e2e.test.ts` |
| LIVE-001 | AC-003, AC-004, D-10, R-001 | Real Claude CLI (PATH 2.1.295 and SDK-bundled) → session → event pipeline | Live E2E | Durable (opt-in) | Pass (16/16 file) | `logs/LIVE-001*.log` |
| LIVE-002 | AC-001, AC-003, AC-006/BEH-004 | Real Codex/Claude → Studio server → WS + GraphQL | Live E2E | Durable (opt-in) | Pass | `logs/LIVE-002-*.log` |
| LIVE-003 | AC-004, SCN-003, REQ-009 | Real Claude auto-compaction (failed + completed) → pipeline | Live E2E | Durable (opt-in) | Pass | `logs/LIVE-003-*.log` |
| LIVE-004 | AC-006, REQ-006, D-6, D-9 | Real Codex compaction → Studio → WS + GraphQL | Live E2E | Durable (opt-in, new) | Pass | `logs/LIVE-004-*.log` |
| LIVE-005 | AC-005, REQ-005, DEC-003 | Real AGY 1.3.2 → packaged server → WS + GraphQL + UI | Live + Desktop | Live | Pass | `live/LIVE-005-*.json`, `desktop/LIVE-005-agy-meter.png` |
| DESK-001 | AC-001, AC-003 (standalone), AC-008 | Real Claude Opus 5.5 → packaged app → Token Meter | Isolated desktop (worktree build) | Desktop | Pass | `desktop/DESK-001-*` |
| DESK-002 | AC-003, REQ-008 (team member, delegated copy, Org member) | Team stream / collaboration presentation stream → store → panel | Isolated desktop + strict contract parse | Desktop + Live | Pass | `desktop/DESK-002*` |
| DESK-003 | DEC-005, BEH-008, AC-009, SCN-API-03 | Installed 1.4.99-beta.8 profile → worktree build startup (Prisma) → GraphQL → continued runs | Isolated desktop on an owned data root | Desktop (real upgrade) | Pass | `desktop/DESK-003-*` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R-07 | `vitest run tests/e2e/token-usage tests/e2e/app-data-migrations` + the 4 changed runtime files (gated cases skip) | worktree, HEAD `e7f9da408` | Final deterministic gate | Pass except the 3 known base TeamRun V1 cases (41 pass / 28 skipped / 3 fail) | `logs/R07-final-e2e-gate.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | +20 | AC-001/003/004/005/006/008 proven live on real runtimes and in the packaged UI; DEC-005 by a real released-app upgrade; AC-009 by regression suites | AC-002's over-window mark not rendered from a live genuine overflow (component spec + P3/P7 fixtures); AC-007 Grok and native threshold unit-only (Should / unchanged runtime); AC-010 is user verification |
| Changed-boundary execution directness | 75% | 95% | +20 | Real SDK/CLI frames through the real server, transports, store and panel | Grok/native not run live |
| Cross-boundary integration realism and mock gap | 70% | 95% | +25 | No mocks on live paths; strict team and presentation schemas parsed every live token frame | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | +15 | Installed release 1.4.99-beta.8 produced the released-shape profile; real logins; isolated instances | Ledger-era upgrade proven through the real migration code, not a ledger-era app install |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | +10 | Crash reopen, server restore, failed and completed Claude compaction, Codex compaction, relaunch no-op, continued migrated run | Claude crash mid-turn (accepted C-04 bounded undercount) not exercised |
| User-surface, browser, and desktop-shell confidence | 60% | 95% | +35 | Packaged-app meter observed mid-turn for a standalone run, a team member, an Org member and an Org-hosted delegated copy; threshold label; AGY "context limit unavailable"; real embedded-server migration | zh-CN strings and the over-window mark not rendered live |
| Durable regression coverage quality and relevance | 90% | 95% | +5 | Stale E2E replaced; 3 live suites updated/added; mutation check (remainder double count is caught) | Live suites are opt-in (quota) |

- Overall post-repository confidence: 76%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories, with no category below 90% and every critical AC directly proven.
- Confidence change produced by broader validation: +19 points; removed the live-runtime, transport and UI gaps.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: over-window mark live rendering; Grok/native live (unit-covered, Should/unchanged).

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — Live API (LIVE-001..005) and Project Desktop Validation (DESK-001..003).
- Material deviation from the planned mode or rationale: a second desktop round (DESK-002b) to see the Org member and the delegated copy mid-turn in the UI.
- Confidence gap or residual risk actually addressed: real frame mix with partial messages; D-10 ordering; remainder vs compaction; Codex reading-only save; AGY cache semantics; live freshness by `revision` across all run kinds; released-profile migration.
- Startup order, commands, and readiness results:
  - Desktop instances: `pnpm --silent isolated-app start --build` from a detached worktree at the branch HEAD. These were `iso-50464-4235` and, after a rebuild, `iso-54042-ac01`.
  - Released profile: `pnpm --silent isolated-app start --app /Applications/AutoByteus.app --data-root /tmp/tma-api-e2e/released-profile` (`iso-49868-6032`).
  - Upgrade: `start --from-worktree --data-root <same>` (`iso-53133-0ae8`, then `restart`).
  - Readiness: every instance answered `start` with `ok: true`.
- Environment choices that materially affected the run:
  - Claude models: Opus 5.5 (standalone), Haiku 5.5 (team/Org) and Sonnet 5.5 (LIVE-002).
  - Codex: `gpt-5.6-luna`.
  - AGY: `gemini-3.8-flash-low`.
  - Codex compaction used a temporary `CODEX_HOME` (only `model_auto_compact_token_limit = 20000` plus a symlinked `auth.json`).
- Seed data, fixtures, identities: GraphQL-created definitions and runs on the owned data roots; drivers in `api-e2e-evidence/scripts/`.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Released 1.4.99-beta.8, Claude 4-call turn | (baseline) | Latest prompt 83,608 = turn sum; mid-turn 0 calls for 6.5 s | `DESK-003-released-claude-run.json` | Reproduces Fix A/B defects |
| Worktree build on that profile | Claude readings cleared; totals/count/revision unchanged; Codex reading kept | Claude prompt/window/percent NULL, 85,092 tokens / 1 call / rev 1; Codex 11,251 / 258,400 kept; migration `20261009120000…` applied | `DESK-003-graphql-after-upgrade.json`, `DESK-003-db-after-upgrade-and-continue.txt` | Pass |
| Continue the migrated Claude run | Live SDK reading; totals continue; restart rebaselines | 4 live calls with readings 21,167 → 21,473; result `claude_sdk_series_restart_rebaselined`, admits 0; 85,092 + 85,507 = 170,599 | `DESK-003-continued-claude-run.json` | Pass |
| Relaunch the upgraded app | No re-migration | Migration count and rows identical | `DESK-003-before/after-relaunch.txt` | Pass |
| Continue the released Codex run | Reading = Codex `last.totalTokens` | 11,213 = 11,192 + 21 | `DESK-003-continued-codex-run.json` | Pass |
| Standalone Opus 5.5 multi-call turn, UI on Token tab | Meter updates per call mid-turn; reading = SDK; threshold label | UI "Running": 3 → 4 calls, 19,882 → 19,984; Idle 5 calls 20,086 / 1,000,000, "Auto-compacts at 967.000"; result after the last call | `DESK-001-*.json`, `DESK-001-standalone-opus-meter.png` | Pass |
| Team member multi-call turn | Live per call; strict team contract | UI "Running" 3 calls, 21,547, model and runtime; 5/5 frames pass `parseTeamStreamServerMessage`; member summary 8 → 11 mid-turn; team revision = Σ members | `DESK-002-team-member-*.json` | Pass |
| Team-hosted delegated copy | Usage within one call of starting | First call at 4.8 s; fetched summary 0 → 1 → 2 → 3 before idle; strict contract OK | `DESK-002-delegated-copy-stream.json` | Pass |
| Org member multi-call turn | Live per call; strict presentation contract | UI "Running" 1 → 2 → 3 → 4 calls, readings per call, model/runtime/threshold; 5/5 frames pass `agentPresentationMessageSchema`; result advances revision 4 → 5 with count unchanged | `DESK-002-org-*`, `DESK-002b-org-member-ui-midturn.json` | Pass |
| Org-hosted delegated copy, UI followed from creation | 0/unknown before the first call, then live | UI 0 calls / unknown → after the first call 1 call, claude-haiku-5-5, claude_agent_sdk, 21,408 → 4 calls while Running → Idle 5 | `DESK-002b-org-delegated-copy-ui-midturn.json`, `.png` | Pass |
| AGY multi-step and cached turns | Per-step live; gross = input + cache read; latest prompt; no window | Steps 8,938 … 9,645 live; cached step 4,426 + 77,693 = 82,119; run uncached 128,325 + cache 155,377 = gross 283,702; UI "82.336 · context limit unavailable", cache hit 54.8% | `live/LIVE-005-*.json`, `desktop/LIVE-005-agy-meter.png` | Pass |

## Desktop Application Validation

- Validation approach executed: isolated desktop instances only (TESTING Rule 1/2), worktree build and installed release, driven through CDP (browser-automation skill) and public GraphQL/WS.
- Web-equivalent behavior, surface used, and evidence: Token Meter panel, store freshness, live transports in the packaged renderer (DOM text sampling plus screenshots).
- Shell-specific or lifecycle behavior and evidence: the embedded server applied the Prisma migration at startup on a released data root and relaunched as a no-op.
- Effect on any already-running desktop application: `None`. Separate ports and data roots; the user's running app and `~/.autobyteus` were not touched. Other people's isolated instances were left alone.
- Behavior not directly proven and confidence consequence: zh-CN rendering; the over-window mark from a live genuine overflow (component-tested).

## Platform / Runtime Targets

- macOS (Darwin 25.5.0), arm64, Node 22.23.1.
- Claude Code CLI 2.1.295 (PATH) plus the SDK-bundled CLI (`@anthropic-ai/claude-agent-sdk` 0.3.280); Codex CLI 0.161.0; Antigravity CLI 1.3.2.
- Packaged Electron app built from the worktree (1.4.99-beta.7 version string) and the installed 1.4.99-beta.8 release.
- Locale: app number formatting uses the `.` thousands separator (de-style).

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Migration Required` for pre-fix Claude readings; `Directly Usable` for the new column and the reconciler state.
- Representative existing data exercised: a released 1.4.99-beta.8 profile with a real Claude SDK multi-call run (turn-sum reading 83,608) and a Codex run; a ledger-era Claude row (deterministic, through the real consolidation).
- Migration result and evidence: Claude readings NULL, totals/costs/count/revision unchanged, Codex reading unchanged (DESK-003, E2E-003, E2E-002 case 3).
- Migration completion/recovery evidence: `_prisma_migrations` contains `20261009120000_token_meter_context_readings` finished; relaunch leaves rows and the migration count identical.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: no real ledger-era app install (the consolidation code path is proven deterministically).

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary, Or Obsolete Assertion And Upstream Evidence | Execution Result, Or Replacement Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/astra-fable-token-usage-accounting-graphql.e2e.test.ts` | Updated | Direct model-call fixture states `reports_model_call` (D-4) | Pass |
| `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` | Updated | Same | Pass |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Updated | Same | Pass |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | Updated | Same | Pass |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Updated | Same; plus a ledger-era Claude row through the real consolidation: null readings, exact totals (DEC-005, CR-F-001); non-Claude ledger reading kept | Pass |
| `autobyteus-server-ts/tests/e2e/token-usage/claude-sdk-selected-model-graphql.e2e.test.ts` | Updated (2 cases replaced by 3) | Removed assertions: the exact cache split from the removed `claude_sdk_main_loop_usage`, the result counted as a call, the result's turn-sum reading, and the Claude read-time percent derivation (removal plan, D-3, D-4, BEH-001). New cases: P2 per-call + zero remainder + threshold; P3 summariser remainder + failed compaction under 100 %; migrated record refreshed by its next call | Pass; mutation (no live subtraction) caught |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | Updated (baseline fix) | Order-dependent on other files' facets; fails on base with seed 3 | Pass in all orders tried |
| `autobyteus-server-ts/tests/helpers/org-migration-continuation-fixtures.ts` | Updated (baseline fix) | Retired factory shape (`factory.beginPreparation is not a function`) | Org continuation E2E passes (base copy and branch) |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` | Updated (baseline fix) | Missing `ownSession` callback and `deactivateForRun` | Whole live Claude lifecycle file 16/16 |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Updated | Real Studio server; Claude `claude_sdk_call` + SDK reading; Codex `last.totalTokens`; new Claude multi-call live case (AC-001, AC-003) | Pass (Codex, Claude, multi-call) |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts` | Updated | Auto-compaction case asserts per-call usage, the summariser remainder, totals = SDK `modelUsage`, and the reading drop (AC-004, SCN-003) | Pass |
| `autobyteus-server-ts/tests/e2e/runtime/codex-compaction-token-reading.e2e.test.ts` | Added | Codex compaction reading-only save through the Studio server (AC-006, D-9) | Pass |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: no file was removed. The replaced cases are visible in commit `0a5290aa8`.
- Commits: `7f27bbbf5`, `0a5290aa8`, `97e46624c`, `ccb52b171`, `9b4ad5d4d`, `81703b021`, `e7f9da408`.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/logs/` | Command logs (initial branch/base, R03–R07, LIVE-001..004) | Retained | — |
| `api-e2e-evidence/desktop/` | DESK JSON receipts and screenshots | Retained | Screenshots are supporting evidence only |
| `api-e2e-evidence/live/` | LIVE-005 AGY receipts | Retained | — |
| `api-e2e-evidence/scripts/` | Drivers used against isolated instances (`drive-run`, `drive-team`, `drive-org`, `drive-org2`, `send-org`, UI samplers, `check-org-frames`) | Retained as evidence | Not part of the product or test suite |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Base worktree `…/token-meter-accuracy-api-e2e-base` (detached `927796780`) | Baseline comparison (Rule 9) | 5 base failures identified | Removed |
| Desktop worktree `…/token-meter-accuracy-api-e2e-desktop` (×2, detached at the branch HEAD) | Packaged build without disturbing live tests in the main worktree | Instances `iso-50464-4235`, `iso-54042-ac01` | Removed; instances stopped, auto data roots deleted |
| `tests/e2e/runtime/tmp-tma-codex-compaction-probe.e2e.test.ts` | First AC-006 probe | Promoted into the durable `codex-compaction-token-reading` suite | Temporary name never committed |
| Temporary base-worktree debug edits (ACK and tree logging) | Rule 9 diagnosis | Causes identified | Reverted (`git checkout`) |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Claude SDK frames in E2E-002 | Captured P2/P3 probe frames | Deterministic SQL/GraphQL regression | Live runs (LIVE-001..003, DESK) cover the real frames |
| Codex compaction limit | Temporary `CODEX_HOME` config (limit 20,000) | Making compaction happen in a few turns | Compaction behavior itself is real |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | E2E-001, E2E-002, E2E-003, R-03..R-07, LIVE-001..005, DESK-001, DESK-002, DESK-003 | All approved behavior proven |
| Not Tested | Grok live (AC-007, Should); native threshold live; zh-CN; over-window mark from a live overflow | Unit/component coverage; no native provider credentials in the isolated instance |
| Out Of Scope | TeamRun V1 upgrade E2E (3 cases) | Base test drift from the Org-family migration; reported separately |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instances `iso-49868-6032`, `iso-53133-0ae8`, `iso-50464-4235`, `iso-54042-ac01` | Mine | `isolated-app stop` | Stopped, ports released |
| `/tmp/tma-api-e2e/released-profile` (owned data root) | Mine | `rm -rf` | Removed |
| Base and desktop worktrees | Mine | `git worktree remove --force` | Removed |
| Temporary agent workspaces `tma-*-ws-*` in the OS temp dir | Mine | `rm -rf` | Removed |
| Live E2E runs and records | Test-owned | Each suite terminates its runs and deletes its records/temp dirs | Done |
| Other isolated instances (`iso-63369-6c20`, `iso-50840-584c`, `iso-58041-07e7`, `iso-52024-c0a7`) | Not mine | Untouched | — |

## Observations For Other Owners (Non-Blocking, Outside This Change)

1. **TeamRun V1 upgrade E2E drift (Rule 9, reported).**
   - Affected: `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`, 3 cases, failing on base `927796780` and on the branch.
   - Cause: the later `agent-org-flat-team-families-v1` startup migration converts the migrated package to `memory/agent_orgs/<id>/agent_org_run_execution_tree.json`. The test still asserts the TeamRun V2 intermediate in `agent_teams/`, +4 ledger rows (8 now) and `restoreAgentTeamRun`. This needs a rewrite by the Org-migration owner.
   - Also stale on base: `tests/e2e/runtime/codex-interrupted-compaction.e2e.test.ts` (`manager.prepareNewAgentRun is not a function`; old factory shape).
2. **Pricing catalog (REQ-011, caching/pricing owners).** `claude-haiku-5-5`, `claude-sonnet-5-5` and `gemini-3.8-flash-low` resolve `price_missing` (`model_not_found`).
3. **Chat view, unrelated to tokens.** A user message renders twice in some views: turn 1 of a standalone run sent before the UI opened it, and the Org `delegate_task` instruction. Worth triage.
4. **SDK reading after compaction.** The SDK's own reading (12,191) is not equal to that call's prompt (11,109 total). The meter correctly shows the SDK figure (REQ-001). The prompt-equality check in the live runtime suite applies to non-compacting turns only.
5. **Docs sync (delivery).** TESTING.md does not yet list `RUN_RUNTIME_TOKEN_USAGE_E2E` or the new `codex-compaction-token-reading.e2e.test.ts`; both carry run commands in their headers.
6. **Informational flag.** Claude per-call observations carry `model_identifier_differs_from_run_context` (API model id vs run alias such as `opus`), consistent with accepted RR-4.

## Preliminary Classification

N/A — Pass.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (Live API + Project Desktop Validation)
- Critical acceptance criteria lacking direct proof: none (AC-010 is explicit user verification owned by delivery)
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: per the returned rules (proportional test-code review of the changed durable tests)
- Notes: task size `Large`, architectural risk `High` preserved. Product source is unchanged by API/E2E; all commits are test-only.
